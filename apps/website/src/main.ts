import 'normalize.css';
import './styles/site.scss';
import { toCSS, typed } from '@typed-css/core';
import { replaceCodeBlocks } from './code-block.ts';
import { demos, heroTyped } from './demos.ts';
import { renderExamples, sizeDemos, watchAnimationEnds } from './examples.ts';
import { demoRuleToCSS } from './flatten.ts';
import { setupGenerator } from './generator.ts';
import { getLanguage, languageLabel, onLanguageChange, renderLanguageSwitcher } from './language.ts';
import { installSnippets, type LanguageId } from './snippets/index.ts';
import { setupMobileNav } from './mobile-nav.ts';

const element = <T extends Element>(selector: string, type: new () => T): T => {
	const found = document.querySelector(selector);
	if (!(found instanceof type)) throw new Error(`Missing ${selector}.`);
	return found;
};

const demoStyles = document.createElement('style');
demoStyles.id = 'demo-styles';
demoStyles.textContent = [toCSS(typed(heroTyped), '.typed-hero'), ...demos.map(demo => demoRuleToCSS(demo.root))].join('\n');
document.head.append(demoStyles);

renderLanguageSwitcher(element('#language-switcher', HTMLElement));
setupMobileNav();

const installContainer = element('#install-snippets', HTMLElement);
const updateExamples = renderExamples(element('#examples-list', HTMLElement), demos, getLanguage());
const updateGenerator = setupGenerator(element('#generator-form', HTMLFormElement), element('#generator-output', HTMLElement), getLanguage);

const applyLanguage = (language: LanguageId): void => {
	replaceCodeBlocks(installContainer, installSnippets(language));
	document.querySelectorAll('.current-language-name').forEach(label => (label.textContent = languageLabel(language)));
	updateExamples(language);
	updateGenerator(language);
};
applyLanguage(getLanguage());
onLanguageChange(applyLanguage);

watchAnimationEnds();
sizeDemos();
let resizeTimeout = 0;
window.addEventListener('resize', () => {
	window.clearTimeout(resizeTimeout);
	resizeTimeout = window.setTimeout(() => sizeDemos(), 100);
});
document.fonts.ready.then(() => sizeDemos()).catch(() => undefined);
