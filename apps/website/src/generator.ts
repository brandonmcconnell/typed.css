import { DEFAULT_SPEEDS, toCSS, typed, type Styles, type TypedConfig, type TypedOptions, type TypedSpeeds, type TypedStringInput } from '@typed-css/core';
import { copyText, replaceCodeBlocks } from './code-block.ts';
import { createLiveDemo } from './examples.ts';
import { generatorSnippet, type LanguageId } from './snippets/index.ts';

const DEFAULT_STRINGS = ['Hello, world!', 'Typed entirely in CSS'];
const DEFAULT_CLASS = 'typed-text';
const SPEED_KEYS = ['type', 'pauseTyped', 'delete', 'pauseDeleted'] as const;

const query = <T extends Element>(root: ParentNode, selector: string, type: new () => T): T => {
	const element = root.querySelector(selector);
	if (!(element instanceof type)) throw new Error(`Missing ${selector}.`);
	return element;
};

const hyphenate = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^0-9a-z_\s-]/gi, '')
		.split(/[\s_-]+/)
		.filter(Boolean)
		.join('-')
		.toLowerCase();

/** Parses `property: value;` lines typed into a style box. */
export function parseStyles(text: string): Styles {
	const styles: Record<string, string> = {};
	for (const declaration of text.split(/[;\n]/)) {
		const separator = declaration.indexOf(':');
		if (separator === -1) continue;
		const property = declaration.slice(0, separator).trim().toLowerCase();
		const value = declaration.slice(separator + 1).trim();
		if (/^-{0,2}[a-z][a-z0-9-]*$/.test(property) && value !== '') styles[property] = value;
	}
	return styles;
}

function stringRow(value = ''): HTMLElement {
	const row = document.createElement('div');
	row.className = 'generator-string-wrapper';
	row.innerHTML = [
		'<input type="text" class="generator-string" placeholder="Enter a string here" aria-label="String" required>',
		'<pre class="generator-string-styles" contenteditable="plaintext-only" aria-label="String styles"></pre>',
		'<button class="generator-string-action generator-string-action__remove" aria-label="Remove string" type="button"><i class="fa-solid fa-minus"></i></button>',
		'<button class="generator-string-action generator-string-action__add" aria-label="Add string after this one" type="button"><i class="fa-solid fa-plus"></i></button>',
	].join('');
	query(row, '.generator-string', HTMLInputElement).value = value;
	return row;
}

const isChecked = (group: HTMLElement): boolean => query(group, '.form-group-heading input[type="checkbox"]', HTMLInputElement).checked;

function readString(row: Element, withStyles: boolean): TypedStringInput | null {
	const text = query(row, '.generator-string', HTMLInputElement).value;
	if (text === '') return null;
	const stylesBox = row.querySelector('.generator-string-styles');
	return withStyles && stylesBox ? { text, styles: parseStyles(stylesBox.textContent ?? '') } : text;
}

function readNumber(form: HTMLFormElement, selector: string): number {
	const value = query(form, selector, HTMLInputElement).valueAsNumber;
	if (!Number.isFinite(value)) throw new RangeError(`Enter a number for ${selector.replace('#', '').replaceAll('-', ' ')}.`);
	return value;
}

/** Reads the form into a typewriter config and the class it should be applied to. */
export function readGeneratorForm(form: HTMLFormElement): { config: TypedConfig; className: string } {
	const stringsGroup = query(form, '#form-group-strings', HTMLElement);
	const uniqueStyles = isChecked(stringsGroup);
	const strings = Array.from(stringsGroup.querySelectorAll('.generator-string-wrapper'))
		.map(row => readString(row, uniqueStyles))
		.filter((entry): entry is TypedStringInput => entry !== null);
	if (strings.length === 0) throw new TypeError('Add at least one string to type.');

	const speeds: { -readonly [Key in keyof TypedSpeeds]?: number } = {};
	if (!isChecked(query(form, '#form-group-speeds', HTMLElement))) {
		const entered: TypedSpeeds = {
			type: readNumber(form, '#speed-type'),
			pauseTyped: readNumber(form, '#speed-pause-typed'),
			delete: readNumber(form, '#speed-delete'),
			pauseDeleted: readNumber(form, '#speed-pause-deleted'),
		};
		for (const key of SPEED_KEYS) if (entered[key] !== DEFAULT_SPEEDS[key]) speeds[key] = entered[key];
	}

	const options: { -readonly [Key in keyof TypedOptions]: TypedOptions[Key] } = {};
	const name = hyphenate(query(form, '#form-animation-name .generator-string', HTMLInputElement).value);
	if (name !== '') options.name = name;
	if (!isChecked(query(form, '#form-group-iterations', HTMLElement))) options.iterations = readNumber(form, '#iterations');
	if (isChecked(query(form, '#form-group-caret', HTMLElement))) {
		const caretSpeed = readNumber(form, '#caret-speed');
		if (caretSpeed !== 0.75) options.caretSpeed = caretSpeed;
		const caretWidth = query(form, '#caret-width', HTMLInputElement).value.trim();
		if (caretWidth !== '1ch') options.caretWidth = caretWidth;
		const caretColor = query(form, '#caret-color', HTMLInputElement).value.trim();
		if (caretColor !== 'currentColor') options.caretColor = caretColor;
		const caretSpace = query(form, '#caret-space', HTMLInputElement).value.trim();
		if (caretSpace !== '0.1ch') options.caretSpace = caretSpace;
	} else {
		options.caret = false;
	}
	const prefix = query(form, '#form-group-prefix .generator-string', HTMLInputElement).value;
	if (prefix !== '') options.prefix = prefix;
	const endOnGroup = query(form, '#form-group-endon-strings', HTMLElement);
	const endOn = readString(query(endOnGroup, '.generator-string-wrapper', HTMLElement), isChecked(endOnGroup));
	if (endOn !== null) options.endOn = endOn;

	const config: TypedConfig = {
		strings,
		...(Object.keys(speeds).length > 0 ? { speeds } : {}),
		...(Object.keys(options).length > 0 ? { options } : {}),
	};
	return { config, className: name !== '' ? name : DEFAULT_CLASS };
}

/** Syncs `.has-checkbox` groups: fields only apply (and are only enabled) in their checkbox state. */
function syncCheckboxGroup(group: HTMLElement): void {
	const checked = isChecked(group);
	group.classList.toggle('checked', checked);
	for (const fieldGroup of group.querySelectorAll<HTMLElement>('.field-group.if-checked, .field-group.if-not-checked')) {
		const active = fieldGroup.classList.contains('if-checked') === checked;
		fieldGroup.querySelectorAll<HTMLInputElement>('input').forEach(input => (input.disabled = !active));
	}
}

/** Restores out-of-range or invalid values to the nearest valid value, as the original form did. */
function clampField(field: HTMLInputElement): void {
	const initial = field.dataset['initValue'];
	if (field.type === 'number' && field.value !== '') {
		const value = field.valueAsNumber;
		if (field.min !== '' && value < Number(field.min)) field.value = field.min;
		if (field.max !== '' && value > Number(field.max)) field.value = field.max;
	}
	if (field.classList.contains('css-units')) {
		const value = field.value.trim();
		if (/^-?(\d*\.)?\d+$/.test(value)) field.value = `${value}px`;
		else if (!/^-?(\d*\.)?\d+(px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc)$/.test(value) && initial !== undefined) field.value = initial;
	}
	if (field.classList.contains('css-color') && initial !== undefined && !CSS.supports('color', field.value.trim())) field.value = initial;
	if (field.required && field.value.trim() === '' && initial !== undefined) field.value = initial;
}

export function setupGenerator(form: HTMLFormElement, output: HTMLElement, getLanguage: () => LanguageId): (language: LanguageId) => void {
	const stringsField = query(form, '#form-group-strings .field-group', HTMLElement);
	stringsField.append(...DEFAULT_STRINGS.map(value => stringRow(value)));
	form.querySelectorAll<HTMLElement>('.has-checkbox').forEach(syncCheckboxGroup);

	const style = document.createElement('style');
	style.id = 'generator-styles';
	document.head.append(style);
	const error = query(output, '#generator-error', HTMLElement);
	const result = query(output, '#generator-result', HTMLElement);
	const snippet = query(output, '#generator-snippet', HTMLElement);
	const cssOutput = query(output, '#generator-css', HTMLElement);
	const classLabel = query(output, '#generator-class', HTMLElement);
	let latest: { config: TypedConfig; className: string; css: string } | null = null;

	const renderSnippet = (language: LanguageId): void => {
		if (latest) replaceCodeBlocks(snippet, [generatorSnippet(latest.config, `.${latest.className}`, language)]);
	};

	const generate = (): void => {
		output.hidden = false;
		try {
			const { config, className } = readGeneratorForm(form);
			const css = toCSS(typed(config), `.${className}`);
			latest = { config, className, css };
			error.hidden = true;
			result.hidden = false;
			style.textContent = toCSS(typed(config), `#generator-preview .${className}`);
			const preview = createLiveDemo(`<p class="${className}"></p>`);
			preview.id = 'generator-preview';
			query(output, '#generator-preview', HTMLElement).replaceWith(preview);
			classLabel.textContent = className;
			renderSnippet(getLanguage());
			replaceCodeBlocks(cssOutput, [{ label: 'CSS', grammar: 'css', code: css }]);
		} catch (cause) {
			latest = null;
			error.textContent = cause instanceof Error ? cause.message : 'Something went wrong generating this typewriter.';
			error.hidden = false;
			result.hidden = true;
		}
	};

	let liveUpdate = false;
	let pending = 0;
	form.addEventListener('submit', event => {
		event.preventDefault();
		liveUpdate = true;
		generate();
		output.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
	form.addEventListener('input', event => {
		const target = event.target;
		if (target instanceof HTMLInputElement && target.matches('.form-group-heading input[type="checkbox"]')) {
			const group = target.closest<HTMLElement>('.form-group');
			if (group) syncCheckboxGroup(group);
		}
		if (liveUpdate) {
			window.clearTimeout(pending);
			pending = window.setTimeout(generate, 300);
		}
	});
	form.addEventListener('focusout', event => {
		const target = event.target;
		if (target instanceof HTMLInputElement && target.dataset['initValue'] !== undefined) clampField(target);
		if (target instanceof HTMLInputElement && target.matches('#form-animation-name .generator-string')) target.value = hyphenate(target.value);
	});
	form.addEventListener('click', event => {
		const button = event.target instanceof Element ? event.target.closest('.generator-string-action') : null;
		if (!button) return;
		const row = button.closest('.generator-string-wrapper');
		if (button.classList.contains('generator-string-action__add')) {
			const added = stringRow();
			if (row) row.after(added);
			else stringsField.insertBefore(added, stringsField.querySelector('.generator-string-wrapper'));
			query(added, '.generator-string', HTMLInputElement).focus();
		} else if (row && stringsField.querySelectorAll('.generator-string-wrapper').length > 1) {
			row.remove();
		} else if (row) {
			query(row, '.generator-string', HTMLInputElement).value = '';
		}
		if (liveUpdate) generate();
	});

	const copyButton = query(output, '#generator-copy-css', HTMLButtonElement);
	copyButton.addEventListener('click', () => {
		if (latest) void copyText(latest.css, copyButton);
	});
	query(output, '#generator-download-css', HTMLButtonElement).addEventListener('click', () => {
		if (!latest) return;
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([latest.css], { type: 'text/css' }));
		link.download = `${latest.className}.css`;
		link.click();
		URL.revokeObjectURL(link.href);
	});

	return renderSnippet;
}
