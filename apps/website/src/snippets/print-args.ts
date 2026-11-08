import { isSpeedsTuple, type Styles, type TypedConfig, type TypedOptions, type TypedSpeedsInput, type TypedString } from '@typed-css/core';

/** A typewriter config restated as preprocessor-style positional arguments with kebab-case keys. */
export type PrintValue =
	| { readonly kind: 'string'; readonly value: string }
	| { readonly kind: 'number'; readonly value: number }
	/** CSS text or a bare keyword (`null`, `true`, `infinite`, `2px`, `currentColor`). */
	| { readonly kind: 'raw'; readonly value: string }
	| { readonly kind: 'list'; readonly items: readonly PrintValue[] }
	| { readonly kind: 'map'; readonly entries: readonly MapEntry[] }
	/** A string with its own styles: per-string styles, or a styled `end-on`. */
	| { readonly kind: 'styled'; readonly text: string; readonly styles: readonly (readonly [string, string])[] };

export type MapEntry = readonly [key: string, value: PrintValue];

export interface PrintArgs {
	readonly strings: readonly PrintValue[];
	/** Whether any string has its own styles (SCSS then needs its map form for every string). */
	readonly styledStrings: boolean;
	readonly speeds?: PrintValue;
	readonly options?: PrintValue;
}

const raw = (value: string): PrintValue => ({ kind: 'raw', value });

const styleEntries = (styles: Styles): (readonly [string, string])[] =>
	Object.entries(styles).map(([property, value]) => [property, String(value)]);

const stylesMap = (styles: Styles): PrintValue => ({ kind: 'map', entries: styleEntries(styles).map(([property, value]) => [property, raw(value)]) });

const toStringValue = (input: string | TypedString): PrintValue =>
	typeof input === 'string' ? { kind: 'string', value: input } : { kind: 'styled', text: input.text, styles: styleEntries(input.styles ?? {}) };

function toSpeeds(speeds: TypedSpeedsInput): PrintValue {
	if (typeof speeds === 'number') return { kind: 'number', value: speeds };
	if (isSpeedsTuple(speeds)) {
		return { kind: 'list', items: speeds.map(value => (typeof value === 'number' ? { kind: 'number', value } : raw('null'))) };
	}
	const entries: MapEntry[] = [];
	const object = speeds;
	if (object.type !== undefined) entries.push(['type', { kind: 'number', value: object.type }]);
	if (object.pauseTyped !== undefined) entries.push(['pause-typed', { kind: 'number', value: object.pauseTyped }]);
	if (object.delete !== undefined) entries.push(['delete', { kind: 'number', value: object.delete }]);
	if (object.pauseDeleted !== undefined) entries.push(['pause-deleted', { kind: 'number', value: object.pauseDeleted }]);
	return { kind: 'map', entries };
}

function toOptions(options: TypedOptions): PrintValue | undefined {
	const entries: MapEntry[] = [];
	const text = (key: string, value: string | undefined): void => {
		if (value !== undefined) entries.push([key, { kind: 'string', value }]);
	};
	const number = (key: string, value: number | undefined): void => {
		if (value !== undefined) entries.push([key, { kind: 'number', value }]);
	};
	const css = (key: string, value: string | boolean | undefined): void => {
		if (value !== undefined) entries.push([key, raw(String(value))]);
	};
	text('name', options.name);
	if (options.iterations !== undefined) entries.push(['iterations', options.iterations === 'infinite' ? raw('infinite') : { kind: 'number', value: options.iterations }]);
	css('caret', options.caret);
	number('caret-speed', options.caretSpeed);
	css('caret-width', options.caretWidth);
	css('caret-color', options.caretColor);
	css('caret-space', options.caretSpace);
	number('delay', options.delay);
	css('type-pausing', options.typePausing);
	text('type-pausing-default', options.typePausingDefault);
	text('prefix', options.prefix);
	if (options.endOn !== undefined) {
		entries.push(['end-on', typeof options.endOn === 'number' ? { kind: 'number', value: options.endOn } : toStringValue(options.endOn)]);
	}
	text('alt-text', options.altText);
	if (options.styles) entries.push(['styles', stylesMap(options.styles)]);
	if (options.endStyles) entries.push(['end-styles', stylesMap(options.endStyles)]);
	return entries.length > 0 ? { kind: 'map', entries } : undefined;
}

export function toPrintArgs(config: TypedConfig): PrintArgs {
	const options = config.options ? toOptions(config.options) : undefined;
	const speeds = config.speeds === undefined || config.speeds === null ? (options ? raw('null') : undefined) : toSpeeds(config.speeds);
	return {
		strings: config.strings.map(toStringValue),
		styledStrings: config.strings.some(input => typeof input !== 'string'),
		...(speeds ? { speeds } : {}),
		...(options ? { options } : {}),
	};
}
