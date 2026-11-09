import { replaceCodeBlocks } from './code-block.ts';
import { demoHtml, type Demo } from './demo-model.ts';
import { demoSnippets, type LanguageId } from './snippets/index.ts';

/** Builds a `<live-demo>` with a restart button that replays its animations. */
export function createLiveDemo(html: string, sizer?: string): HTMLElement {
	const demo = document.createElement('live-demo');
	demo.innerHTML = html;
	if (sizer) {
		const sizerElement = document.createElement('demo-sizer');
		sizerElement.setAttribute('aria-hidden', 'true');
		sizerElement.innerHTML = sizer;
		demo.append(sizerElement);
	}
	const restart = document.createElement('button');
	restart.type = 'button';
	restart.className = 'restart-button';
	restart.setAttribute('aria-label', 'Restart demo');
	restart.innerHTML = '<i class="fas fa-redo" aria-hidden="true"></i>';
	restart.addEventListener('click', () => restartDemo(demo));
	demo.append(restart);
	return demo;
}

export function restartDemo(demo: HTMLElement): void {
	demo.querySelector('.restart-button')?.classList.remove('visible');
	demo.classList.add('restarting');
	// Reading layout flushes the `animation: none` state so the animations start over.
	void demo.offsetWidth;
	demo.classList.remove('restarting');
}

/** Keeps each demo as tall as its sizer text, so the page doesn't jump while strings type and delete. */
export function sizeDemos(root: ParentNode = document): void {
	for (const sizer of root.querySelectorAll<HTMLElement>('live-demo > demo-sizer')) {
		const demo = sizer.parentElement;
		if (demo) demo.style.minHeight = `${sizer.offsetHeight}px`;
	}
}

/** Shows a demo's restart button once its (finite) animation completes. */
export function watchAnimationEnds(): void {
	document.addEventListener('animationend', event => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		target.closest('live-demo')?.querySelector('.restart-button')?.classList.add('visible');
	});
}

export function renderExamples(container: HTMLElement, demos: readonly Demo[], language: LanguageId): (language: LanguageId) => void {
	const snippetContainers = demos.map(demo => {
		const heading = document.createElement('p');
		heading.className = 'example-heading';
		heading.innerHTML = demo.title;
		const snippets = document.createElement('div');
		snippets.className = 'example-snippets';
		container.append(heading, snippets, createLiveDemo(demoHtml(demo), demo.sizer));
		return { demo, snippets };
	});
	const update = (next: LanguageId): void => {
		for (const { demo, snippets } of snippetContainers) replaceCodeBlocks(snippets, demoSnippets(demo, next));
	};
	update(language);
	return update;
}
