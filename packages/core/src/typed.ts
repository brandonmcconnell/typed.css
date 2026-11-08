import {
	backwardString,
	forwardString,
	injectPauses,
	sanitizePauses,
	toCodePoints,
	type PauseDirection,
} from './pauses.ts';
import { formatNumber, quoteString } from './serialize-value.ts';

export type StyleValue = string | number;
/** CSS declarations keyed by property name, emitted in insertion order. */
export type Styles = Readonly<Record<string, StyleValue>>;

export interface TypedString {
	readonly text: string;
	readonly styles?: Styles;
}
export type TypedStringInput = string | TypedString;

export interface TypedSpeeds {
	/** Seconds to type one character. */
	readonly type: number;
	/** Seconds to wait once a string is fully typed. */
	readonly pauseTyped: number;
	/** Seconds to delete one character. */
	readonly delete: number;
	/** Seconds to wait once a string is fully deleted. */
	readonly pauseDeleted: number;
}

/**
 * - a number multiplies the default speed (2 is twice as fast)
 * - an object overrides individual speeds
 * - a tuple overrides speeds in `type, pauseTyped, delete, pauseDeleted` order,
 *   where `null` keeps the default
 */
export type TypedSpeedsInput =
	| number
	| Partial<TypedSpeeds>
	| readonly [type?: number | null, pauseTyped?: number | null, del?: number | null, pauseDeleted?: number | null];

export interface TypedOptions {
	readonly name?: string;
	readonly iterations?: number | 'infinite';
	readonly caret?: boolean;
	readonly caretSpeed?: number;
	readonly caretWidth?: string;
	readonly caretColor?: string;
	readonly caretSpace?: string;
	readonly styles?: Styles;
	readonly endStyles?: Styles;
	readonly delay?: number;
	readonly typePausing?: boolean;
	readonly typePausingDefault?: PauseDirection;
	readonly prefix?: string;
	/** A string, a 1-based index into `strings`, or a string with its own styles. */
	readonly endOn?: string | number | TypedString;
	readonly altText?: string;
}

export interface TypedConfig {
	readonly strings: readonly TypedStringInput[];
	readonly speeds?: TypedSpeedsInput | null;
	readonly options?: TypedOptions;
}

export type Declaration = readonly [property: string, value: string];

export interface TypedRuleNode {
	readonly type: 'rule';
	readonly pseudo: '::before' | '::after';
	readonly declarations: readonly Declaration[];
}

export interface KeyframeBlock {
	readonly selectors: readonly string[];
	readonly declarations: readonly Declaration[];
}

export interface TypedKeyframesNode {
	readonly type: 'keyframes';
	readonly name: string;
	readonly blocks: readonly KeyframeBlock[];
}

export type TypedNode = TypedRuleNode | TypedKeyframesNode;

export interface TypedResult {
	readonly animationName: string;
	/** Nodes in the same order the SCSS mixin emits them. */
	readonly nodes: readonly TypedNode[];
	readonly warnings: readonly string[];
}

export const DEFAULT_SPEEDS: TypedSpeeds = {
	type: 0.1,
	pauseTyped: 2,
	delete: 0.08,
	pauseDeleted: 1,
};

const SPEED_KEYS = ['type', 'pauseTyped', 'delete', 'pauseDeleted'] as const;

interface ResolvedOptions {
	readonly name: string;
	readonly iterations: number | 'infinite';
	readonly caret: boolean;
	readonly caretSpeed: number;
	readonly caretWidth: string;
	readonly caretColor: string;
	readonly caretSpace: string;
	readonly styles: Styles;
	readonly endStyles: Styles;
	readonly delay: number;
	readonly typePausing: boolean;
	readonly typePausingDefault: PauseDirection;
	readonly prefix: string;
	readonly altText: string;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
	name: '',
	iterations: 'infinite',
	caret: true,
	caretSpeed: 0.75,
	caretWidth: '1ch',
	caretColor: 'currentColor',
	caretSpace: '0.1ch',
	styles: {},
	endStyles: {},
	delay: 1,
	typePausing: true,
	typePausingDefault: 'fwd',
	prefix: '',
	altText: '',
};

const ZERO_WIDTH_SPACE = '\u200b';

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

function assertNumber(value: unknown, label: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new TypeError(`The ${label} value ${String(value)} is not a finite number.`);
	}
}

type SpeedsTuple = Extract<TypedSpeedsInput, readonly unknown[]>;
const isSpeedsTuple = (input: Exclude<TypedSpeedsInput, number>): input is SpeedsTuple => Array.isArray(input);

function resolveSpeeds(input: TypedSpeedsInput | null | undefined): TypedSpeeds {
	if (input === null || input === undefined) return DEFAULT_SPEEDS;
	if (typeof input === 'number') {
		if (!(input > 0)) {
			throw new RangeError('A numeric speeds value is a multiplier and must be a positive non-zero number. Use 0.5 to halve the speed or 2 to double it.');
		}
		// Multiplies by the reciprocal (rather than dividing) to match the SCSS arithmetic exactly.
		const factor = 1 / input;
		return {
			type: DEFAULT_SPEEDS.type * factor,
			pauseTyped: DEFAULT_SPEEDS.pauseTyped * factor,
			delete: DEFAULT_SPEEDS.delete * factor,
			pauseDeleted: DEFAULT_SPEEDS.pauseDeleted * factor,
		};
	}
	const speeds: Record<(typeof SPEED_KEYS)[number], number> = { ...DEFAULT_SPEEDS };
	if (isSpeedsTuple(input)) {
		if (input.length > SPEED_KEYS.length) throw new RangeError('The speeds tuple accepts at most 4 values.');
		input.forEach((value, index) => {
			const key = SPEED_KEYS[index];
			if (value === null || value === undefined || key === undefined) return;
			assertNumber(value, `speeds[${index}]`);
			speeds[key] = value;
		});
		return speeds;
	}
	const partial: Partial<TypedSpeeds> = input;
	for (const [key, value] of Object.entries(partial)) {
		const speedKey = SPEED_KEYS.find(candidate => candidate === key);
		if (speedKey === undefined) {
			throw new TypeError(`${key} is not a valid speed property. Accepted speed properties are ${SPEED_KEYS.join(', ')}.`);
		}
		if (value === undefined) continue;
		assertNumber(value, `speeds.${key}`);
		speeds[speedKey] = value;
	}
	return speeds;
}

interface NormalizedString {
	readonly text: string;
	readonly styles: Styles | null;
}

const normalizeString = (input: TypedStringInput): NormalizedString =>
	typeof input === 'string' ? { text: input, styles: null } : { text: input.text, styles: input.styles ?? {} };

function resolveEndOn(endOn: TypedOptions['endOn'], strings: readonly NormalizedString[]): { text: string; styles: Styles } {
	if (endOn === undefined || endOn === '') return { text: '', styles: {} };
	if (typeof endOn === 'number') {
		if (!isPositiveInteger(endOn) || endOn > strings.length) {
			throw new RangeError('A numeric endOn value must be a positive integer between 1 and the number of strings.');
		}
		return { text: strings[endOn - 1]?.text ?? '', styles: {} };
	}
	if (typeof endOn === 'string') return { text: endOn, styles: {} };
	if (endOn.text === '') throw new TypeError('The endOn option requires a non-empty string.');
	return { text: endOn.text, styles: endOn.styles ?? {} };
}

function resolveOptions(options: TypedOptions): ResolvedOptions {
	const iterations = options.iterations ?? DEFAULT_OPTIONS.iterations;
	if (iterations !== 'infinite' && !(Number.isInteger(iterations) && iterations >= 0)) {
		throw new RangeError(`The iterations value ${String(iterations)} must be a non-negative integer or "infinite".`);
	}
	const typePausingDefault = options.typePausingDefault ?? DEFAULT_OPTIONS.typePausingDefault;
	if (!['fwd', 'bwd', 'both'].includes(typePausingDefault)) {
		throw new TypeError('The typePausingDefault option must be "fwd", "bwd", or "both".');
	}
	const caretSpeed = options.caretSpeed ?? DEFAULT_OPTIONS.caretSpeed;
	assertNumber(caretSpeed, 'caretSpeed');
	if (caretSpeed < 0) throw new RangeError(`caretSpeed must be a non-negative number of seconds; received ${caretSpeed}.`);
	const delay = options.delay ?? DEFAULT_OPTIONS.delay;
	assertNumber(delay, 'delay');
	if (delay < 0) throw new RangeError(`delay must be a non-negative number of seconds; received ${delay}.`);
	return {
		name: options.name ?? DEFAULT_OPTIONS.name,
		iterations,
		caret: options.caret ?? DEFAULT_OPTIONS.caret,
		caretSpeed,
		caretWidth: options.caretWidth ?? DEFAULT_OPTIONS.caretWidth,
		caretColor: options.caretColor ?? DEFAULT_OPTIONS.caretColor,
		caretSpace: options.caretSpace ?? DEFAULT_OPTIONS.caretSpace,
		styles: options.styles ?? DEFAULT_OPTIONS.styles,
		endStyles: options.endStyles ?? DEFAULT_OPTIONS.endStyles,
		delay,
		typePausing: options.typePausing ?? DEFAULT_OPTIONS.typePausing,
		typePausingDefault,
		prefix: options.prefix ?? DEFAULT_OPTIONS.prefix,
		altText: options.altText ?? DEFAULT_OPTIONS.altText,
	};
}

const formatStyleValue = (value: StyleValue): string => (typeof value === 'number' ? formatNumber(value) : value);

const styleDeclarations = (styles: Styles): Declaration[] =>
	Object.entries(styles).map(([property, value]): Declaration => [property, formatStyleValue(value)]);

/** FNV-1a, used to derive a stable default animation name from the config. */
function hashConfig(value: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}

const length = (value: string): number => toCodePoints(value).length;
const slice = (value: string, count: number): string => toCodePoints(value).slice(0, Math.max(count, 0)).join('');

/**
 * Builds the typewriter animation as framework-agnostic nodes. This is the
 * single source of truth that the raw-CSS, CSS-in-JS, and Tailwind outputs
 * are serialized from.
 */
export function typed(config: TypedConfig): TypedResult {
	const warnings: string[] = [];
	const normalized = config.strings.map(normalizeString);
	if (normalized.length === 0) throw new TypeError('At least one string is required.');
	normalized.forEach(({ text }, index) => {
		if (text === '') throw new TypeError(`String ${index + 1} is empty. Every string must contain at least one character.`);
	});
	const usesStringStyles = normalized.some(({ styles }) => styles !== null);
	const speeds = resolveSpeeds(config.speeds);
	const options = resolveOptions(config.options ?? {});
	const endOn = resolveEndOn(config.options?.endOn, normalized);
	if (endOn.text !== '' && options.iterations === 'infinite') {
		warnings.push('The endOn string is only rendered with a finite number of iterations. The current animation has infinite iterations, so endOn is ignored.');
	}

	const { type: durCharFwd, pauseTyped: durFullGap, delete: durCharBwd, pauseDeleted: durDoneGap } = speeds;
	const finalString = injectPauses(endOn.text !== '' ? endOn.text : (normalized[0]?.text ?? ''));
	const altText = sanitizePauses(options.altText !== '' ? options.altText : finalString);
	const prefix = sanitizePauses(options.prefix);
	const strings = normalized.map(({ text }) => (options.typePausing ? injectPauses(text, options.typePausingDefault) : text));
	const stringStyles: readonly Styles[] = usesStringStyles ? normalized.map(({ styles }) => styles ?? {}) : [];
	const animationName = options.name !== '' ? options.name : `typed-${hashConfig(JSON.stringify(config))}`;

	const contentDeclarations = (text: string): Declaration[] => {
		const content = quoteString(ZERO_WIDTH_SPACE + prefix + sanitizePauses(text));
		return [
			['content', content],
			['content', `${content}/${quoteString(altText)}`],
			['alt', quoteString(altText)],
		];
	};

	const lengths = strings.map(value => ({ fwd: length(forwardString(value)), bwd: length(backwardString(value)) }));
	let durTotal = 0;
	for (const { fwd, bwd } of lengths) {
		durTotal = durTotal + durCharFwd * fwd + durFullGap + durCharBwd * bwd + durDoneGap;
	}

	const percent = (stringIndex: number, charNth: number, modifier: number): string => {
		let time = 0;
		for (let past = stringIndex - 1; past >= 0; past--) {
			const pastLengths = lengths[past] ?? { fwd: 0, bwd: 0 };
			time = time + durCharFwd * pastLengths.fwd + durCharBwd * pastLengths.bwd + durFullGap + durDoneGap;
		}
		const fwdLength = lengths[stringIndex]?.fwd ?? 0;
		if (charNth <= fwdLength) {
			time = time + durCharFwd * (charNth - 1);
		} else {
			time = time + durCharFwd * fwdLength + durFullGap + durCharBwd * (charNth - fwdLength);
		}
		return `${formatNumber((time / durTotal) * 100 + modifier)}%`;
	};

	const allStyleProperties = [...stringStyles, options.styles].flatMap(styles => Object.keys(styles));
	const perStringDeclarations = (stringIndex: number): Declaration[] => {
		const merged: Record<string, StyleValue> = { ...(stringStyles[stringIndex] ?? {}), ...options.styles };
		return allStyleProperties.map((property): Declaration => {
			const value = merged[property];
			return [property, value === undefined ? 'unset' : formatStyleValue(value)];
		});
	};

	const mainBlocks: KeyframeBlock[] = [];
	strings.forEach((value, i) => {
		const fwd = forwardString(value);
		const bwd = backwardString(value);
		const { fwd: fwdLength, bwd: bwdLength } = lengths[i] ?? { fwd: 0, bwd: 0 };
		const combinedLength = fwdLength + bwdLength;
		const styles = perStringDeclarations(i);
		for (let j = 1; j <= combinedLength; j++) {
			if (j < combinedLength) {
				const text = j <= fwdLength ? slice(fwd, j) : slice(bwd, bwdLength - (j - fwdLength));
				mainBlocks.push({ selectors: [percent(i, j, 0), percent(i, j + 1, -0.001)], declarations: [...contentDeclarations(text), ...styles] });
			} else {
				const end = i < strings.length - 1 ? percent(i + 1, 1, -0.001) : '100%';
				mainBlocks.push({ selectors: [percent(i, j, 0), end], declarations: [...contentDeclarations(''), ...styles] });
			}
		}
	});

	const iterations = options.iterations;
	const beforeDeclarations: Declaration[] = [
		...contentDeclarations(''),
		['white-space', 'break-spaces'],
		['will-change', 'content'],
	];
	const nodes: TypedNode[] = [];
	const totalSeconds = formatNumber(durTotal);
	const delaySeconds = formatNumber(options.delay);
	if (iterations === 'infinite') {
		beforeDeclarations.push(['animation', `${animationName} ${totalSeconds}s linear ${delaySeconds}s infinite forwards`]);
		nodes.push({ type: 'rule', pseudo: '::before', declarations: beforeDeclarations });
	} else {
		const finalLength = length(finalString);
		const finalStart = formatNumber(durTotal * iterations + options.delay);
		beforeDeclarations.push([
			'animation',
			`${animationName} ${totalSeconds}s linear ${delaySeconds}s ${iterations} forwards, ${animationName}-final ${formatNumber(finalLength * durCharFwd)}s linear ${finalStart}s 1 forwards`,
		]);
		nodes.push({ type: 'rule', pseudo: '::before', declarations: beforeDeclarations });
		const finalStyles = { ...options.styles, ...endOn.styles };
		const finalBlocks: KeyframeBlock[] = [];
		for (let i = 1; i <= finalLength; i++) {
			const modifier = i === 1 ? 0 : 0.001;
			const styles = i === finalLength ? { ...finalStyles, ...options.endStyles } : finalStyles;
			finalBlocks.push({
				selectors: [`${formatNumber(((i - 1) / finalLength) * 100 + modifier)}%`, `${formatNumber((i / finalLength) * 100)}%`],
				declarations: [...contentDeclarations(slice(finalString, i)), ...styleDeclarations(styles)],
			});
		}
		nodes.push({ type: 'keyframes', name: `${animationName}-final`, blocks: finalBlocks });
	}

	if (options.caret) {
		nodes.push({
			type: 'rule',
			pseudo: '::after',
			declarations: [
				['content', quoteString(ZERO_WIDTH_SPACE)],
				['position', 'relative'],
				['display', 'inline-block'],
				['padding-right', options.caretSpace],
				['border-right', `${options.caretWidth} solid ${options.caretColor}`],
				['white-space', 'nowrap'],
				['animation', `${animationName}-caret ${formatNumber(options.caretSpeed)}s linear ${delaySeconds}s infinite forwards`],
			],
		});
	}
	nodes.push({ type: 'keyframes', name: animationName, blocks: mainBlocks });
	if (options.caret) {
		nodes.push({ type: 'keyframes', name: `${animationName}-caret`, blocks: [{ selectors: ['75%'], declarations: [['border-color', 'transparent']] }] });
	}

	return { animationName, nodes, warnings };
}
