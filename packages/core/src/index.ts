export {
	typed,
	DEFAULT_SPEEDS,
	type Declaration,
	type KeyframeBlock,
	type StyleValue,
	type Styles,
	type TypedConfig,
	type TypedKeyframesNode,
	type TypedNode,
	type TypedOptions,
	type TypedResult,
	type TypedRuleNode,
	type TypedSpeeds,
	type TypedSpeedsInput,
	type TypedString,
	type TypedStringInput,
} from './typed.ts';
export { toCSS, toCSSObject, splitSelectorList, type CSSDeclarations, type CSSObjectResult, type ToCSSOptions } from './serialize-css.ts';
export { formatNumber, quoteString } from './serialize-value.ts';
export { configFromArgs, fromRawCSS, toCSSValue, unescapeCSS, type ArgValue } from './args.ts';
export { injectPauses, sanitizePauses, PAUSE_CHARS, type PauseDirection } from './pauses.ts';
