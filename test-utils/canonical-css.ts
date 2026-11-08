import postcss from 'postcss';

/**
 * Reduces CSS to its structure (rules, at-rules, declarations) so output from
 * different tools can be compared regardless of formatting differences such as
 * line breaks in selector lists or spacing around `/`.
 */
export function canonicalCSS(css: string): string {
	const lines: string[] = [];
	postcss.parse(css).walk(node => {
		if (node.type === 'rule') lines.push(`rule ${node.selector.split(',').map(part => part.trim()).join(', ')}`);
		else if (node.type === 'atrule') lines.push(`@${node.name} ${node.params}`);
		else if (node.type === 'decl') lines.push(`  ${node.prop}: ${node.value.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ')}`);
	});
	return lines.join('\n');
}

/** Renames animations in order of first appearance, so default names from different tools compare equal. */
export function normalizeAnimationNames(css: string, names: readonly string[]): string {
	return names.reduce((output, name, index) => output.replaceAll(name, `animation-${index}`), css);
}
