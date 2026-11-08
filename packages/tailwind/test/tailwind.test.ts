import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import postcss from 'postcss';
import { compile } from 'tailwindcss';
import tailwindV3 from 'tailwindcss-v3';
import typedPlugin, { type TypedComponents } from '../src/index.ts';

const typewriters: TypedComponents = {
	hero: { strings: ['Hello', 'World'], speeds: 2, options: { caretWidth: '2px' } },
	once: { strings: ['Ready'], options: { iterations: 1, endOn: 'Go!', caret: false } },
};

function assertTypewriterCSS(css: string): void {
	assert.match(css, /\.typed-hero::before\s*\{[^}]*animation: typed-hero 3\.9s linear 1s infinite forwards/);
	assert.match(css, /\.typed-hero::after\s*\{[^}]*border-right: 2px solid currentColor/);
	assert.match(css, /@keyframes typed-hero\s*\{/);
	assert.match(css, /@keyframes typed-hero-caret\s*\{/);
	assert.match(css, /content: "\u200bHello"\/"Hello"/);
	assert.match(css, /@keyframes typed-once-final\s*\{/);
	assert.doesNotMatch(css, /\.typed-once::after/);
}

describe('Tailwind CSS v4', () => {
	it('generates components registered with @plugin', async () => {
		const compiler = await compile('@plugin "@typed-css/tailwind";\n@tailwind utilities;', {
			loadModule: async () => ({ path: '', base: '/', module: typedPlugin(typewriters) }),
		});
		const css = compiler.build(['typed-hero', 'typed-once']);
		assertTypewriterCSS(css);
	});
});

describe('Tailwind CSS v3', () => {
	it('generates components from plugin options', async () => {
		const result = await postcss([
			tailwindV3({ content: [{ raw: '<p class="typed-hero typed-once"></p>' }], corePlugins: { preflight: false }, plugins: [typedPlugin(typewriters)] }),
		]).process('@tailwind components;', { from: undefined });
		assertTypewriterCSS(result.css);
	});

	it('generates components from theme.typed', async () => {
		const result = await postcss([
			tailwindV3({ content: [{ raw: '<p class="typed-hero typed-once"></p>' }], corePlugins: { preflight: false }, theme: { typed: typewriters }, plugins: [typedPlugin] }),
		]).process('@tailwind components;', { from: undefined });
		assertTypewriterCSS(result.css);
	});

	it('only emits rules for typewriter classes that are used', async () => {
		const result = await postcss([
			tailwindV3({ content: [{ raw: '<p class="typed-hero"></p>' }], corePlugins: { preflight: false }, plugins: [typedPlugin(typewriters)] }),
		]).process('@tailwind components;', { from: undefined });
		assert.match(result.css, /\.typed-hero::before/);
		assert.doesNotMatch(result.css, /\.typed-once/);
	});

	it('rejects a malformed theme.typed', async () => {
		const run = postcss([
			tailwindV3({ content: [{ raw: '<p class="typed-hero"></p>' }], corePlugins: { preflight: false }, theme: { typed: { hero: 'Hello' } }, plugins: [typedPlugin] }),
		]).process('@tailwind components;', { from: undefined });
		await assert.rejects(run, /theme\.typed must map names to typewriter configs/);
	});
});
