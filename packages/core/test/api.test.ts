import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitSelectorList, toCSSObject, typed } from '../src/index.ts';

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

describe('splitSelectorList()', () => {
	it('splits only on top-level commas', () => {
		assert.deepEqual(splitSelectorList('.a, :is(.b, .c) > d, [data-x="1,2"]'), ['.a', ':is(.b, .c) > d', '[data-x="1,2"]']);
	});
});
