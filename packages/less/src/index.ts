import { configFromArgs, fromRawCSS, typed, unescapeCSS, type ArgValue, type Declaration, type TypedNode } from '@typed-css/core';

/** Opaque evaluation context Less passes to plugin functions. */
type LessContext = object;

interface LessNode {
	readonly type: string;
	toCSS(context: LessContext): string;
}

interface LessEvaluable extends LessNode {
	eval(context: LessContext): LessNode;
}

/** The constructors from `less.tree` this plugin uses. */
interface LessTree {
	Anonymous: new (value: string) => LessNode;
	Declaration: new (name: string, value: LessNode) => LessNode;
	Combinator: new (value: string) => LessNode;
	Element: new (combinator: LessNode, value: string) => LessNode;
	Selector: new (elements: LessNode[]) => LessNode;
	Ruleset: new (selectors: LessNode[] | null, rules: LessNode[]) => LessEvaluable;
	AtRule: new (
		name: string,
		value: LessNode,
		rules: LessNode[],
		index: undefined,
		currentFileInfo: undefined,
		debugInfo: null,
		isRooted: boolean,
	) => LessNode;
}

interface LessFunctionThis {
	readonly context: LessContext;
}

interface LessFunctionRegistry {
	add(name: string, fn: (this: LessFunctionThis, ...args: unknown[]) => LessNode): void;
}

/**
 * Less calls `install(less, pluginManager, functions)`. The parameters are
 * `unknown` so the plugin also satisfies `@types/less`, which omits `functions`.
 */
export interface TypedLessPlugin {
	readonly minVersion: [number, number, number];
	install(less: unknown, pluginManager: unknown, functions?: unknown): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const TREE_CONSTRUCTORS = ['Anonymous', 'Declaration', 'Combinator', 'Element', 'Selector', 'Ruleset', 'AtRule'] as const;

const isLessTree = (value: unknown): value is LessTree =>
	isRecord(value) && TREE_CONSTRUCTORS.every(name => typeof value[name] === 'function');

const isFunctionRegistry = (value: unknown): value is LessFunctionRegistry => isRecord(value) && typeof value['add'] === 'function';

function isLessNode(value: unknown): value is LessNode & Record<string, unknown> {
	return isRecord(value) && typeof value['type'] === 'string' && typeof value['toCSS'] === 'function';
}

const nodeList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function callEval(node: Record<string, unknown>, context: LessContext): unknown {
	const evaluate = node['callEval'];
	return typeof evaluate === 'function' ? evaluate.call(node, context) : undefined;
}

function declarationName(node: Record<string, unknown>, context: LessContext): string {
	const name = node['name'];
	if (typeof name === 'string') return name;
	return nodeList(name)
		.map(part => (isLessNode(part) ? part.toCSS(context) : ''))
		.join('');
}

function rulesetToMap(ruleset: unknown, context: LessContext): ArgValue {
	const entries: (readonly [string, ArgValue])[] = [];
	for (const rule of isRecord(ruleset) ? nodeList(ruleset['rules']) : []) {
		if (!isLessNode(rule)) continue;
		if (rule.type === 'Declaration') {
			entries.push([declarationName(rule, context), toArgValue(rule['value'], context)]);
		} else if (rule.type === 'Ruleset') {
			const [selector] = nodeList(rule['selectors']);
			if (isLessNode(selector)) entries.push([selector.toCSS(context).trim(), rulesetToMap(rule, context)]);
		}
	}
	return { kind: 'map', entries };
}

/** Converts an evaluated Less node into the shared argument model. */
function toArgValue(node: unknown, context: LessContext): ArgValue {
	if (!isLessNode(node)) throw new TypeError('typed() received an argument Less could not evaluate.');
	switch (node.type) {
		case 'Quoted': {
			const value = typeof node['value'] === 'string' ? node['value'] : '';
			return node['escaped'] === true ? { kind: 'keyword', value } : { kind: 'string', value: unescapeCSS(value) };
		}
		case 'Dimension': {
			const unit = node['unit'];
			return { kind: 'number', value: Number(node['value']), unit: isLessNode(unit) ? unit.toCSS(context) : '' };
		}
		case 'Expression':
		case 'Value': {
			const items = nodeList(node['value']);
			const [only] = items;
			if (items.length === 1) return toArgValue(only, context);
			return { kind: 'list', separator: node.type === 'Value' ? ', ' : ' ', items: items.map(item => toArgValue(item, context)) };
		}
		case 'DetachedRuleset':
			return rulesetToMap(callEval(node, context), context);
		default:
			// Declarations inside detached rulesets often arrive as unparsed Anonymous text.
			return fromRawCSS(node.toCSS(context));
	}
}

function buildNodes(tree: LessTree, nodes: readonly TypedNode[]): LessNode[] {
	const blank = (): LessNode => new tree.Combinator('');
	const declarations = (list: readonly Declaration[]): LessNode[] =>
		list.map(([property, value]) => new tree.Declaration(property, new tree.Anonymous(value)));
	const selector = (...parts: string[]): LessNode => new tree.Selector(parts.map(part => new tree.Element(blank(), part)));
	return nodes.map(node => {
		if (node.type === 'rule') return new tree.Ruleset([selector('&', node.pseudo)], declarations(node.declarations));
		const frames = node.blocks.map(block => new tree.Ruleset(block.selectors.map(frame => selector(frame)), declarations(block.declarations)));
		return new tree.AtRule('@keyframes', new tree.Anonymous(node.name), [new tree.Ruleset(null, frames)], undefined, undefined, null, true);
	});
}

/**
 * Less plugin that adds a `typed()` function. Call it inside a ruleset with the
 * same positional arguments as the SCSS mixin:
 *
 *     @plugin "@typed-css/less";
 *     .hero { typed("Hello", "World", 2, { iterations: 2; end-on: "Done!"; }); }
 */
const typedLessPlugin: TypedLessPlugin = {
	minVersion: [3, 5, 0],
	install(less, _pluginManager, functions) {
		const tree = isRecord(less) ? less['tree'] : undefined;
		if (!isLessTree(tree) || !isFunctionRegistry(functions)) {
			throw new Error('@typed-css/less requires Less 3.5 or newer.');
		}
		functions.add('typed', function (...args) {
			const result = typed(configFromArgs(args.map(arg => toArgValue(arg, this.context))));
			for (const warning of result.warnings) console.warn(`[typed.css] ${warning}`);
			return new tree.Ruleset([new tree.Selector([new tree.Element(new tree.Combinator(''), '&')])], buildNodes(tree, result.nodes)).eval(this.context);
		});
	},
};

export default typedLessPlugin;
