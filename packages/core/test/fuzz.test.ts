import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import * as sass from 'sass';
import { formatNumber, toCSS, typed, type TypedOptions, type TypedSpeedsInput } from '../src/index.ts';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function mulberry32(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe('formatNumber matches Dart Sass number serialization', () => {
	it('for a broad sample of values', () => {
		const random = mulberry32(42);
		const values = [0, 1, -1, 0.1, 0.001, 1e-7, 123456789.123456789, 99.99999999995, 0.30000000000000004, 1 / 3, -2 / 3, 1e21];
		for (let i = 0; i < 400; i++) values.push((random() - 0.5) * 10 ** Math.floor(random() * 8 - 3));
		for (let i = 0; i < 100; i++) values.push(Math.round(random() * 1000) / 7);
		const source = values.map((value, index) => `.n${index} { v: ${value.toFixed(20).replace(/0+$/, '').replace(/\.$/, '')}; }`).join('\n');
		const css = sass.compileString(source, { logger: sass.Logger.silent }).css;
		const sassValues = Array.from(css.matchAll(/v: (.+);/g), match => match[1]);
		assert.equal(sassValues.length, values.length);
		values.forEach((value, index) => {
			const parsed = Number(value.toFixed(20));
			assert.equal(formatNumber(parsed), sassValues[index], `value ${value}`);
		});
	});
});

describe('randomized configs match the SCSS mixin output', () => {
	const random = mulberry32(7);
	const pick = <T>(items: readonly T[]): T => {
		const item = items[Math.floor(random() * items.length)];
		if (item === undefined) throw new Error('Cannot pick from an empty list.');
		return item;
	};
	const words = ['Hello', 'world', 'typed', 'CSS', '🚀', 'naïve', 'it’s', 'a<[2]>b', '<[_3]>x', 'y<[1_]>', 'z<[_2_]>'];
	const sentence = () => Array.from({ length: 1 + Math.floor(random() * 4) }, () => pick(words)).join(' ');
	const speed = () => Math.round(random() * 300) / 100 + 0.01;

	for (let run = 0; run < 25; run++) {
		const strings = Array.from({ length: 1 + Math.floor(random() * 4) }, sentence);
		const speedKind = pick(['none', 'multiplier', 'tuple', 'map'] as const);
		let speeds: TypedSpeedsInput | null = null;
		let scssSpeeds = 'null';
		if (speedKind === 'multiplier') {
			const value = speed();
			speeds = value;
			scssSpeeds = String(value);
		} else if (speedKind === 'tuple') {
			const tuple = [speed(), random() > 0.5 ? null : speed(), speed()] as const;
			speeds = tuple;
			scssSpeeds = `[${tuple.map(value => (value === null ? 'null' : String(value))).join(', ')}]`;
		} else if (speedKind === 'map') {
			const type = speed();
			const pauseDeleted = speed();
			speeds = { type, pauseDeleted };
			scssSpeeds = `(type: ${type}, pause-deleted: ${pauseDeleted})`;
		}
		const iterations = random() > 0.5 ? 'infinite' : 1 + Math.floor(random() * 3);
		const caret = random() > 0.3;
		const delay = Math.round(random() * 300) / 100;
		const typePausingDefault = pick(['fwd', 'bwd', 'both'] as const);
		const options: TypedOptions = { name: 'fuzz', iterations, caret, delay, typePausingDefault };
		const scssOptions = `(name: "fuzz", iterations: ${iterations}, caret: ${caret}, delay: ${delay}, type-pausing-default: "${typePausingDefault}")`;
		const scss = `${strings.map(value => `"${value}"`).join(', ')}, ${scssSpeeds}, ${scssOptions}`;

		it(`run ${run}: ${scss}`, () => {
			const expected = sass.compileString(`@import 'typed';\n.fuzz { @include typed(${scss}); }`, { loadPaths: [repoRoot], logger: sass.Logger.silent }).css;
			const actual = toCSS(typed({ strings, speeds, options }), '.fuzz', { charset: true }).trimEnd();
			assert.equal(actual, expected);
		});
	}
});
