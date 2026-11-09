import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import less from 'less';
import * as sass from 'sass';
import stylus from 'stylus';
import { compile } from 'tailwindcss';
import { toCSS, typed } from '@typed-css/core';
import typedLess from '@typed-css/less';
import typedStylus from '@typed-css/stylus';
import typedTailwind from '@typed-css/tailwind';
import { canonicalCSS } from '../../../test-utils/canonical-css.ts';
import { demoClass, findTyped, type Demo } from '../src/demo-model.ts';
import { demos } from '../src/demos.ts';
import { demoRuleToCSS } from '../src/flatten.ts';
import { configToJS, demoSnippets, LANGUAGES, type LanguageId } from '../src/snippets/index.ts';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const compare = (css: string): string => canonicalCSS(css, { renameAnimations: true, normalizeColors: true, sortBlocks: true });

function snippet(demo: Demo, language: LanguageId, label: string): string {
	const block = demoSnippets(demo, language).find(candidate => candidate.label === label);
	if (!block) throw new Error(`No ${label} snippet for ${demo.id} in ${language}.`);
	return block.code;
}

const renderStylus = (source: string): Promise<string> =>
	new Promise((resolve, reject) => {
		stylus(source)
			.use(typedStylus())
			.render((error, css) => (error ? reject(error) : resolve(css)));
	});

const compilers: Readonly<Record<'scss' | 'less' | 'stylus', (demo: Demo) => Promise<string>>> = {
	scss: async demo => sass.compileString(`@import 'typed';\n${snippet(demo, 'scss', 'SCSS')}`, { loadPaths: [repoRoot], logger: sass.Logger.silent }).css,
	less: async demo => (await less.render(snippet(demo, 'less', 'Less'), { plugins: [typedLess] })).css,
	stylus: demo => renderStylus(snippet(demo, 'stylus', 'Stylus')),
};

describe('every demo snippet compiles to the CSS the live demo runs', () => {
	for (const demo of demos) {
		const expected = compare(demoRuleToCSS(demo.root));
		for (const [language, compileSnippet] of Object.entries(compilers)) {
			it(`${demo.id} (${language})`, async () => {
				assert.equal(compare(await compileSnippet(demo)), expected);
			});
		}

		it(`${demo.id} (tailwind)`, async () => {
			const config = findTyped(demo.root);
			assert.ok(config);
			const entry = snippet(demo, 'tailwind', 'theme.typed');
			const evaluated: unknown = new Function(`return {${entry.replace(/^\/\/.*\n/, '')}}`)();
			assert.deepEqual(evaluated, JSON.parse(JSON.stringify({ [demo.id]: configToJS(config) })));
			const compiler = await compile('@plugin "@typed-css/tailwind";\n@tailwind utilities;', {
				loadModule: async () => ({ path: '', base: '/', module: typedTailwind({ [demo.id]: config }) }),
			});
			const css = compiler.build([demoClass(demo)]);
			assert.equal(compare(css), compare(toCSS(typed(config), `.${demoClass(demo)}`)));
			assert.match(snippet(demo, 'tailwind', 'HTML'), new RegExp(`class="${demoClass(demo)}[ "]`));
		});

		it(`${demo.id} (js)`, () => {
			const config = findTyped(demo.root);
			assert.ok(config);
			const code = snippet(demo, 'js', 'JavaScript').replace(/^import .*\n/, '');
			const css: unknown = new Function('typed', 'toCSS', `${code}\nreturn css;`)(typed, toCSS);
			assert.equal(typeof css, 'string');
			assert.ok(typeof css === 'string' && demoRuleToCSS(demo.root).includes(css));
		});
	}

	it('covers every language in the switcher', () => {
		assert.deepEqual(
			LANGUAGES.map(language => language.id),
			['scss', 'tailwind', 'less', 'stylus', 'js'],
		);
	});
});
