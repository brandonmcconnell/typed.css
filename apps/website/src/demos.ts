import type { TypedConfig } from '@typed-css/core';
import type { Demo } from './demo-model.ts';

export const demos: readonly Demo[] = [
	{
		id: 'walking',
		title: '<strong>Type a single string</strong>',
		root: { selector: '.typed-walking', typed: { strings: ["I'm walking here!"] } },
	},
	{
		id: 'snake',
		title: '<strong>Type two strings</strong>',
		root: { selector: '.typed-snake', typed: { strings: ["There's a snake in my boot 🐍", 'To infinity and beyond 🚀'] } },
		sizer: "There's a snake in my boot 🐍",
	},
	{
		id: 'hello',
		title: '<strong>Type one string, adjusting the speed of <code>type</code> and <code>pause-deleted</code></strong> (unset speeds keep their defaults)',
		root: { selector: '.typed-hello', typed: { strings: ['You had me at hello'], speeds: [0.1, null, null, 0.5] } },
		sizer: 'You had me at hello',
	},
	{
		id: 'dumb',
		title: '<strong>Type three strings, double the default speed, disable the caret</strong>',
		root: { selector: '.typed-dumb', typed: { strings: ['Dumb', 'Dumber', 'Dumbest'], speeds: 2, options: { caret: false } } },
	},
	{
		id: 'shaken',
		title: '<strong>Type two strings with the default speed, disable the caret, iterate three times and end on the original string</strong>',
		root: { selector: '.typed-shaken', typed: { strings: ['Shaken, not stirred', 'Stirred, not shaken'], options: { caret: false, iterations: 3 } } },
	},
	{
		id: 'lookin',
		title: '<strong>Type two strings, iterate twice, then end on a custom string</strong>',
		root: { selector: '.typed-lookin', typed: { strings: ["Here's lookin at you, kid", "I'll be back"], speeds: 2, options: { iterations: 2, endOn: 'Done!' } } },
		sizer: "Here's lookin at you, kid",
	},
	{
		id: 'phone-home',
		title: '<strong>Type two strings with a custom animation name</strong> (inspect this demo to see <code>my-typewriter</code> in the CSS)',
		root: { selector: '.typed-phone-home', typed: { strings: ['E.T. phone home', 'You talkin to me?'], options: { name: 'my-typewriter' } } },
	},
	{
		id: 'houston',
		title: '<strong>Color a typewriter, including the blinking caret</strong> (it inherits the text color through <code>currentColor</code>)',
		root: {
			selector: '.typed-houston',
			declarations: [['color', '#f00']],
			typed: { strings: ['Houston, we have a problem', "You can't handle the truth"] },
		},
		tailwindHtml: '<p class="typed-houston text-[#f00]"></p>',
		sizer: 'Houston, we have a problem',
	},
	{
		id: 'roads',
		title: '<strong>Add a character-timed pause</strong> (<code>&lt;[15]&gt;</code> pauses for as long as typing 15 characters takes)',
		root: { selector: '.typed-roads', typed: { strings: ["Roads?<[15]> Where we're going, we don't need roads"], speeds: 2 } },
		sizer: "Roads? Where we're going, we don't need roads",
	},
	{
		id: 'time-of-day',
		title: '<strong>Type mid-sentence by targeting a nested span</strong>',
		html: '<p>Go ahead, make my <span class="typed-time-of-day"></span>!</p>',
		tailwindHtml: '<p>Go ahead, make my <span class="typed-time-of-day bg-[lightsalmon] pl-[3px] before:font-semibold"></span>!</p>',
		root: {
			selector: '.typed-time-of-day',
			declarations: [
				['padding', '0 0 0 3px'],
				['background-color', 'lightsalmon'],
			],
			rules: [{ selector: '&::before', declarations: [['font-weight', '600']] }],
			typed: { strings: ['day', 'night', 'morning'], speeds: 2, options: { caretWidth: '2px', caretSpace: '2px' } },
		},
		sizer: 'Go ahead, make my morning&nbsp;',
	},
	{
		id: 'placeholder',
		title: '<strong>Use a typewriter as an input placeholder</strong> (click the animated text to focus the input and watch the placeholder vanish)',
		html: '<div class="input-wrapper"><input aria-label="Ask us anything"><span class="typed-placeholder"></span></div>',
		tailwindHtml: [
			'<div class="relative block h-6 w-full">',
			'  <input aria-label="Ask us anything" class="peer absolute inset-0 appearance-none border-0 bg-transparent">',
			'  <span class="typed-placeholder pointer-events-none absolute inset-0 before:font-semibold peer-focus:hidden"></span>',
			'</div>',
		].join('\n'),
		root: {
			selector: '.input-wrapper',
			declarations: [
				['display', 'block'],
				['width', '100%'],
				['height', '24px'],
				['position', 'relative'],
			],
			rules: [
				{
					selector: '> input, > .typed-placeholder',
					declarations: [
						['display', 'block'],
						['appearance', 'none'],
						['position', 'absolute'],
						['left', '0'],
						['top', '0'],
						['width', '100%'],
						['height', '100%'],
						['background-color', 'transparent'],
						['border', 'none'],
					],
				},
				{
					selector: '> .typed-placeholder',
					declarations: [['pointer-events', 'none']],
					rules: [{ selector: '&::before', declarations: [['font-weight', '600']] }],
					typed: {
						strings: ['How high is Mount Everest?', 'How many stars are there?', 'What is the best career for me?'],
						speeds: 1.5,
						options: { caretWidth: '2px', caretSpace: '2px' },
					},
				},
				{ selector: '> input:focus + .typed-placeholder', declarations: [['display', 'none']] },
			],
		},
	},
	{
		id: 'rainbow',
		title: '<strong>Style each string</strong> by giving it its own declarations',
		tailwindHtml: '<p class="typed-rainbow before:font-semibold before:[text-shadow:1px_2px_6px_rgba(255,255,255,.75),1px_2px_4px_currentColor]"></p>',
		root: {
			selector: '.typed-rainbow',
			rules: [
				{
					selector: '&::before',
					declarations: [
						['font-weight', '600'],
						['text-shadow', '1px 2px 6px rgba(255, 255, 255, .75), 1px 2px 4px currentColor'],
					],
				},
			],
			typed: {
				strings: [
					{ text: 'Red', styles: { color: 'red' } },
					{ text: 'Orange', styles: { color: 'darkorange' } },
					{ text: 'Yellow', styles: { color: 'gold' } },
					{ text: 'Green', styles: { color: 'green' } },
					{ text: 'Blue', styles: { color: 'blue' } },
					{ text: 'Indigo', styles: { color: 'indigo' } },
					{ text: 'Violet', styles: { color: 'blueviolet' } },
				],
				speeds: 2,
				options: { caretWidth: '2px' },
			},
		},
	},
	{
		id: 'quotes',
		title: '<strong>Style each string, including a closing <code>end-on</code> string</strong>; strings without their own styles reset to the defaults',
		root: {
			selector: '.typed-quotes',
			typed: {
				strings: [
					{ text: "I'll have what she's having", styles: { 'font-family': '"Times New Roman", serif', color: 'blue' } },
					{ text: "I am serious, and don't call me Shirley", styles: { 'font-family': 'consolas, monospace', 'font-weight': '700', 'background-color': '#000', color: '#0f0' } },
					"You ain't heard nothin yet",
				],
				speeds: [null, 0.8, 0.01],
				options: {
					iterations: 1,
					endOn: { text: 'May the force be with you', styles: { background: 'linear-gradient(to right, cyan, yellow)', color: 'red' } },
					caretSpeed: 0.65,
					caretWidth: '2px',
					caretColor: 'orange',
					caretSpace: '1px',
				},
			},
		},
		sizer: "I am serious, and don't call me Shirley",
	},
	{
		id: 'multiline',
		title: '<strong>Type multi-line strings</strong> with line breaks (and emoji 🚀)',
		root: {
			selector: '.typed-multiline',
			typed: {
				strings: [
					"Hey babe! 😘\nStuck at the office but I'll be home as soon as I can, and when I get home… we're having PIZZA 🤤",
					"I can't wait! Hurry!\n🍕 🙉",
				],
				speeds: [0.05, 3, 0.01],
			},
		},
		sizer: "Hey babe! 😘<br>Stuck at the office but I'll be home as soon as I can, and when I get home… we're having PIZZA 🤤",
	},
];

export const heroTyped: TypedConfig = {
	strings: [
		{ text: ' come alive ', styles: { background: '#ff0 linear-gradient(to top right, #ff0, #fc4 50px) bottom left', 'box-shadow': '0 5px 10px -5px rgb(32 32 37 / 25%)' } },
		{ text: 'breathe life into your projects', styles: { display: 'block', color: 'blueviolet' } },
		{ text: ' rival JavaScript…? ', styles: { 'background-color': '#202025', color: 'white' } },
		{
			text: 'improve your site performance',
			styles: {
				color: 'white',
				'text-shadow': [
					'1.2px 0 0 lightcoral',
					'1.2px 1.2px 0 lightcoral',
					'0 1.2px 0 lightcoral',
					'-1.2px 1.2px 0 lightcoral',
					'-1.2px 0 0 lightcoral',
					'-1.2px -1.2px 0 lightcoral',
					'0 -1.2px 0 lightcoral',
					'1.2px -1.2px 0 lightcoral',
					'0 2px 4px coral',
				].join(', '),
				'letter-spacing': '1.4px',
			},
		},
	],
	speeds: [0.08, 2, 0.03, 0.25],
	options: { caret: false },
};
