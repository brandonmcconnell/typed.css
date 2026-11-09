import { isLanguageId, LANGUAGES, type LanguageId } from './snippets/index.ts';

const STORAGE_KEY = 'typed-css:language';

type Listener = (language: LanguageId) => void;

const listeners = new Set<Listener>();

function readStoredLanguage(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function initialLanguage(): LanguageId {
	const fromURL = new URLSearchParams(window.location.search).get('lang');
	if (isLanguageId(fromURL)) return fromURL;
	const stored = readStoredLanguage();
	return isLanguageId(stored) ? stored : 'scss';
}

let current: LanguageId = initialLanguage();

export const getLanguage = (): LanguageId => current;

export const languageLabel = (language: LanguageId): string => LANGUAGES.find(entry => entry.id === language)?.label ?? language;

export function setLanguage(language: LanguageId): void {
	if (language === current) return;
	current = language;
	try {
		window.localStorage.setItem(STORAGE_KEY, language);
	} catch {
		// Storage can be unavailable (private browsing); the choice still applies to this page.
	}
	const url = new URL(window.location.href);
	url.searchParams.set('lang', language);
	window.history.replaceState(null, '', url);
	listeners.forEach(listener => listener(language));
}

export function onLanguageChange(listener: Listener): void {
	listeners.add(listener);
}

/** Renders the switcher as a radio group that follows the WAI-ARIA arrow-key pattern. */
export function renderLanguageSwitcher(container: HTMLElement): void {
	const buttons = LANGUAGES.map(({ id, label }) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.role = 'radio';
		button.dataset['language'] = id;
		button.textContent = label;
		button.addEventListener('click', () => setLanguage(id));
		return button;
	});
	const sync = (language: LanguageId): void => {
		for (const button of buttons) {
			const selected = button.dataset['language'] === language;
			button.setAttribute('aria-checked', String(selected));
			button.tabIndex = selected ? 0 : -1;
		}
	};
	container.addEventListener('keydown', event => {
		const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
		if (step === 0) return;
		event.preventDefault();
		const index = LANGUAGES.findIndex(entry => entry.id === current);
		const next = LANGUAGES[(index + step + LANGUAGES.length) % LANGUAGES.length];
		if (!next) return;
		setLanguage(next.id);
		buttons.find(button => button.dataset['language'] === next.id)?.focus();
	});
	container.replaceChildren(...buttons);
	sync(current);
	onLanguageChange(sync);
}
