import colorNames from 'color-name';
import postcss, { type ChildNode, type Container } from 'postcss';

export interface CanonicalOptions {
	/** Rename animations by order of first appearance, so differing default names compare equal. */
	readonly renameAnimations?: boolean;
	/** Write named and short hex colors as `#rrggbb`, as some tools (Stylus) rewrite colors. */
	readonly normalizeColors?: boolean;
	/** Ignore the order of top-level blocks (e.g. Tailwind groups keyframes after rules). */
	readonly sortBlocks?: boolean;
}

const toHex = (channels: readonly number[]): string => `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;

const isColorName = (name: string): name is keyof typeof colorNames => Object.hasOwn(colorNames, name);

function normalizeColorsOutsideStrings(value: string): string {
	return value
		.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)
		.map((part, index) => {
			if (index % 2 === 1) return part;
			return part
				.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/gi, (_match, r: string, g: string, b: string) => `#${r}${r}${g}${g}${b}${b}`)
				.replace(/#[0-9a-f]{6}\b/gi, hex => hex.toLowerCase())
				.replace(/(?<![\w#-])[a-z]+(?![\w(-])/gi, word => {
					const name = word.toLowerCase();
					return isColorName(name) ? toHex(colorNames[name]) : word;
				});
		})
		.join('');
}

function collectAnimationNames(root: Container): string[] {
	const keyframes = new Set<string>();
	root.walkAtRules('keyframes', rule => {
		keyframes.add(rule.params.trim());
	});
	const ordered: string[] = [];
	const visit = (name: string): void => {
		if (keyframes.has(name) && !ordered.includes(name)) ordered.push(name);
	};
	root.walkDecls(/^animation(-name)?$/, decl => decl.value.split(/[\s,]+/).forEach(visit));
	keyframes.forEach(visit);
	return ordered;
}

/**
 * Reduces CSS to its structure (rules, at-rules, declarations) so output from
 * different tools can be compared regardless of formatting differences such as
 * line breaks in selector lists or spacing around `/`.
 */
export function canonicalCSS(css: string, options: CanonicalOptions = {}): string {
	const root = postcss.parse(css);
	const names = options.renameAnimations ? collectAnimationNames(root) : [];
	const rename = (value: string): string => value.replace(/[\w-]+/g, token => (names.includes(token) ? `animation-${names.indexOf(token)}` : token));
	const normalizeValue = (property: string, raw: string): string => {
		let value = raw.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
		if (/^animation(-name)?$/.test(property)) value = rename(value);
		return options.normalizeColors ? normalizeColorsOutsideStrings(value) : value;
	};
	const serialize = (node: ChildNode, depth: number): string => {
		const indent = '  '.repeat(depth);
		if (node.type === 'decl') return `${indent}${node.prop}: ${normalizeValue(node.prop, node.value)}`;
		if (node.type === 'comment') return '';
		const header =
			node.type === 'rule'
				? `rule ${node.selector.split(',').map(part => part.trim()).join(', ')}`
				: `@${node.name} ${node.name === 'keyframes' ? rename(node.params.trim()) : node.params}`;
		const children: string[] = [];
		for (const child of node.nodes ?? []) {
			const line = serialize(child, depth + 1);
			if (line !== '' && children[children.length - 1] !== line) children.push(line);
		}
		return [`${indent}${header}`, ...children].join('\n');
	};
	const blocks = root.nodes.map(node => serialize(node, 0)).filter(block => block !== '');
	return (options.sortBlocks ? blocks.sort() : blocks).join('\n');
}
