import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-stylus';
import 'prismjs/components/prism-bash';
import type { CodeBlock } from './snippets/index.ts';

/** Highlighting very large output (the raw CSS of long typewriters) would stall the page. */
const MAX_HIGHLIGHT_LENGTH = 40_000;

export async function copyText(text: string, button: HTMLButtonElement): Promise<void> {
	const label = button.innerHTML;
	try {
		await navigator.clipboard.writeText(text);
		button.innerHTML = '<i class="fa-solid fa-check"></i>Copied';
	} catch {
		button.innerHTML = '<i class="fa-solid fa-xmark"></i>Copy failed';
	}
	window.setTimeout(() => (button.innerHTML = label), 1500);
}

export function createCodeBlock(block: CodeBlock): HTMLElement {
	const wrapper = document.createElement('pre-wrap');
	wrapper.dataset['lang'] = block.label;
	const pre = document.createElement('pre');
	pre.tabIndex = -1;
	const code = document.createElement('code');
	code.className = `language-${block.grammar}`;
	code.textContent = block.code;
	if (block.code.length <= MAX_HIGHLIGHT_LENGTH) Prism.highlightElement(code);
	pre.append(code);

	const copy = document.createElement('button');
	copy.type = 'button';
	copy.className = 'copy-button';
	copy.innerHTML = '<i class="fa-solid fa-copy"></i>Copy';
	copy.setAttribute('aria-label', `Copy ${block.label} code`);
	copy.addEventListener('click', () => void copyText(block.code, copy));

	wrapper.append(pre, copy);
	return wrapper;
}

export function replaceCodeBlocks(container: Element, blocks: readonly CodeBlock[]): void {
	container.replaceChildren(...blocks.map(createCodeBlock));
}
