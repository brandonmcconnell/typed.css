import stylus from 'stylus';
import { configFromArgs, fromRawCSS, typed, unescapeCSS, type ArgValue, type Declaration, type TypedNode } from '@typed-css/core';

interface StylusNode {
	readonly nodeName: string;
	toString(): string;
}

interface StylusBlock extends StylusNode {
	push(node: StylusNode): void;
}

interface StylusGroup extends StylusNode {
	block: StylusBlock;
	push(selector: StylusNode): void;
}

interface StylusSelector extends StylusNode {
	val: string;
}

interface StylusExpression extends StylusNode {
	push(node: StylusNode): void;
}

interface StylusKeyframes extends StylusNode {
	block: StylusBlock;
	val: string;
	/** Marks keyframes as already expanded, so Stylus does not add vendor-prefixed copies. */
	fabricated: boolean;
}

/** The constructors from `stylus.nodes` this plugin uses. */
interface StylusNodes {
	Block: new (parent: StylusNode, node: StylusNode) => StylusBlock;
	Group: new () => StylusGroup;
	Selector: new (segments: StylusNode[]) => StylusSelector;
	Literal: new (value: string) => StylusNode;
	Ident: new (name: string) => StylusNode;
	Expression: new () => StylusExpression;
	Property: new (segments: StylusNode[], expr: StylusExpression) => StylusNode;
	Keyframes: new (segments: StylusNode[], prefix: string) => StylusKeyframes;
}

interface StylusEvaluator {
	readonly currentBlock: StylusNode;
}

type StylusFunction = ((this: StylusEvaluator, ...args: unknown[]) => StylusNode) & { raw?: boolean };

/** The part of the Stylus renderer (`stylus(source)`) a plugin needs. */
export interface StylusRenderer {
	define(name: string, fn: StylusFunction, raw?: boolean): unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const NODE_CONSTRUCTORS = ['Block', 'Group', 'Selector', 'Literal', 'Ident', 'Expression', 'Property', 'Keyframes'] as const;

const isStylusNodes = (value: unknown): value is StylusNodes => isRecord(value) && NODE_CONSTRUCTORS.every(name => typeof value[name] === 'function');

function isStylusNode(value: unknown): value is StylusNode & Record<string, unknown> {
	return isRecord(value) && typeof value['nodeName'] === 'string';
}

const nodeList = (value: unknown): unknown[] => (isRecord(value) && Array.isArray(value['nodes']) ? value['nodes'] : []);

/** Converts an evaluated Stylus node into the shared argument model. */
function toArgValue(node: unknown): ArgValue {
	if (!isStylusNode(node)) throw new TypeError('typed() received an argument Stylus could not evaluate.');
	switch (node.nodeName) {
		case 'expression': {
			const items = nodeList(node);
			const [only] = items;
			if (items.length === 1) return toArgValue(only);
			return { kind: 'list', separator: node['isList'] === true ? ', ' : ' ', items: items.map(toArgValue) };
		}
		case 'string':
			return { kind: 'string', value: unescapeCSS(String(node['val'])) };
		case 'unit':
			return { kind: 'number', value: Number(node['val']), unit: typeof node['type'] === 'string' ? node['type'] : '' };
		case 'boolean':
			return { kind: 'keyword', value: node['val'] === true ? 'true' : 'false' };
		case 'null':
			return { kind: 'keyword', value: 'null' };
		case 'ident':
			return { kind: 'keyword', value: String(node['name']) };
		case 'literal':
			return fromRawCSS(String(node['val']));
		case 'object': {
			const values = node['vals'];
			const entries = isRecord(values) ? Object.entries(values).map(([key, value]): readonly [string, ArgValue] => [key, toArgValue(value)]) : [];
			return { kind: 'map', entries };
		}
		default:
			return { kind: 'keyword', value: node.toString() };
	}
}

function buildBlock(nodes: StylusNodes, parent: StylusNode, typedNodes: readonly TypedNode[]): StylusBlock {
	const output = new nodes.Block(parent, parent);
	const group = (selectors: readonly string[], declarations: readonly Declaration[], owner: StylusNode): StylusGroup => {
		const result = new nodes.Group();
		for (const text of selectors) {
			const selector = new nodes.Selector([new nodes.Literal(text)]);
			selector.val = text;
			result.push(selector);
		}
		result.block = new nodes.Block(owner, result);
		for (const [property, value] of declarations) {
			const expr = new nodes.Expression();
			expr.push(new nodes.Literal(value));
			result.block.push(new nodes.Property([new nodes.Ident(property)], expr));
		}
		return result;
	};
	for (const node of typedNodes) {
		if (node.type === 'rule') {
			output.push(group([`&${node.pseudo}`], node.declarations, parent));
			continue;
		}
		const keyframes = new nodes.Keyframes([new nodes.Literal(node.name)], 'official');
		keyframes.val = node.name;
		keyframes.fabricated = true;
		keyframes.block = new nodes.Block(parent, keyframes);
		for (const block of node.blocks) keyframes.block.push(group([block.selectors.join(', ')], block.declarations, keyframes.block));
		output.push(keyframes);
	}
	return output;
}

/**
 * Stylus plugin that adds a `typed()` mixin with the same positional arguments
 * as the SCSS mixin:
 *
 *     .hero
 *       typed("Hello", "World", 2, { iterations: 2, end-on: "Done!" })
 */
export default function typedStylus(): (renderer: StylusRenderer) => void {
	const nodes: unknown = stylus.nodes;
	if (!isStylusNodes(nodes)) throw new Error('@typed-css/stylus could not find the Stylus node constructors.');
	const typedFunction: StylusFunction = function (...args) {
		const result = typed(configFromArgs(args.map(toArgValue)));
		for (const warning of result.warnings) console.warn(`[typed.css] ${warning}`);
		return buildBlock(nodes, this.currentBlock, result.nodes);
	};
	return renderer => {
		renderer.define('typed', typedFunction, true);
	};
}
