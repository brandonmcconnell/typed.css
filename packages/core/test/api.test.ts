import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { configFromArgs, fromRawCSS, splitSelectorList, toCSSObject, typed, unescapeCSS, type ArgValue } from '../src/index.ts';

describe('typed()', () => {
	it('derives a stable default animation name from the config', () => {
		const first = typed({ strings: ['a', 'b'] });
		const second = typed({ strings: ['a', 'b'] });
		const different = typed({ strings: ['a', 'c'] });
		assert.match(first.animationName, /^typed-[0-9a-z]+$/);
		assert.equal(first.animationName, second.animationName);
		assert.notEqual(first.animationName, different.animationName);
	});

	it('warns when endOn is set with infinite iterations', () => {
		assert.equal(typed({ strings: ['a'], options: { endOn: 'b' } }).warnings.length, 1);
		assert.equal(typed({ strings: ['a'], options: { endOn: 'b', iterations: 1 } }).warnings.length, 0);
	});

	it('rejects invalid input', () => {
		assert.throws(() => typed({ strings: [] }), TypeError);
		assert.throws(() => typed({ strings: [''] }), TypeError);
		assert.throws(() => typed({ strings: ['a'], speeds: 0 }), RangeError);
		// @ts-expect-error a fifth speed is rejected by the types and at runtime
		assert.throws(() => typed({ strings: ['a'], speeds: [1, 2, 3, 4, 5] }), RangeError);
		assert.throws(() => typed({ strings: ['a'], options: { iterations: 1.5 } }), RangeError);
		assert.throws(() => typed({ strings: ['a'], options: { endOn: 2, iterations: 1 } }), RangeError);
		assert.throws(() => typed({ strings: ['a<[x]>'] }), TypeError);
	});
});

describe('toCSSObject()', () => {
	it('nests pseudo-element rules and collapses repeated declarations into arrays', () => {
		const { rules, keyframes } = toCSSObject(typed({ strings: ['Hi'], options: { name: 'hi' } }));
		assert.deepEqual(Object.keys(rules), ['&::before', '&::after']);
		assert.deepEqual(Object.keys(keyframes), ['@keyframes hi', '@keyframes hi-caret']);
		assert.deepEqual(rules['&::before']?.['content'], ['"\u200b"', '"\u200b"/"Hi"']);
	});
});

describe('configFromArgs()', () => {
	const str = (value: string): ArgValue => ({ kind: 'string', value });
	const num = (value: number, unit = ''): ArgValue => ({ kind: 'number', value, unit });
	const kw = (value: string): ArgValue => ({ kind: 'keyword', value });

	it('reads strings, then speeds, then options, like the SCSS mixin', () => {
		const config = configFromArgs([
			str('a'),
			{ kind: 'map', entries: [['text', str('b')], ['color', kw('red')]] },
			{ kind: 'list', separator: ' ', items: [num(0.1), kw('null'), num(500, 'ms')] },
			{ kind: 'map', entries: [['iterations', num(2)], ['caret', kw('false')], ['caret-width', num(2, 'px')], ['end-on', num(1)], ['styles', { kind: 'map', entries: [['font-weight', num(700)]] }]] },
		]);
		assert.deepEqual(config, {
			strings: ['a', { text: 'b', styles: { color: 'red' } }],
			speeds: [0.1, null, 0.5, null],
			options: { iterations: 2, caret: false, caretWidth: '2px', endOn: 1, styles: { 'font-weight': '700' } },
		});
	});

	it('spreads a leading comma list of strings', () => {
		assert.deepEqual(configFromArgs([{ kind: 'list', separator: ', ', items: [str('a'), str('b')] }, num(2)]).strings, ['a', 'b']);
	});

	it('rejects unknown options and stray arguments', () => {
		assert.throws(() => configFromArgs([str('a'), kw('null'), { kind: 'map', entries: [['bogus', num(1)]] }]), /bogus is not a valid option/);
		assert.throws(() => configFromArgs([str('a'), kw('null'), { kind: 'map', entries: [] }, num(1)]), /no arguments are permitted after the options/);
		assert.throws(() => configFromArgs([num(1)]), /at least one string/);
	});
});

describe('fromRawCSS() and unescapeCSS()', () => {
	it('classifies raw declaration text', () => {
		assert.deepEqual(fromRawCSS(' 500ms '), { kind: 'number', value: 500, unit: 'ms' });
		assert.deepEqual(fromRawCSS('.5'), { kind: 'number', value: 0.5, unit: '' });
		assert.deepEqual(fromRawCSS(`"Say \\"hi\\"\\A"`), { kind: 'string', value: 'Say "hi"\n' });
		assert.deepEqual(fromRawCSS('"Times New Roman", arial'), { kind: 'keyword', value: '"Times New Roman", arial' });
	});

	it('decodes CSS escapes', () => {
		assert.equal(unescapeCSS('a\\A b\\1F600 \\"'), 'a\nb😀"');
	});
});

describe('splitSelectorList()', () => {
	it('splits only on top-level commas', () => {
		assert.deepEqual(splitSelectorList('.a, :is(.b, .c) > d, [data-x="1,2"]'), ['.a', ':is(.b, .c) > d', '[data-x="1,2"]']);
	});
});
