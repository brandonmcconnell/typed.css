import type { PauseDirection } from './pauses.ts';
import { formatNumber, quoteString } from './serialize-value.ts';
import type { Styles, TypedConfig, TypedOptions, TypedSpeeds, TypedSpeedsInput, TypedString, TypedStringInput } from './typed.ts';

/**
 * A preprocessor-neutral value. Each preprocessor plugin converts its native
 * argument nodes into these, so the argument rules below are shared by every
 * plugin instead of being reimplemented per language.
 */
export type ArgValue =
	| { readonly kind: 'string'; readonly value: string }
	| { readonly kind: 'number'; readonly value: number; readonly unit: string }
	/** A bare word or raw CSS text: `null`, `infinite`, `true`, `red`, `#000`, … */
	| { readonly kind: 'keyword'; readonly value: string }
	| { readonly kind: 'list'; readonly separator: ' ' | ', '; readonly items: readonly ArgValue[] }
	| { readonly kind: 'map'; readonly entries: readonly (readonly [key: string, value: ArgValue])[] };

type MapArg = Extract<ArgValue, { kind: 'map' }>;

/**
 * Decodes CSS escapes (`\A`, `\"`, `\1F600 `) in a string's source text, for
 * preprocessors that hand plugins the raw text of a quoted string.
 */
export const unescapeCSS = (value: string): string =>
	value.replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|([\s\S]))/g, (_match, hex: string | undefined, char: string | undefined) =>
		hex === undefined ? (char ?? '') : String.fromCodePoint(toValidCodePoint(Number.parseInt(hex, 16))),
	);

/**
 * Interprets raw CSS text (as some preprocessors pass unparsed declaration
 * values) as a number, a single quoted string, or else a keyword.
 */
export function fromRawCSS(text: string): ArgValue {
	const value = text.trim();
	const number = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]+|%)?$/i.exec(value);
	if (number) return { kind: 'number', value: Number(number[1]), unit: number[2] ?? '' };
	const quoted = /^(["'])((?:\\[\s\S]|(?!\1)[^\\])*)\1$/.exec(value);
	if (quoted) return { kind: 'string', value: unescapeCSS(quoted[2] ?? '') };
	return { kind: 'keyword', value };
}

const toValidCodePoint = (codePoint: number): number =>
	codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff) ? 0xfffd : codePoint;

const SPEED_KEYS: Readonly<Record<string, keyof TypedSpeeds>> = {
	type: 'type',
	'pause-typed': 'pauseTyped',
	delete: 'delete',
	'pause-deleted': 'pauseDeleted',
};

const describe = (value: ArgValue): string => (value.kind === 'map' ? 'map' : value.kind === 'list' ? 'list' : `${value.kind} ${toCSSValue(value)}`);

const isKeyword = (value: ArgValue, keyword: string): boolean => value.kind === 'keyword' && value.value.toLowerCase() === keyword;
const isNull = (value: ArgValue): boolean => isKeyword(value, 'null');

/** Serializes a value as CSS text, for style declarations and CSS-valued options. */
export function toCSSValue(value: ArgValue): string {
	switch (value.kind) {
		case 'string':
			return quoteString(value.value);
		case 'number':
			return formatNumber(value.value) + value.unit;
		case 'keyword':
			return value.value;
		case 'list':
			return value.items.map(toCSSValue).join(value.separator);
		case 'map':
			throw new TypeError('A map cannot be used as a CSS value.');
	}
}

const getEntry = (map: MapArg, key: string): ArgValue | undefined => map.entries.find(([entryKey]) => entryKey === key)?.[1];

function toStyles(value: ArgValue, label: string): Styles {
	if (value.kind !== 'map') throw new TypeError(`${label} must be a map of CSS declarations; received ${describe(value)}.`);
	return Object.fromEntries(value.entries.map(([property, entry]) => [property, toCSSValue(entry)]));
}

/** A map with a `text` entry is a string with its own styles: `{ text: "Red"; color: red }`. */
function asStyledString(value: ArgValue): TypedString | null {
	if (value.kind !== 'map') return null;
	const text = getEntry(value, 'text');
	if (text?.kind !== 'string') return null;
	return { text: text.value, styles: toStyles({ kind: 'map', entries: value.entries.filter(([key]) => key !== 'text') }, 'String styles') };
}

function toPlainNumber(value: ArgValue, label: string): number {
	if (value.kind === 'number' && (value.unit === '' || value.unit === 's')) return value.value;
	if (value.kind === 'number' && value.unit === 'ms') return value.value / 1000;
	throw new TypeError(`${label} must be a number of seconds; received ${describe(value)}.`);
}

function toSpeeds(value: ArgValue): TypedSpeedsInput | null {
	if (isNull(value)) return null;
	if (value.kind === 'number') return toPlainNumber(value, 'The speed multiplier');
	if (value.kind === 'list') {
		if (value.items.length > 4) throw new RangeError('The speeds list accepts at most 4 values.');
		const [type, pauseTyped, del, pauseDeleted] = value.items.map(item => (isNull(item) ? null : toPlainNumber(item, 'Each speed')));
		return [type ?? null, pauseTyped ?? null, del ?? null, pauseDeleted ?? null];
	}
	if (value.kind === 'map') {
		const speeds: Partial<Record<keyof TypedSpeeds, number>> = {};
		for (const [key, entry] of value.entries) {
			const speedKey = SPEED_KEYS[key];
			if (speedKey === undefined) throw new TypeError(`${key} is not a valid speed property. Accepted speed properties are ${Object.keys(SPEED_KEYS).join(', ')}.`);
			speeds[speedKey] = toPlainNumber(entry, `speeds.${key}`);
		}
		return speeds;
	}
	throw new TypeError(`Speeds must be a number, a list, a map, or null; received ${describe(value)}.`);
}

function toBoolean(value: ArgValue, label: string): boolean {
	if (isKeyword(value, 'true')) return true;
	if (isKeyword(value, 'false')) return false;
	throw new TypeError(`${label} must be true or false; received ${describe(value)}.`);
}

function toText(value: ArgValue, label: string): string {
	if (value.kind === 'string' || value.kind === 'keyword') return value.value;
	throw new TypeError(`${label} must be a string; received ${describe(value)}.`);
}

function toPauseDirection(value: ArgValue): PauseDirection {
	const direction = toText(value, 'type-pausing-default');
	if (direction === 'fwd' || direction === 'bwd' || direction === 'both') return direction;
	throw new TypeError('type-pausing-default must be "fwd", "bwd", or "both".');
}

type MutableOptions = { -readonly [Key in keyof TypedOptions]: TypedOptions[Key] };

const OPTION_READERS: Readonly<Record<string, (options: MutableOptions, value: ArgValue) => void>> = {
	name: (options, value) => (options.name = toText(value, 'name')),
	iterations: (options, value) => {
		options.iterations = isKeyword(value, 'infinite') ? 'infinite' : toPlainNumber(value, 'iterations');
	},
	caret: (options, value) => (options.caret = toBoolean(value, 'caret')),
	'caret-speed': (options, value) => (options.caretSpeed = toPlainNumber(value, 'caret-speed')),
	'caret-width': (options, value) => (options.caretWidth = toCSSValue(value)),
	'caret-color': (options, value) => (options.caretColor = toCSSValue(value)),
	'caret-space': (options, value) => (options.caretSpace = toCSSValue(value)),
	styles: (options, value) => (options.styles = toStyles(value, 'styles')),
	'end-styles': (options, value) => (options.endStyles = toStyles(value, 'end-styles')),
	delay: (options, value) => (options.delay = toPlainNumber(value, 'delay')),
	'type-pausing': (options, value) => (options.typePausing = toBoolean(value, 'type-pausing')),
	'type-pausing-default': (options, value) => (options.typePausingDefault = toPauseDirection(value)),
	prefix: (options, value) => (options.prefix = toText(value, 'prefix')),
	'alt-text': (options, value) => (options.altText = toText(value, 'alt-text')),
	'end-on': (options, value) => {
		const styled = asStyledString(value);
		if (styled) options.endOn = styled;
		else if (value.kind === 'number') options.endOn = toPlainNumber(value, 'end-on');
		else options.endOn = toText(value, 'end-on');
	},
};

function toOptions(value: ArgValue): TypedOptions {
	if (isNull(value)) return {};
	if (value.kind !== 'map') throw new TypeError(`Options must be a map; received ${describe(value)}.`);
	const options: MutableOptions = {};
	for (const [key, entry] of value.entries) {
		const read = OPTION_READERS[key];
		if (read === undefined) throw new TypeError(`${key} is not a valid option. Accepted options are ${Object.keys(OPTION_READERS).join(', ')}.`);
		read(options, entry);
	}
	return options;
}

/**
 * Resolves preprocessor-style positional arguments, as accepted by the SCSS
 * mixin: one or more strings, then optional speeds, then optional options.
 */
export function configFromArgs(input: readonly ArgValue[]): TypedConfig {
	const [first, ...rest] = input;
	// A leading comma list of strings (e.g. Less's `typed("a", "b"; 2)` form) is the strings themselves.
	const args =
		first?.kind === 'list' && first.separator === ', ' && first.items.every(item => item.kind === 'string' || asStyledString(item) !== null)
			? [...first.items, ...rest]
			: input;
	const strings: TypedStringInput[] = [];
	let index = 0;
	for (; index < args.length; index++) {
		const arg = args[index];
		if (arg === undefined) break;
		if (arg.kind === 'string') strings.push(arg.value);
		else {
			const styled = asStyledString(arg);
			if (styled === null) break;
			strings.push(styled);
		}
	}
	if (strings.length === 0) throw new TypeError('typed() requires at least one string as its first argument.');
	const [speedsArg, optionsArg, ...extra] = args.slice(index);
	if (extra.length > 0) throw new TypeError('typed() accepts strings, then speeds, then options; no arguments are permitted after the options.');
	return {
		strings,
		speeds: speedsArg === undefined ? null : toSpeeds(speedsArg),
		...(optionsArg === undefined ? {} : { options: toOptions(optionsArg) }),
	};
}
