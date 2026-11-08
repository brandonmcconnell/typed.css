import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import * as sass from 'sass';
import { toCSS, typed, type TypedConfig } from '../src/index.ts';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function compileScss(args: string, selector: string): string {
	const source = `@import 'typed';\n${selector} { @include typed(${args}); }`;
	return sass.compileString(source, { loadPaths: [repoRoot], logger: sass.Logger.silent }).css;
}

interface Fixture {
	readonly title: string;
	readonly scss: string;
	readonly config: TypedConfig;
	readonly selector?: string;
}

const fixtures: readonly Fixture[] = [
	{
		title: 'single string',
		scss: `"I'm walking here!", null, (name: "a")`,
		config: { strings: ["I'm walking here!"], options: { name: 'a' } },
	},
	{
		title: 'multiple strings',
		scss: `"There's a snake in my boot 🐍", "To infinity and beyond 🚀", null, (name: "a")`,
		config: { strings: ["There's a snake in my boot 🐍", 'To infinity and beyond 🚀'], options: { name: 'a' } },
	},
	{
		title: 'speeds as a list with gaps',
		scss: `"You had me at hello", [.1, null, null, .5], (name: "a")`,
		config: { strings: ['You had me at hello'], speeds: [0.1, null, null, 0.5], options: { name: 'a' } },
	},
	{
		title: 'speeds as a map',
		scss: `"You had me at hello", (type: .13, pause-deleted: .5), (name: "a")`,
		config: { strings: ['You had me at hello'], speeds: { type: 0.13, pauseDeleted: 0.5 }, options: { name: 'a' } },
	},
	{
		title: 'speed multiplier without caret',
		scss: `"Dumb", "Dumber", "Dumbest", 2, (caret: false, name: "a")`,
		config: { strings: ['Dumb', 'Dumber', 'Dumbest'], speeds: 2, options: { caret: false, name: 'a' } },
	},
	{
		title: 'non-terminating speed multiplier',
		scss: `"Shaken, not stirred", "Stirred, not shaken", 1.7, (name: "a")`,
		config: { strings: ['Shaken, not stirred', 'Stirred, not shaken'], speeds: 1.7, options: { name: 'a' } },
	},
	{
		title: 'finite iterations ending on the first string',
		scss: `"Shaken, not stirred", "Stirred, not shaken", null, (caret: false, iterations: 3, name: "a")`,
		config: { strings: ['Shaken, not stirred', 'Stirred, not shaken'], options: { caret: false, iterations: 3, name: 'a' } },
	},
	{
		title: 'finite iterations ending on a custom string',
		scss: `"Here's lookin at you, kid", "I'll be back", 2, (iterations: 2, end-on: "Done!", name: "a")`,
		config: { strings: ["Here's lookin at you, kid", "I'll be back"], speeds: 2, options: { iterations: 2, endOn: 'Done!', name: 'a' } },
	},
	{
		title: 'end-on by index',
		scss: `"One", "Two", "Three", null, (iterations: 1, end-on: 3, name: "a")`,
		config: { strings: ['One', 'Two', 'Three'], options: { iterations: 1, endOn: 3, name: 'a' } },
	},
	{
		title: 'character-timed pauses',
		scss: `"Roads?<[15]> Where we're going, we don't need roads", 2, (name: "a")`,
		config: { strings: ["Roads?<[15]> Where we're going, we don't need roads"], speeds: 2, options: { name: 'a' } },
	},
	{
		title: 'directional pauses',
		scss: `"Be right <[_3]>there<[2_]>.<[_4_]>", "Now<[3]>!", null, (type-pausing-default: "both", name: "a")`,
		config: { strings: ['Be right <[_3]>there<[2_]>.<[_4_]>', 'Now<[3]>!'], options: { typePausingDefault: 'both', name: 'a' } },
	},
	{
		title: 'pauses disabled',
		scss: `"Wait <[3]>for it", null, (type-pausing: false, name: "a")`,
		config: { strings: ['Wait <[3]>for it'], options: { typePausing: false, name: 'a' } },
	},
	{
		title: 'caret customization and a nested target',
		selector: '.time-of-day',
		scss: `"day", "night", "morning", 2, (caret-width: 2px, caret-space: 2px, caret-color: orange, caret-speed: .65, delay: 0, name: "a")`,
		config: {
			strings: ['day', 'night', 'morning'],
			speeds: 2,
			options: { caretWidth: '2px', caretSpace: '2px', caretColor: 'orange', caretSpeed: 0.65, delay: 0, name: 'a' },
		},
	},
	{
		title: 'per-string styles',
		scss: `("Red": (color: red), "Orange": (color: darkorange), "Yellow": (color: gold), "Plain": ()), 2, (caret-width: 2px, name: "a")`,
		config: {
			strings: [
				{ text: 'Red', styles: { color: 'red' } },
				{ text: 'Orange', styles: { color: 'darkorange' } },
				{ text: 'Yellow', styles: { color: 'gold' } },
				{ text: 'Plain', styles: {} },
			],
			speeds: 2,
			options: { caretWidth: '2px', name: 'a' },
		},
	},
	{
		title: 'per-string, global, end-on, and end styles together',
		scss: `(
			"I'll have what she's having": (font-family: ("Times New Roman", arial), color: blue),
			"I am serious, and don't call me Shirley": (font-family: (consolas, monospace), font-weight: 700, background-color: black, color: lime),
			"You ain't heard nothin yet": ()
		), [null, .8, .01], (
			iterations: 1,
			end-on: ("May the force be with you": (background-blend-mode: hard-light, color: red, font-size: 120%)),
			styles: (letter-spacing: 1px),
			end-styles: (opacity: .5),
			caret-speed: .65, caret-width: 2px, caret-color: orange, caret-space: 1px,
			name: "a"
		)`,
		config: {
			strings: [
				{ text: "I'll have what she's having", styles: { 'font-family': '"Times New Roman", arial', color: 'blue' } },
				{ text: "I am serious, and don't call me Shirley", styles: { 'font-family': 'consolas, monospace', 'font-weight': 700, 'background-color': 'black', color: 'lime' } },
				{ text: "You ain't heard nothin yet", styles: {} },
			],
			speeds: [null, 0.8, 0.01],
			options: {
				iterations: 1,
				endOn: { text: 'May the force be with you', styles: { 'background-blend-mode': 'hard-light', color: 'red', 'font-size': '120%' } },
				styles: { 'letter-spacing': '1px' },
				endStyles: { opacity: 0.5 },
				caretSpeed: 0.65,
				caretWidth: '2px',
				caretColor: 'orange',
				caretSpace: '1px',
				name: 'a',
			},
		},
	},
	{
		title: 'multi-line strings, quotes, and emoji',
		scss: `"Hey babe! 😘\\AStuck at the office 🤤", "Say \\"cheese\\"", "It's \\"both\\"", [.5, 3, .01], (name: "a")`,
		config: { strings: ['Hey babe! 😘\nStuck at the office 🤤', 'Say "cheese"', 'It\'s "both"'], speeds: [0.5, 3, 0.01], options: { name: 'a' } },
	},
	{
		title: 'prefix and alt text',
		scss: `"cats", "dogs", null, (prefix: "I love ", alt-text: "I love pets", name: "a")`,
		config: { strings: ['cats', 'dogs'], options: { prefix: 'I love ', altText: 'I love pets', name: 'a' } },
	},
	{
		title: 'selector lists',
		selector: '.a, .b > span',
		scss: `"Hi", null, (name: "a")`,
		config: { strings: ['Hi'], options: { name: 'a' } },
	},
];

describe('JS core matches the SCSS mixin output', () => {
	for (const fixture of fixtures) {
		it(fixture.title, () => {
			const selector = fixture.selector ?? '.demo';
			const expected = compileScss(fixture.scss, selector);
			const actual = toCSS(typed(fixture.config), selector, { charset: true }).trimEnd();
			assert.equal(actual, expected);
		});
	}
});
