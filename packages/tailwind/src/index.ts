import { toCSSObject, typed, type CSSObjectResult, type TypedConfig } from '@typed-css/core';

/** Typewriters keyed by name; each becomes a `.typed-<name>` component class. */
export type TypedComponents = Readonly<Record<string, TypedConfig>>;

type ComponentRules = CSSObjectResult['rules'] | CSSObjectResult['keyframes'][string];

/**
 * The subset of the Tailwind plugin API this plugin uses. Typed structurally
 * so the same plugin satisfies both the v3 and v4 `PluginAPI` types.
 */
export interface TailwindPluginAPI {
	addComponents(components: Record<string, ComponentRules>): void;
	theme(path: string): unknown;
}

export interface TypedTailwindPlugin {
	readonly handler: (api: TailwindPluginAPI) => void;
	readonly config: Record<string, never>;
}

/** Tailwind's options-plugin contract (what `plugin.withOptions` produces in v3 and v4). */
export interface TypedTailwindPluginFactory {
	(options?: TypedComponents): TypedTailwindPlugin;
	readonly __isOptionsFunction: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Shallow check only; typed() validates each config in depth. */
const isTypedComponents = (value: unknown): value is TypedComponents =>
	isRecord(value) && Object.values(value).every(entry => isRecord(entry) && Array.isArray(entry['strings']));

function readThemeTypewriters(value: unknown): TypedComponents {
	if (value === undefined) return {};
	if (!isTypedComponents(value)) {
		throw new TypeError('theme.typed must map names to typewriter configs, e.g. { hero: { strings: ["Hello", "World"] } }.');
	}
	return value;
}

const createTypedPlugin = (options: TypedComponents = {}): TypedTailwindPlugin => ({
	handler: ({ addComponents, theme }) => {
		const typewriters: TypedComponents = { ...readThemeTypewriters(theme('typed')), ...options };
		for (const [name, config] of Object.entries(typewriters)) {
			const result = typed({ ...config, options: { name: `typed-${name}`, ...config.options } });
			for (const warning of result.warnings) console.warn(`[typed.css] typed-${name}: ${warning}`);
			const { rules, keyframes } = toCSSObject(result);
			addComponents({ [`.typed-${name}`]: rules, ...keyframes });
		}
	},
	config: {},
});

/**
 * Tailwind CSS plugin (v3 and v4) that generates typewriter components from
 * `theme.typed` and/or the options passed to the plugin.
 */
const typedPlugin: TypedTailwindPluginFactory = Object.assign(createTypedPlugin, { __isOptionsFunction: true as const });

export default typedPlugin;
