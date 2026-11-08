import { isSpeedsTuple, type Styles, type TypedConfig, type TypedOptions, type TypedSpeedsInput, type TypedStringInput } from '@typed-css/core';
import { demoHtml, type Demo, type DemoRule } from '../demo-model.ts';
import { demoRuleToCSS, resolveSelector } from '../flatten.ts';
import { formatJS, jsKey, type JSValue } from './javascript.ts';
import { render } from './layout.ts';
import { lessCall, lessRule } from './less.ts';
import { scssCall, scssRule } from './scss.ts';
import { stylusCall, stylusRule } from './stylus.ts';

export const LANGUAGES = [
	{ id: 'scss', label: 'SCSS' },
	{ id: 'tailwind', label: 'Tailwind' },
	{ id: 'less', label: 'Less' },
	{ id: 'stylus', label: 'Stylus' },
	{ id: 'js', label: 'JavaScript' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export const isLanguageId = (value: string | null | undefined): value is LanguageId => LANGUAGES.some(language => language.id === value);

/** Prism grammar names. */
export type Grammar = 'scss' | 'less' | 'stylus' | 'javascript' | 'markup' | 'css' | 'bash';

export interface CodeBlock {
	readonly label: string;
	readonly grammar: Grammar;
	readonly code: string;
}

const stylesToJS = (styles: Styles): JSValue => ({ ...styles });

const stringToJS = (input: TypedStringInput): JSValue => (typeof input === 'string' ? input : { text: input.text, styles: input.styles ? stylesToJS(input.styles) : undefined });

function speedsToJS(speeds: TypedSpeedsInput): JSValue {
	if (typeof speeds === 'number') return speeds;
	if (isSpeedsTuple(speeds)) return speeds.map(value => value ?? null);
	return { ...speeds };
}

function optionsToJS(options: TypedOptions): JSValue {
	const { styles, endStyles, endOn, ...rest } = options;
	return {
		...rest,
		endOn: endOn === undefined || typeof endOn !== 'object' ? endOn : stringToJS(endOn),
		styles: styles ? stylesToJS(styles) : undefined,
		endStyles: endStyles ? stylesToJS(endStyles) : undefined,
	};
}

export function configToJS(config: TypedConfig): JSValue {
	return {
		strings: config.strings.map(stringToJS),
		speeds: config.speeds === undefined || config.speeds === null ? undefined : speedsToJS(config.speeds),
		options: config.options ? optionsToJS(config.options) : undefined,
	};
}

interface TypedTarget {
	readonly selector: string;
	readonly config: TypedConfig;
}

/** The selector the demo's typewriter is applied to, plus its other (non-typewriter) rules as CSS. */
function splitDemo(rule: DemoRule, parents: readonly string[] = []): { readonly target: TypedTarget | undefined; readonly extraCSS: string } {
	const selectors = resolveSelector(rule.selector, parents);
	const { typed, rules = [], ...declarationsOnly } = rule;
	let target: TypedTarget | undefined = typed ? { selector: selectors.join(', '), config: typed } : undefined;
	let extraCSS = demoRuleToCSS(declarationsOnly, parents);
	for (const child of rules) {
		const nested = splitDemo(child, selectors);
		target = nested.target ?? target;
		extraCSS += nested.extraCSS;
	}
	return { target, extraCSS };
}

const javascriptUsage = (config: TypedConfig, selector: string): string =>
	`import { typed, toCSS } from '@typed-css/core';\n\nconst css = toCSS(\n  typed(${formatJS(configToJS(config), '  ')}),\n  ${jsKeyString(selector)},\n);`;

const jsKeyString = (value: string): string => (value.includes("'") ? JSON.stringify(value) : `'${value}'`);

export function demoSnippets(demo: Demo, language: LanguageId): CodeBlock[] {
	const html: CodeBlock[] = demo.html ? [{ label: 'HTML', grammar: 'markup', code: demoHtml(demo) }] : [];
	switch (language) {
		case 'scss':
			return [...html, { label: 'SCSS', grammar: 'scss', code: scssRule(demo.root) }];
		case 'less':
			return [...html, { label: 'Less', grammar: 'less', code: lessRule(demo.root) }];
		case 'stylus':
			return [...html, { label: 'Stylus', grammar: 'stylus', code: stylusRule(demo.root) }];
		case 'tailwind': {
			const { target } = splitDemo(demo.root);
			const entry = target ? `${jsKey(demo.id)}: ${formatJS(configToJS(target.config))},` : '';
			return [
				{ label: 'theme.typed', grammar: 'javascript', code: `// tailwind.config.js → theme.typed\n${entry}` },
				{ label: 'HTML', grammar: 'markup', code: demo.tailwindHtml ?? demoHtml(demo) },
			];
		}
		case 'js': {
			const { target, extraCSS } = splitDemo(demo.root);
			const blocks: CodeBlock[] = [...html];
			if (target) blocks.push({ label: 'JavaScript', grammar: 'javascript', code: javascriptUsage(target.config, target.selector) });
			if (extraCSS) blocks.push({ label: 'CSS', grammar: 'css', code: extraCSS.trimEnd() });
			return blocks;
		}
	}
}

/** The snippet for a generator-built typewriter, in the chosen language. */
export function generatorSnippet(config: TypedConfig, selector: string, language: LanguageId): CodeBlock {
	switch (language) {
		case 'scss':
			return { label: 'SCSS', grammar: 'scss', code: `${selector} {\n  ${render(scssCall(config), '  ')}\n}` };
		case 'less':
			return { label: 'Less', grammar: 'less', code: `${selector} {\n  ${render(lessCall(config), '  ')}\n}` };
		case 'stylus':
			return { label: 'Stylus', grammar: 'stylus', code: `${selector}\n  ${render(stylusCall(config), '  ')}` };
		case 'tailwind': {
			const key = selector.replace(/^\.typed-/, '').replace(/^\./, '');
			return { label: 'theme.typed', grammar: 'javascript', code: `// tailwind.config.js → theme.typed, then use class="typed-${key}"\n${jsKey(key)}: ${formatJS(configToJS(config))},` };
		}
		case 'js':
			return { label: 'JavaScript', grammar: 'javascript', code: javascriptUsage(config, selector) };
	}
}

export function installSnippets(language: LanguageId): CodeBlock[] {
	switch (language) {
		case 'scss':
			return [{ label: 'SCSS', grammar: 'scss', code: "// Download typed.scss from the repository, then:\n@import 'typed';\n\n.headline {\n  @include typed(\"Hello\", \"World\");\n}" }];
		case 'tailwind':
			return [
				{ label: 'Terminal', grammar: 'bash', code: 'npm install @typed-css/tailwind' },
				{
					label: 'tailwind.config.js',
					grammar: 'javascript',
					code: "import typed from '@typed-css/tailwind';\n\nexport default {\n  theme: {\n    typed: {\n      headline: { strings: ['Hello', 'World'] },\n    },\n  },\n  plugins: [typed],\n};\n\n// Tailwind v4: load this config from your CSS with\n// @config \"./tailwind.config.js\";",
				},
				{ label: 'HTML', grammar: 'markup', code: '<h1 class="typed-headline"></h1>' },
			];
		case 'less':
			return [
				{ label: 'Terminal', grammar: 'bash', code: 'npm install @typed-css/less' },
				{ label: 'Less', grammar: 'less', code: '@plugin "@typed-css/less";\n\n.headline {\n  typed("Hello", "World");\n}' },
			];
		case 'stylus':
			return [
				{ label: 'Terminal', grammar: 'bash', code: 'npm install @typed-css/stylus' },
				{ label: 'JavaScript', grammar: 'javascript', code: "import stylus from 'stylus';\nimport typed from '@typed-css/stylus';\n\nstylus(source).use(typed()).render(callback);" },
				{ label: 'Stylus', grammar: 'stylus', code: '.headline\n  typed("Hello", "World")' },
			];
		case 'js':
			return [
				{ label: 'Terminal', grammar: 'bash', code: 'npm install @typed-css/core' },
				{ label: 'JavaScript', grammar: 'javascript', code: "import { typed, toCSS } from '@typed-css/core';\n\nconst css = toCSS(typed({ strings: ['Hello', 'World'] }), '.headline');" },
			];
	}
}
