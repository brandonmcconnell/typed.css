import { group, render, type Doc } from './layout.ts';

/** Plain data that can be written as a JavaScript literal. */
export type JSValue = string | number | boolean | null | readonly JSValue[] | { readonly [key: string]: JSValue | undefined };

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][\w$]*$/.test(key);

export function jsString(value: string): string {
	const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
	return quote + value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`).replaceAll('\n', '\\n') + quote;
}

export const jsKey = (key: string): string => (isIdentifier(key) ? key : jsString(key));

export function jsDoc(value: JSValue): Doc {
	if (value === null) return 'null';
	if (typeof value === 'string') return jsString(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (isList(value)) return group('[', value.map(jsDoc), ']', { trailing: true });
	const entries = Object.entries(value).filter((entry): entry is [string, JSValue] => entry[1] !== undefined);
	return group('{', entries.map(([key, entry]) => [`${jsKey(key)}: `, jsDoc(entry)]), '}', { trailing: true, pad: true });
}

function isList(value: readonly JSValue[] | { readonly [key: string]: JSValue | undefined }): value is readonly JSValue[] {
	return Array.isArray(value);
}

export const formatJS = (value: JSValue, indent = ''): string => render(jsDoc(value), indent);
