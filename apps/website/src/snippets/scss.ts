import type { TypedConfig } from '@typed-css/core';
import type { DemoRule } from '../demo-model.ts';
import { cssString, group, render, shortNumber, type Doc } from './layout.ts';
import { toPrintArgs, type PrintValue } from './print-args.ts';

/** Splits on commas outside parentheses and quotes. */
const hasTopLevelComma = (value: string): boolean => {
	let depth = 0;
	let quote: string | null = null;
	for (const char of value) {
		if (quote !== null) quote = char === quote ? null : quote;
		else if (char === '"' || char === "'") quote = char;
		else if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (char === ',' && depth === 0) return true;
	}
	return false;
};

const styles = (entries: readonly (readonly [string, string])[]): Doc =>
	entries.length === 0 ? '()' : group('(', entries.map(([property, value]) => `${property}: ${hasTopLevelComma(value) ? `(${value})` : value}`), ')');

function value(input: PrintValue): Doc {
	switch (input.kind) {
		case 'string':
			return cssString(input.value);
		case 'number':
			return shortNumber(input.value);
		case 'raw':
			return hasTopLevelComma(input.value) ? `(${input.value})` : input.value;
		case 'list':
			return group('[', input.items.map(value), ']');
		case 'map':
			return group('(', input.entries.map(([key, entry]) => [`${key}: `, value(entry)]), ')');
		case 'styled':
			return group('(', [[`${cssString(input.text)}: `, styles(input.styles)]], ')');
	}
}

export function scssCall(config: TypedConfig): Doc {
	const args = toPrintArgs(config);
	const strings: Doc[] = args.styledStrings
		? [
				group(
					'(',
					args.strings.map(entry =>
						entry.kind === 'styled' ? [`${cssString(entry.text)}: `, styles(entry.styles)] : entry.kind === 'string' ? `${cssString(entry.value)}: ()` : value(entry),
					),
					')',
					{ forceBreak: args.strings.length > 2 },
				),
			]
		: args.strings.map(value);
	const rest = [args.speeds, args.options].filter((entry): entry is PrintValue => entry !== undefined).map(value);
	return group('@include typed(', [...strings, ...rest], ');');
}

export function scssRule(rule: DemoRule, indent = ''): string {
	const inner = `${indent}  `;
	const lines = [
		...(rule.declarations ?? []).map(([property, entry]) => `${inner}${property}: ${entry};`),
		...(rule.rules ?? []).map(child => inner + scssRule(child, inner)),
		...(rule.typed ? [inner + render(scssCall(rule.typed), inner)] : []),
	];
	return `${rule.selector} {\n${lines.join('\n')}\n${indent}}`;
}
