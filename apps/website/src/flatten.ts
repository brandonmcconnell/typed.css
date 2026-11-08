import { splitSelectorList, toCSS, typed } from '@typed-css/core';
import type { DemoRule } from './demo-model.ts';

/** Resolves a nested selector against its parents the way Sass, Less, and Stylus do. */
export function resolveSelector(selector: string, parents: readonly string[]): string[] {
	const parts = splitSelectorList(selector);
	if (parents.length === 0) return parts;
	return parents.flatMap(parent => parts.map(part => (part.includes('&') ? part.replaceAll('&', parent) : `${parent} ${part}`)));
}

/** Flattens a demo rule tree into plain CSS, generating its typewriter with @typed-css/core. */
export function demoRuleToCSS(rule: DemoRule, parents: readonly string[] = []): string {
	const selectors = resolveSelector(rule.selector, parents);
	const selector = selectors.join(', ');
	let css = '';
	if (rule.declarations && rule.declarations.length > 0) {
		css += `${selector} {\n${rule.declarations.map(([property, value]) => `  ${property}: ${value};\n`).join('')}}\n`;
	}
	for (const child of rule.rules ?? []) css += demoRuleToCSS(child, selectors);
	if (rule.typed) css += toCSS(typed(rule.typed), selector);
	return css;
}
