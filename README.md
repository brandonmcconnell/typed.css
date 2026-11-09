<div align="center">
<h1>Typed.css</h1>
Animated typewriter text in pure CSS, for SCSS, Tailwind CSS, Less, Stylus, JavaScript, or plain CSS.<br><a href="https://typedcss.com/" target="_blank">Live Demo &amp; Generator</a> | Follow me on Twitter <a href="https://twitter.com/branmcconnell" target="_blank">@branmcconnell</a><br><br>
<img alt="demonstration of Typed.css in action" src="https://assets.codepen.io/1580009/typewriter-scss-bg.png" style="mix-blend-mode: screen;">
</div>

Typed.css types and deletes any number of strings, with a blinking caret, adjustable speeds, timed pauses, per-string styles, and accessible alt text. No JavaScript runs in the browser: the result is ordinary CSS animations, so the text works anywhere CSS does.

Every version below produces the same CSS, so pick whichever fits your stack. The [live demo](https://typedcss.com/) shows every example in each language.

#### Contents

- [Getting started](#getting-started): [Plain CSS](#plain-css), [SCSS](#scss), [Tailwind CSS](#tailwind-css), [Less](#less), [Stylus](#stylus), [JavaScript](#javascript)
- [Arguments](#arguments): [strings](#strings), [speeds](#speeds), [options](#options)
- [Syntax by language](#syntax-by-language)
- [Pauses and line breaks](#pauses-and-line-breaks)
- [Styling the text and caret](#styling-the-text-and-caret)
- [Browser support](#browser-support)

<h2 id="getting-started">Getting started</h2>

<h3 id="plain-css">Plain CSS (no build step)</h3>

Use the [generator](https://typedcss.com/#generator) to set up your typewriter, copy the raw CSS into your stylesheet, and add the class it gives you to an element:

```html
<h1 class="typed-text"></h1>
```

<h3 id="scss">SCSS</h3>

Download [`typed.scss`](typed.scss) into your project, import it, and include the mixin in any selector:

```scss
@import 'typed';

.headline {
  @include typed("Hello", "World");
}
```

Works with Dart Sass and LibSass.

<h3 id="tailwind-css">Tailwind CSS</h3>

```sh
npm install @typed-css/tailwind
```

Add your typewriters under `theme.typed` and register the plugin. Each entry becomes a `typed-<name>` class:

```js
// tailwind.config.js
import typed from '@typed-css/tailwind';

export default {
  theme: {
    typed: {
      headline: { strings: ['Hello', 'World'], speeds: 2 },
    },
  },
  plugins: [typed],
};
```

```html
<h1 class="typed-headline text-purple-600"></h1>
```

Works with Tailwind v3 and v4. In v4, load the config from your CSS with `@config "./tailwind.config.js";`.

<h3 id="less">Less</h3>

```sh
npm install @typed-css/less
```

```less
@plugin "@typed-css/less";

.headline {
  typed("Hello", "World");
}
```

Requires Less 3.5 or newer. You can also pass the plugin through the Less API: `less.render(source, { plugins: [typed] })`.

<h3 id="stylus">Stylus</h3>

```sh
npm install @typed-css/stylus
```

Register the plugin wherever you compile Stylus (the JavaScript API, or the `use` option of `stylus-loader`):

```js
import stylus from 'stylus';
import typed from '@typed-css/stylus';

stylus(source).use(typed()).render(callback);
```

```stylus
.headline
  typed("Hello", "World")
```

<h3 id="javascript">JavaScript</h3>

For build scripts, CSS-in-JS, or anything else that can take a CSS string:

```sh
npm install @typed-css/core
```

```js
import { typed, toCSS } from '@typed-css/core';

const css = toCSS(typed({ strings: ['Hello', 'World'] }), '.headline');
```

`toCSSObject()` returns the same styles as objects, for CSS-in-JS libraries.

<h2 id="arguments">Arguments</h2>

Every version takes the same three things, in this order:

1. **strings** (required): the text to type, one or more strings.
2. **speeds** (optional): how fast to type and delete.
3. **options** (optional): everything else.

In SCSS, Less, and Stylus, these are positional arguments: `typed("One", "Two", speeds, options)`. To set options while keeping the default speeds, pass `null` for the speeds. In JavaScript and Tailwind, they're the `strings`, `speeds`, and `options` keys of one object.

<h3 id="strings">Strings</h3>

Pass plain strings, or give a string its own styles. When some strings have styles, properties they don't set are reset for the others, so styles never leak from one string into the next.

<h3 id="speeds">Speeds</h3>

All speeds are in seconds, written without units.

| Speed | JS / Tailwind | Default | What it controls |
| --- | --- | --- | --- |
| `type` | `type` | `.1` | Time to type one character |
| `pause-typed` | `pauseTyped` | `2` | Pause after a string is fully typed |
| `delete` | `delete` | `.08` | Time to delete one character |
| `pause-deleted` | `pauseDeleted` | `1` | Pause after a string is fully deleted |

You can give speeds three ways:
- **A number** multiplies the overall speed: `2` is twice as fast, `.5` is half speed.
- **A list** of up to four values, in the order above. Use `null` to keep a default.
- **A map** that overrides only the speeds you name.

<h3 id="options">Options</h3>

| Option | JS / Tailwind | Default | What it does |
| --- | --- | --- | --- |
| `iterations` | `iterations` | `infinite` | How many times to loop. A finite count ends on the `end-on` string. |
| `end-on` | `endOn` | first string | The string left showing when a finite animation ends: a string, a 1-based index into your strings, or a string with its own styles. |
| `end-styles` | `endStyles` | none | Styles applied once a finite animation finishes. |
| `styles` | `styles` | none | Styles applied to every string. |
| `caret` | `caret` | `true` | Shows the blinking caret. |
| `caret-speed` | `caretSpeed` | `.75` | Seconds per caret blink. |
| `caret-width` | `caretWidth` | `1ch` | Caret width (any length unit). |
| `caret-color` | `caretColor` | `currentColor` | Caret color. It follows the text color by default. |
| `caret-space` | `caretSpace` | `.1ch` | Gap between the text and the caret. |
| `delay` | `delay` | `1` | Seconds before the animation starts. |
| `prefix` | `prefix` | none | Static text shown before the typed text. |
| `alt-text` | `altText` | the `end-on` string | Text read by screen readers. |
| `name` | `name` | generated | Custom animation name. In Tailwind it defaults to `typed-<name>`. |
| `type-pausing` | `typePausing` | `true` | Turns the `<[N]>` pause syntax on or off. |
| `type-pausing-default` | `typePausingDefault` | `"fwd"` | Direction for pauses written without an underscore: `"fwd"`, `"bwd"`, or `"both"`. |

<h2 id="syntax-by-language">Syntax by language</h2>

The arguments are the same everywhere; only the way you write lists, maps, and styled strings differs.

| | SCSS | Less | Stylus | JavaScript / Tailwind |
| --- | --- | --- | --- | --- |
| Call | `@include typed(…);` | `typed(…);` | `typed(…)` | `typed({ strings, speeds, options })` |
| Speeds list | `[.1, null, null, .5]` | `.1 null null .5` | `.1 null null .5` | `[0.1, null, null, 0.5]` |
| Speeds map | `(type: .1, pause-deleted: .5)` | `{ type: .1; pause-deleted: .5; }` | `{ type: .1, pause-deleted: .5 }` | `{ type: 0.1, pauseDeleted: 0.5 }` |
| Options | `(iterations: 2, caret: false)` | `{ iterations: 2; caret: false; }` | `{ iterations: 2, caret: false }` | `{ iterations: 2, caret: false }` |
| Styled strings | `("Red": (color: red), "Blue": (color: blue))` | `{ text: "Red"; color: red; }, …` | `{ text: "Red", color: red }, …` | `{ text: 'Red', styles: { color: 'red' } }, …` |
| Map options (`styles`, `end-on`) | `styles: (font-weight: 700)` | `styles { font-weight: 700; }` | `styles: { font-weight: 700 }` | `styles: { 'font-weight': 700 }` |

A few language-specific details:
- **SCSS:** styled strings use one map for all strings. Give strings with no styles of their own an empty map, `()`.
- **Less:** options that are maps are written as nested blocks without a colon, for example `end-on { text: "Done!"; color: green; }`.
- **Stylus:**
  - Wrap values containing commas in `unquote()`, for example `font-family: unquote('"Times New Roman", serif')`.
  - For strings containing quotes, use the other quote character rather than a backslash escape.

<h2 id="pauses-and-line-breaks">Pauses and line breaks</h2>

**Pauses:** write `<[N]>` inside a string to pause for as long as typing `N` characters would take. For example, `"Roads?<[15]> Where we're going…"`. By default, pauses apply only while typing. To choose a direction, add an underscore:

| Syntax | Pauses while |
| --- | --- |
| `<[_3]>` | typing |
| `<[3_]>` | deleting |
| `<[_3_]>` | both |

**Line breaks:** use `\A` in SCSS, Less, and Stylus, or `\n` in JavaScript. For example, `"Line one\ALine two"`.

<h2 id="styling-the-text-and-caret">Styling the text and caret</h2>

The typed text is drawn in the element's `::before` pseudo-element, and the caret in `::after`. Style those directly:

```scss
.headline {
  @include typed("Hello", "World");
  &::before { font-weight: 700; }      // the text
  &::after { border-right-width: 2px; } // the caret
}
```

In Tailwind, use the `before:` and `after:` variants, for example `before:font-bold`.

To type in the middle of a sentence, apply the typewriter to an inline element:

```html
<p>Go ahead, make my <span class="typed-time-of-day"></span>!</p>
```

<h2 id="browser-support">Browser support</h2>

All modern browsers: Chrome, Edge, Firefox, Safari, Opera, and their mobile versions.

<h2 id="contributing">Contributing</h2>

This repository holds every version of Typed.css and the typedcss.com website. To work on it:

```sh
npm install
npm run dev   # the website, at http://localhost:5173
npm test
```

<h2 id="credits">Credits</h2>
<p>Hi there, I'm Brandon! 👨🏻‍💻</p>
<p>It's nice to meet you. So far, Typed.css has been a one-dev show, but I'm always open to feedback or help from others to level up software. If you have ideas for improvements or want to join in growing this module, please email me directly at brandon[at]dreamthinkbuild.com or open an issue here on GitHub with your idea(s), and I'll get back to you as soon as I can. Cheers! 🍻</p>
Geld test line, please ignore.
