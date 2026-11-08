import type { TypedConfig } from '@typed-css/core';
import type { DemoRule } from '../demo-model.ts';
import { cssString, group, render, shortNumber, type Doc } from './layout.ts';
import { toPrintArgs, type PrintValue } from './print-args.ts';

// Stylus can't parse an escaped quote inside a call in a selector block, so pick the quote the string doesn't contain.
const string = (text: string): string => cssString(text, text.includes('"') && !text.includes("'") ? "'" : '"');

/** Single tokens pass through; anything else is wrapped in unquote() so Stylus doesn't evaluate it. */
const cssValue = (text: string): string => (/^[#\w.%-]+$/.test(text) ? text : `unquote(${cssString(text, "'")})`);

const hash = (entries: readonly Doc[]): Doc => group('{', entries, '}', { pad: true });

function value(input: PrintValue): Doc {
	switch (input.kind) {
		case 'string':
			return string(input.value);
		case 'number':
			return shortNumber(input.value);
		case 'raw':
			return cssValue(input.value);
		case 'list':
			return input.items.map(item => value(item)).flatMap((item, index) => (index === 0 ? [item] : [' ', item]));
		case 'map':
			return hash(input.entries.map(([key, entry]) => [`${key}: `, value(entry)]));
		case 'styled':
			return hash([`text: ${string(input.text)}`, ...input.styles.map(([property, entry]) => `${property}: ${cssValue(entry)}`)]);
	}
}

export function stylusCall(config: TypedConfig): Doc {
	const args = toPrintArgs(config);
	const all = [...args.strings, ...[args.speeds, args.options].filter((entry): entry is PrintValue => entry !== undefined)];
	return group('typed(', all.map(value), ')');
}

export function stylusRule(rule: DemoRule, indent = ''): string {
	const inner = `${indent}  `;
	const lines = [
		...(rule.declarations ?? []).map(([property, entry]) => `${inner}${property} ${entry}`),
		...(rule.rules ?? []).map(child => inner + stylusRule(child, inner)),
		...(rule.typed ? [inner + render(stylusCall(rule.typed), inner)] : []),
	];
	return `${rule.selector}\n${lines.join('\n')}`;
}
