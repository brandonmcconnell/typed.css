import type { TypedConfig } from '@typed-css/core';
import type { DemoRule } from '../demo-model.ts';
import { cssString, group, render, shortNumber, type Doc } from './layout.ts';
import { toPrintArgs, type PrintValue } from './print-args.ts';

/** A Less detached ruleset; each item carries its own terminator (`;` or a nested ruleset). */
const ruleset = (items: readonly Doc[]): Doc => group('{', items, '}', { separator: '', pad: true });

const declarations = (entries: readonly (readonly [string, string])[]): Doc[] => entries.map(([property, entry]) => `${property}: ${entry};`);

function value(input: PrintValue): Doc {
	switch (input.kind) {
		case 'string':
			return cssString(input.value);
		case 'number':
			return shortNumber(input.value);
		case 'raw':
			return input.value;
		case 'list':
			return input.items.map(item => value(item)).flatMap((item, index) => (index === 0 ? [item] : [' ', item]));
		case 'map':
			return ruleset(
				input.entries.map(([key, entry]) =>
					// Maps nest as rulesets (`styles { … }`), since Less declarations can't hold maps.
					entry.kind === 'map' || entry.kind === 'styled' ? [`${key} `, value(entry)] : [`${key}: `, value(entry), ';'],
				),
			);
		case 'styled':
			return ruleset([`text: ${cssString(input.text)};`, ...declarations(input.styles)]);
	}
}

export function lessCall(config: TypedConfig): Doc {
	const args = toPrintArgs(config);
	const all = [...args.strings, ...[args.speeds, args.options].filter((entry): entry is PrintValue => entry !== undefined)];
	return group('typed(', all.map(value), ');');
}

export function lessRule(rule: DemoRule, indent = ''): string {
	const inner = `${indent}  `;
	const lines = [
		...(rule.declarations ?? []).map(([property, entry]) => `${inner}${property}: ${entry};`),
		...(rule.rules ?? []).map(child => inner + lessRule(child, inner)),
		...(rule.typed ? [inner + render(lessCall(rule.typed), inner)] : []),
	];
	return `${rule.selector} {\n${lines.join('\n')}\n${indent}}`;
}
