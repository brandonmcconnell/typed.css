/**
 * A tiny pretty-printer: a group renders on one line when it fits, and
 * otherwise breaks with one item per indented line.
 */
export type Doc = string | Group | readonly Doc[];

export interface Group {
	readonly open: string;
	readonly close: string;
	readonly items: readonly Doc[];
	/** Placed between items; also after the last item when the group breaks and `trailing` is set. */
	readonly separator: string;
	readonly trailing?: boolean;
	/** Adds a space inside the brackets when rendered inline: `{ a: 1 }`. */
	readonly pad?: boolean;
	readonly forceBreak?: boolean;
}

const WIDTH = 72;
const INDENT = '  ';

export const group = (open: string, items: readonly Doc[], close: string, options: Omit<Group, 'open' | 'close' | 'items' | 'separator'> & { separator?: string } = {}): Group => ({
	open,
	close,
	items,
	separator: options.separator ?? ',',
	...(options.trailing === undefined ? {} : { trailing: options.trailing }),
	...(options.pad === undefined ? {} : { pad: options.pad }),
	...(options.forceBreak === undefined ? {} : { forceBreak: options.forceBreak }),
});

const isGroup = (doc: Doc): doc is Group => typeof doc === 'object' && !Array.isArray(doc);

function inline(doc: Doc): string | null {
	if (typeof doc === 'string') return doc.includes('\n') ? null : doc;
	if (!isGroup(doc)) {
		const parts = doc.map(inline);
		return parts.every((part): part is string => part !== null) ? parts.join('') : null;
	}
	if (doc.forceBreak) return null;
	const items = doc.items.map(inline);
	if (!items.every((item): item is string => item !== null)) return null;
	if (items.length === 0) return doc.open + doc.close;
	const pad = doc.pad ? ' ' : '';
	const separator = doc.separator === '' ? ' ' : `${doc.separator} `;
	return `${doc.open}${pad}${items.join(separator)}${pad}${doc.close}`;
}

export function render(doc: Doc, indent = '', column = indent.length): string {
	const flat = inline(doc);
	if (flat !== null && column + flat.length <= WIDTH) return flat;
	if (typeof doc === 'string') return doc.replaceAll('\n', `\n${indent}`);
	if (!isGroup(doc)) {
		let output = '';
		for (const part of doc) {
			const lastLine = output.slice(output.lastIndexOf('\n') + 1);
			output += render(part, indent, output.includes('\n') ? lastLine.length : column + output.length);
		}
		return output;
	}
	const inner = indent + INDENT;
	const lines = doc.items.map((item, index) => {
		const isLast = index === doc.items.length - 1;
		const separator = !isLast || doc.trailing ? doc.separator : '';
		return inner + render(item, inner) + separator;
	});
	return `${doc.open}\n${lines.join('\n')}\n${indent}${doc.close}`;
}

/** Formats a number the way the preprocessor examples write it: `.5`, `-.25`, `2`. */
export const shortNumber = (value: number): string => String(value).replace(/^(-?)0\./, '$1.');

/** Writes a CSS string literal; newlines become `\A` escapes. */
export function cssString(value: string, quote: '"' | "'" = '"'): string {
	let output = '';
	const chars = Array.from(value);
	chars.forEach((char, index) => {
		if (char === '\\') output += '\\\\';
		else if (char === quote) output += `\\${char}`;
		else if (char === '\n') output += /^[0-9a-fA-F \t]$/.test(chars[index + 1] ?? '') ? '\\A ' : '\\A';
		else output += char;
	});
	return quote + output + quote;
}
