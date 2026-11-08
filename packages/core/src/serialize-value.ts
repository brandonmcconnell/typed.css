/**
 * Value serialization that mirrors Dart Sass's expanded output style, so the
 * CSS produced here is byte-for-byte identical to compiling `typed.scss`.
 */

const PRECISION = 10;
const EPSILON = 10 ** -(PRECISION + 1);

function removeExponent(text: string): string {
	const match = /^(-?)(\d)(?:\.(\d+))?e([+-]?\d+)$/.exec(text);
	if (!match) return text;
	const [, sign = '', lead = '', fraction = '', exponentText = '0'] = match;
	const digits = lead + fraction;
	const exponent = Number(exponentText);
	if (exponent >= 0) {
		const intLength = 1 + exponent;
		return sign + (digits.length <= intLength ? digits.padEnd(intLength, '0') : `${digits.slice(0, intLength)}.${digits.slice(intLength)}`);
	}
	return `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`;
}

function writeRounded(text: string): string {
	let textIndex = 0;
	const negative = text.startsWith('-');
	if (negative) textIndex++;
	// A leading 0 slot absorbs a carry when rounding up (e.g. 9.99… → 10).
	const digits: number[] = [0];
	while (textIndex < text.length && text[textIndex] !== '.') digits.push(Number(text[textIndex++]));
	const firstFractionalDigit = digits.length;
	textIndex++;
	const indexAfterPrecision = textIndex + PRECISION;
	if (indexAfterPrecision >= text.length) return text;
	while (textIndex < indexAfterPrecision) digits.push(Number(text[textIndex++]));
	let digitsLength = digits.length;
	if (Number(text[textIndex]) >= 5) {
		while (digitsLength > 0) {
			const next = (digits[digitsLength - 1] ?? 0) + 1;
			digits[digitsLength - 1] = next;
			if (next !== 10) break;
			digitsLength--;
		}
	}
	// A carry past the decimal point leaves integer slots that must read as 0.
	while (digitsLength < firstFractionalDigit) digits[digitsLength++] = 0;
	while (digitsLength > firstFractionalDigit && digits[digitsLength - 1] === 0) digitsLength--;
	if (digitsLength === 2 && digits[0] === 0 && digits[1] === 0) return '0';
	let output = negative ? '-' : '';
	const start = digits[0] === 0 ? 1 : 0;
	output += digits.slice(start, firstFractionalDigit).join('');
	if (digitsLength > firstFractionalDigit) output += `.${digits.slice(firstFractionalDigit, digitsLength).join('')}`;
	return output;
}

export function formatNumber(value: number): string {
	if (!Number.isFinite(value)) throw new RangeError(`Cannot serialize non-finite number ${value}.`);
	const rounded = Math.round(value);
	if (Math.abs(value - rounded) < EPSILON) return removeExponent(String(rounded === 0 ? 0 : rounded));
	const text = removeExponent(String(value));
	if (text.length < PRECISION + 2) return text;
	return writeRounded(text);
}

const isHexDigit = (char: string | undefined): boolean => char !== undefined && /^[0-9a-fA-F]$/.test(char);

function isPrivateUse(codePoint: number): boolean {
	return (
		(codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
		(codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
		(codePoint >= 0x100000 && codePoint <= 0x10fffd)
	);
}

export function quoteString(value: string): string {
	const chars = Array.from(value);
	const hasDouble = chars.includes('"');
	const hasSingle = chars.includes("'");
	const quote = hasDouble && !hasSingle ? "'" : '"';
	let output = '';
	chars.forEach((char, index) => {
		const codePoint = char.codePointAt(0) ?? 0;
		if (char === quote) {
			output += `\\${char}`;
		} else if (char === '\\') {
			output += '\\\\';
		} else if (codePoint <= 0x1f || codePoint === 0x7f || isPrivateUse(codePoint)) {
			output += `\\${codePoint.toString(16)}`;
			const next = chars[index + 1];
			if (isHexDigit(next) || next === ' ' || next === '\t') output += ' ';
		} else {
			output += char;
		}
	});
	return quote + output + quote;
}
