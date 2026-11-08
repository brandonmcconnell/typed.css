import type { Declaration, KeyframeBlock, TypedResult } from './typed.ts';

/** Splits a selector list on top-level commas, ignoring commas inside parentheses, brackets, or strings. */
export function splitSelectorList(selector: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let quote: string | null = null;
	let current = '';
	for (let i = 0; i < selector.length; i++) {
		const char = selector.charAt(i);
		if (quote !== null) {
			if (char === '\\') {
				current += char + selector.charAt(i + 1);
				i++;
				continue;
			}
			if (char === quote) quote = null;
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === '(' || char === '[') {
			depth++;
		} else if (char === ')' || char === ']') {
			depth--;
		} else if (char === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	parts.push(current.trim());
	return parts.filter(part => part !== '');
}

const indent = (depth: number): string => '  '.repeat(depth);

const declarationsToCSS = (declarations: readonly Declaration[], depth: number): string =>
	declarations.map(([property, value]) => `${indent(depth)}${property}: ${value};\n`).join('');

const blockToCSS = (block: KeyframeBlock): string =>
	`${indent(1)}${block.selectors.join(', ')} {\n${declarationsToCSS(block.declarations, 2)}${indent(1)}}\n`;

export interface ToCSSOptions {
	/** Prepend `@charset "UTF-8";`, as a standalone stylesheet needs for its zero-width characters. */
	readonly charset?: boolean;
}

/** Serializes a typewriter for `selector` as raw CSS in the same format Dart Sass emits for the SCSS mixin. */
export function toCSS(result: TypedResult, selector: string, options: ToCSSOptions = {}): string {
	const selectors = splitSelectorList(selector);
	if (selectors.length === 0) throw new TypeError('A non-empty selector is required.');
	const body = result.nodes
		.map(node => {
			if (node.type === 'rule') {
				return `${selectors.map(part => part + node.pseudo).join(', ')} {\n${declarationsToCSS(node.declarations, 1)}}\n`;
			}
			return `@keyframes ${node.name} {\n${node.blocks.map(blockToCSS).join('')}}\n`;
		})
		.join('');
	return (options.charset ? '@charset "UTF-8";\n' : '') + body;
}

/** Declarations as a CSS-in-JS object; repeated properties (fallbacks) become arrays, as postcss-js expects. */
export type CSSDeclarations = { [property: string]: string | string[] };

function declarationsToObject(declarations: readonly Declaration[]): CSSDeclarations {
	const output: CSSDeclarations = {};
	for (const [property, value] of declarations) {
		const existing = output[property];
		if (existing === undefined) output[property] = value;
		else if (Array.isArray(existing)) {
			if (!existing.includes(value)) existing.push(value);
		} else if (existing !== value) output[property] = [existing, value];
	}
	return output;
}

export interface CSSObjectResult {
	/** Rules keyed relative to the element, e.g. `&::before`. */
	readonly rules: { [nestedSelector: string]: CSSDeclarations };
	/** Keyframes keyed as `@keyframes <name>`. */
	readonly keyframes: { [atRule: string]: { [selector: string]: CSSDeclarations } };
}

/** Serializes a typewriter as CSS-in-JS objects (for Tailwind plugins, postcss-js, and similar tools). */
export function toCSSObject(result: TypedResult): CSSObjectResult {
	const rules: CSSObjectResult['rules'] = {};
	const keyframes: CSSObjectResult['keyframes'] = {};
	for (const node of result.nodes) {
		if (node.type === 'rule') {
			rules[`&${node.pseudo}`] = declarationsToObject(node.declarations);
		} else {
			const frames: { [selector: string]: CSSDeclarations } = {};
			for (const block of node.blocks) frames[block.selectors.join(', ')] = declarationsToObject(block.declarations);
			keyframes[`@keyframes ${node.name}`] = frames;
		}
	}
	return { rules, keyframes };
}
