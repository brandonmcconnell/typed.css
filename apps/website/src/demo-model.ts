import type { TypedConfig } from '@typed-css/core';

export type StyleDeclaration = readonly [property: string, value: string];

/**
 * A style rule in a demo. Selectors are relative to the parent rule, written
 * the way they'd be nested in SCSS/Less/Stylus (`&::before`, `> input`).
 */
export interface DemoRule {
	readonly selector: string;
	readonly declarations?: readonly StyleDeclaration[];
	readonly rules?: readonly DemoRule[];
	/** The typewriter applied to this rule's element, emitted after its declarations and child rules. */
	readonly typed?: TypedConfig;
}

export interface Demo {
	/** Becomes the `typed-<id>` class and the Tailwind `theme.typed` key. */
	readonly id: string;
	/** Heading HTML. */
	readonly title: string;
	readonly root: DemoRule;
	/** Markup rendered inside the demo, and shown as the HTML snippet. Defaults to `<p class="typed-<id>"></p>`. */
	readonly html?: string;
	/** Markup for the Tailwind snippet, expressing the demo's extra styles as utility classes. */
	readonly tailwindHtml?: string;
	/** Text that sizes the demo box to its tallest state while it animates. */
	readonly sizer?: string;
}

export const demoClass = (demo: Pick<Demo, 'id'>): string => `typed-${demo.id}`;

export const demoHtml = (demo: Demo): string => demo.html ?? `<p class="${demoClass(demo)}"></p>`;

/** The demo's typewriter config, found on whichever rule applies it. */
export function findTyped(rule: DemoRule): TypedConfig | undefined {
	return rule.typed ?? rule.rules?.map(findTyped).find(config => config !== undefined);
}
