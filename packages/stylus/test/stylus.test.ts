import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import stylus from 'stylus';
import { toCSS, typed, type TypedConfig } from '@typed-css/core';
import typedStylus from '../src/index.ts';
import { canonicalCSS } from '../../../test-utils/canonical-css.ts';

function renderStylus(source: string, options: { filename?: string } = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		stylus(source, options)
			.use(typedStylus())
			.render((error, css) => (error ? reject(error) : resolve(css)));
	});
}

interface Fixture {
	readonly title: string;
	readonly stylus: string;
	readonly config: TypedConfig;
}

const fixtures: readonly Fixture[] = [
	{ title: 'single string', stylus: `"I'm walking here!"`, config: { strings: ["I'm walking here!"] } },
	{
		title: 'speed list and options',
		stylus: `"Shaken", "Stirred", .1 null null 500ms, { caret: false, iterations: 3 }`,
		config: { strings: ['Shaken', 'Stirred'], speeds: [0.1, null, null, 0.5], options: { caret: false, iterations: 3 } },
	},
	{
		title: 'speed map, end-on, and caret styling',
		stylus: `"Here's lookin at you, kid", "I'll be back", { type: .05, pause-deleted: .5 }, { iterations: 2, end-on: "Done!", caret-width: 2px, caret-color: orange, caret-speed: .65 }`,
		config: {
			strings: ["Here's lookin at you, kid", "I'll be back"],
			speeds: { type: 0.05, pauseDeleted: 0.5 },
			options: { iterations: 2, endOn: 'Done!', caretWidth: '2px', caretColor: 'orange', caretSpeed: 0.65 },
		},
	},
	{
		title: 'per-string, end-on, and global styles',
		stylus: `{ text: "Red", color: #f00, font-family: unquote('"Times New Roman", arial') }, { text: "Plain" }, 2, { iterations: 1, styles: { letter-spacing: 1px }, end-on: { text: "Fin", color: #0f0 }, end-styles: { opacity: .5 } }`,
		config: {
			strings: [
				{ text: 'Red', styles: { color: '#f00', 'font-family': '"Times New Roman", arial' } },
				{ text: 'Plain', styles: {} },
			],
			speeds: 2,
			options: { iterations: 1, styles: { 'letter-spacing': '1px' }, endOn: { text: 'Fin', styles: { color: '#0f0' } }, endStyles: { opacity: '0.5' } },
		},
	},
	{
		title: 'pauses, line breaks, and quotes',
		stylus: `"Roads?<[15]> Where\\Awe're going", 'Say "cheese"'`,
		config: { strings: ["Roads?<[15]> Where\nwe're going", 'Say "cheese"'] },
	},
];

describe('Stylus typed() matches @typed-css/core', () => {
	for (const fixture of fixtures) {
		it(fixture.title, async () => {
			const result = typed(fixture.config);
			const actual = await renderStylus(`.hero\n  typed(${fixture.stylus})\n`);
			const expected = toCSS(result, '.hero');
			const rename = (css: string): string => css.replaceAll(/typed-[0-9a-z]+/g, 'animation');
			assert.equal(canonicalCSS(rename(actual)), canonicalCSS(rename(expected)));
		});
	}
});

describe('Stylus integration', () => {
	it('resolves & against nested selectors, selector lists, and media queries', async () => {
		const css = await renderStylus('@media (min-width: 1px)\n  .a, .b > c\n    color red\n    typed("Hi", null, { name: hi })\n');
		assert.match(css, /\.a::before,\s*\.b > c::before \{/);
		assert.match(css, /@keyframes hi \{\s+0%, 2\.9751904762% \{/);
		assert.doesNotMatch(css, /-webkit-keyframes/);
	});

	it('loads through use() in a .styl file', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'typed-stylus-'));
		const pluginPath = fileURLToPath(new URL('../plugin.cjs', import.meta.url));
		const file = join(directory, 'style.styl');
		const source = `use("${pluginPath}")\n.hero\n  typed("Hi", null, { name: hi })\n`;
		writeFileSync(file, source);
		const css = await new Promise<string>((resolve, reject) => stylus(source, { filename: file }).render((error, output) => (error ? reject(error) : resolve(output))));
		assert.match(css, /\.hero::before \{/);
		assert.match(css, /@keyframes hi-caret/);
	});

	it('reports invalid arguments as Stylus errors', async () => {
		await assert.rejects(renderStylus('.hero\n  typed(2)\n'), /requires at least one string/);
		await assert.rejects(renderStylus('.hero\n  typed("a", null, { bogus: 1 })\n'), /bogus is not a valid option/);
	});
});
