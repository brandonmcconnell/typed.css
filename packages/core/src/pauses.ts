/**
 * Strings are handled as arrays of Unicode code points because Sass's string
 * functions (`str-length`, `str-slice`, `str-index`) count code points, not
 * UTF-16 code units.
 */

export type PauseDirection = 'fwd' | 'bwd' | 'both';

export const PAUSE_CHARS: Readonly<Record<PauseDirection, string>> = {
	fwd: '\u200b',
	bwd: '\u200c',
	both: '\ufeff',
};

export const toCodePoints = (value: string): string[] => Array.from(value);

function indexOfSequence(haystack: readonly string[], needle: readonly string[]): number {
	outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) continue outer;
		}
		return i;
	}
	return -1;
}

const OPEN = ['<', '['];
const CLOSE = [']', '>'];

function parsePauseLength(text: string, source: string): number {
	if (!/^\d+$/.test(text)) {
		throw new TypeError(`Invalid type-pause "<[${text}]>" in "${source}". Type-pauses require a non-negative integer, e.g. "<[3]>", "<[_3]>", "<[3_]>", or "<[_3_]>".`);
	}
	return Number(text);
}

/** Replaces each `<[N]>` with N invisible pause characters for the chosen direction. */
export function injectPauses(value: string, defaultMode: PauseDirection = 'fwd'): string {
	let chars = toCodePoints(value);
	for (;;) {
		const start = indexOfSequence(chars, OPEN);
		const end = indexOfSequence(chars, CLOSE);
		if (start === -1 || end === -1 || end <= start) break;
		const isFwd = chars[start + 2] === '_';
		const isBwd = chars[end - 1] === '_';
		const direction: PauseDirection = isFwd && isBwd ? 'both' : isBwd ? 'bwd' : isFwd ? 'fwd' : defaultMode;
		const count = parsePauseLength(chars.slice(start + (isFwd ? 3 : 2), end + 1 - (isBwd ? 2 : 1)).join(''), value);
		chars = [...chars.slice(0, start), ...Array<string>(count).fill(PAUSE_CHARS[direction]), ...chars.slice(end + 2)];
	}
	return chars.join('');
}

const removeChars = (value: string, remove: readonly string[]): string =>
	toCodePoints(value)
		.filter(char => !remove.includes(char))
		.join('');

export const removeAllPauseChars = (value: string): string => removeChars(value, Object.values(PAUSE_CHARS));
/** The string as typed going forward: backward-only pauses are dropped. */
export const forwardString = (value: string): string => removeChars(value, [PAUSE_CHARS.bwd]);
/** The string as deleted going backward: forward-only pauses are dropped. */
export const backwardString = (value: string): string => removeChars(value, [PAUSE_CHARS.fwd]);
export const sanitizePauses = (value: string): string => removeAllPauseChars(injectPauses(value));
