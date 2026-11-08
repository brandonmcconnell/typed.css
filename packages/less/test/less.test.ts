import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import less from 'less';
import { toCSS, typed, type TypedConfig } from '@typed-css/core';
import typedLess from '../src/index.ts';
import { canonicalCSS as canonical } from '../../../test-utils/canonical-css.ts';

async function renderLess(source: string): Promise<string> {
	return (await less.render(source, { plugins: [typedLess] })).css;
}

interface Fixture {
	readonly title: string;
	readonly less: string;
	readonly config: TypedConfig;
}

const fixtures: readonly Fixture[] = [
	{ title: 'single string', less: `"I'm walking here!"`, config: { strings: ["I'm walking here!"] } },
	{
		title: 'speed list and options',
		less: `"Shaken", "Stirred"; .1 null null .5; { caret: false; iterations: 3; name: shaken; }`,
		config: { strings: ['Shaken', 'Stirred'], speeds: [0.1, null, null, 0.5], options: { caret: false, iterations: 3, name: 'shaken' } },
	},
	{
		title: 'speed map, end-on, and caret styling',
		less: `"Here's lookin at you, kid", "I'll be back", { type: .05; pause-deleted: 500ms; }, { iterations: 2; end-on: "Done!"; caret-width: 2px; caret-color: orange; caret-speed: .65; }`,
		config: {
			strings: ["Here's lookin at you, kid", "I'll be back"],
			speeds: { type: 0.05, pauseDeleted: 0.5 },
			options: { iterations: 2, endOn: 'Done!', caretWidth: '2px', caretColor: 'orange', caretSpeed: 0.65 },
		},
	},
	{
		title: 'per-string, end-on, and global styles',
		less: `{ text: "Red"; color: #f00; font-family: "Times New Roman", arial; }, { text: "Plain"; }, 2, {
			iterations: 1;
			styles { letter-spacing: 1px; }
			end-on { text: "Fin"; color: #0f0; }
			end-styles { opacity: .5; }
		}`,
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
		title: 'pauses, line breaks, and escapes',
		less: `"Roads?<[15]> Where\\Awe're going", "Say \\"cheese\\""`,
		config: { strings: ["Roads?<[15]> Where\nwe're going", 'Say "cheese"'] },
	},
];

describe('Less typed() matches @typed-css/core', () => {
	for (const fixture of fixtures) {
		it(fixture.title, async () => {
			const name = 'less-fixture';
			const result = typed({ ...fixture.config, options: { name, ...fixture.config.options } });
			const actual = await renderLess(`.hero { typed(${fixture.less}); }`);
			const expected = toCSS(result, '.hero');
			assert.equal(canonical(actual.replace(/typed-[0-9a-z]+/g, name)), canonical(expected.replace(/typed-[0-9a-z]+/g, name)));
		});
	}
});

describe('Less integration', () => {
	it('resolves & against nested selectors, selector lists, and media queries', async () => {
		const css = await renderLess(`@media (min-width: 1px) { .a, .b > c { color: red; typed("Hi", null, { name: hi; }); } }`);
		assert.match(css, /@media \(min-width: 1px\) \{\s+\.a,\s+\.b > c \{\s+color: red;/);
		assert.match(css, /\.a::before,\s+\.b > c::before \{/);
		assert.match(css, /@keyframes hi \{\s+0%,\s+2\.9751904762% \{/);
		assert.doesNotMatch(css, /\.a 0%/);
	});

	it('loads through @plugin in a .less file', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'typed-less-'));
		const pluginPath = fileURLToPath(new URL('../plugin.cjs', import.meta.url));
		const file = join(directory, 'style.less');
		writeFileSync(file, `@plugin "${pluginPath}";\n.hero { typed("Hi", null, { name: hi; }); }`);
		const { css } = await less.render(`@import "${file}";`, { filename: join(directory, 'entry.less') });
		assert.match(css, /\.hero::before \{/);
		assert.match(css, /@keyframes hi-caret/);
	});

	it('reports invalid arguments as Less errors', async () => {
		await assert.rejects(renderLess(`.hero { typed(2); }`), /requires at least one string/);
		await assert.rejects(renderLess(`.hero { typed("a", null, { bogus: 1; }); }`), /bogus is not a valid option/);
	});
});
