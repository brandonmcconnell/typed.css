/** The mobile menu: closes on outside clicks and Escape, and keeps Tab focus inside while open. */
export function setupMobileNav(): void {
	const trigger = document.getElementById('mobile-nav-trigger');
	const label = document.querySelector('label[for="mobile-nav-trigger"]');
	const menu = document.getElementById('mobile-nav');
	if (!(trigger instanceof HTMLInputElement) || !menu) return;
	const items = Array.from(menu.querySelectorAll<HTMLElement>('a, button'));
	const lastItem = items[items.length - 1];

	document.addEventListener('click', event => {
		const target = event.target;
		if (trigger.checked && target instanceof Node && target !== trigger && !label?.contains(target) && !menu.contains(target)) trigger.checked = false;
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && trigger.checked) {
			trigger.checked = false;
			trigger.focus();
		}
		if (event.key !== 'Tab' || !trigger.checked || !lastItem) return;
		if (event.target === trigger && event.shiftKey) {
			event.preventDefault();
			lastItem.focus();
		} else if (event.target === lastItem && !event.shiftKey) {
			event.preventDefault();
			trigger.focus();
		}
	});
}
