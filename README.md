<div align="center">
<h1>Typed.css</h1>
Typed.css is a fully functional typewriter mixin for CSS preprocessors, currently supporting in SCSS, and soon adding support for Less and Stylus as well.<br><a href="http://typedcss.com/" target="_blank">Live Demo</a> | Follow me on Twitter <a href="https://twitter.com/branmcconnell" target="_blank">@branmcconnell</a><br><br>
<img alt="demonstration of Typed.css in action" src="https://assets.codepen.io/1580009/typewriter-scss-bg.png" style="mix-blend-mode: screen;">
</div>

#### Table of Contents
<ul>
    <li><a href="#syntax">Syntax</a></li>
    <li><a href="#usage">Usage</a></li>
    <li>
        <a href="#examples">Examples</a>
        <ul>
            <li><a href="#basic-examples">Basic Examples</a></li>
            <li><a href="#advanced-examples">Advanced Examples</a></li>
        </ul>
    </li>
    <li><a href="#browser-support">Browser Support</a></li>
    <li><a href="#credits">Credits</a></li>
</ul>

<h2 id="installation">Installation</h2>

```scss
@import 'typed';
```

<h2 id="syntax">Syntax</h2>

**General syntax**

```scss
selector {
    @include typed($string1 [, $string2, ..., $stringN, $speeds, $options]);
}
```

**Advanced syntax**

```scss
selector {
    @include typed($strings [, $speeds, $options]);
}
```

<h2 id="usage">Usage</h2>

The `typed` mixin requires at least one string argument and accepts any number of string arguments. To specify per-string styles, use a single `$strings` map object with the strings as the keys and the styles for each set as the value, where the style sub-map consists of CSS property names as keys and their associated values as the map values. When the first non-string argument is encountered, or after the `$strings` map has been computed and the next argument is met, it is assumed to be the `$speeds` object.

The `$speeds` object can be either a map with named properties matching any of the four valid speed properties— `type`, `pause-typed`, `delete`, and `pause-deleted`, a list of the values for each of those properties in that same order, a positive number (integer or float) which will act as a multiplier for the default speeds, or null, which will fall back to the default speeds when used. The `$speeds` argument is entirely optional and can be omitted, so `null` only needs to be passed for this argumment when wanting to use the default speeds but also set configuration options using the next `$options` argument. Passing `1` or `null` will have the same effect, as `1` will simply multiply the default values by 1, resulting in the same default values.

**IMPORTANT::** Make sure not to include units in your `$speeds` property values. The values should be numbers (integer or float is accepted) and are calculated in seconds. If you want to use a speed of `300ms`, use `.3` instead, which equates to `.3s` or `300ms`.

The definitions or each of these is as follows:
 - `type`: the speed at which a single character is typed (in seconds)
 - `pause-typed`: the delay (in seconds) after a string is fully typed before deletion begins
 - `delete`: the speed at which a single character is deleted (in seconds)
 - `pause-deleted`: the delay (in seconds) after a string is fully deleted before typing begins

When using a list for the `$speeds` object instead of a map, a maximum of 4 numeric values is permitted. Passing more than 4 values, or passing any non-numeric values, will result in an error. You can use fewer than four values, will will independantly overwrite the values of `type`, `pause-typed`, `delete`, and `pause-deleted` in that order, as the values in your list will be used to override the values in the default `$speeds` map object. If you would like to use a list instead of a map and skip a particular value, using `null` in place of a numeric value will also be accepted and cause the value for that property to use the default.

As mentioned above, to omit the `$speeds` object altogether and use the default speeds, either exclude it (it is optional), or if you need to use the final argument for the `$options` object (detailed below), use a value of `null` in place of the `$speeds` object to fall back to the default values for each which are as follows, or use a value of `1` which works as a multipler and will produce the same result as passing `null`:

```scss
$speeds: (
    type: .1,
    pause-typed: 2,
    delete: .08,
    pause-deleted: 1
);
```

Finally, the last parameter is the `$options` map object, for which the default values are as follows:

```scss
$options: (
    name: "",
    caret: true,
    caret-speed: .75,
    caret-width: 1ch,
    caret-color: currentColor,
    caret-space: .1ch,
    delay: 1,
    iterations: infinite,
    end-on: ""
);
```

Properties of the `$options` map can only be overwridden using another object of the map type, with matching keys. This argument and all its properties are entirely optional. The permitted properties for the `$options` map—along with their definitions—are:
 - `name`: **(string)** A preferred name for the animation created. If you do not supply an animation name, or when an empty string is the value (as is the default), a generic one is used in the format `typed-0` where the `0` increments with each use of the mixin to avoid naming conflicts.
 - `iterations`: **(number)** This value determines how many times to loop the animation. This defaults to `infinite` to loop continuously. If a finite number is provided (e.g. `1`, `15`, etc.), the animation will repeat that many times and then type the first string again, at which point the typing animation will conclude, but the caret animation will continue if `caret` is enabled. The final typing animation of the first string is rendered via a separate animation that runs once the first full animation has completed all iterations.
 - `caret`: **(bool)** This boolean value determines whether to show a blinking text (insertion) cursor/caret at the end of the dynamically typed/deleted text where the caret would naturally be. This value defaults to `true`, but changing it to `false` will disable the blinking caret. The color of the caret defaults to match the same color as the text by making use of `currentColor`. To adjust the styles of the caret, add styles to the `::after` pseudo-element of the style which you apply the mixin `@include` to, conversely to the typed text itself, which makes use of the `::before` pseudo-element.
 - `caret-speed`: **(number)** This is the duration of one "blink" animation (in seconds) of the insertion cursor/caret when it has been enabled using the `caret` property. Like the `$speed` object values, these number values do not accept units.
 - `caret-width`: **(number)** This is the width of the caret. By default, it is set to a value of `1ch` (or the width of the character "0" in the current font). By their nature, `ch` units are ideal for this use-case, but any non-percent numeric units may be used (e.g. `ch`, `ex`, `px`, `em`, `rem`, `vw`, `vh`, etc.).
 - `caret-color`: **(number)** This is the color of the caret. By default this color is inherited from the current text color of the parent element using `currentColor`, but this can be set to any valid color value (e.g. `hex`, `rgb`, `rgba`, `hsl`, `hsla`, `lab`, `lch`, etc.).
 - `caret-space`: **(number)** This is the width of the caret. By default, it is set to a value of `.1ch` (or 10% of the width of the character "0" in the current font). By their nature, `ch` units are ideal for this use-case, but any non-percent numeric units may be used (e.g. `ch`, `ex`, `px`, `em`, `rem`, `vw`, `vh`, etc.).
 - `styles`: **(map)** Any styles added to this map are displayed across all strings including the `end-on` string.
 - `end-styles`: **(map)** Any styles added to this map are displayed at the end of the animation once all iterations including the `end-on` string have completed their animations. These styles will not be rendered if the animation is set to loop continuously.
 - `delay`: **(number)** This is the duration of the delay (in seconds) before the animation initially begins. This property has a default value of `1`, as this delay helps to emphasize the animative nature of the mixin. Similarly to `caret-speed` and the `$speed` object values, this value also does not except units.
 - `type-pausing`: **(boolean)** This boolean value determines whether the current typewriter will replace any/all instances of the special "pause" syntax within its strings with a pause for the duration of however long it would take to type the number of characters indicated by its contained value. This property is set to true by default. The type-pause syntax is `<[INTEGER]>`. When enabled, a given string `Be right <[3]>there.` the total time it would take to animate the string forward would be the current `type` speed duration * 18. The 18 character-durations is comprised of three parts: `Be right ` (9 chars), `<[3]>` (same time as 3 chars), and `there.` (6 chars). 9+3+6=18. To specify a specific direction for a type-pause (e.g. forward, backward, or both), include an underscore next to the number within the special syntax, left-side for forward, right-sie for backward, and an underscore on each side for pausing in both direction. By default, pauses without an underscore only pause in the forward direction, but this defaukt setting can be adjusted using the `type-pausing-default` property.
- `type-pausing-default`: **(string)** This string property accepts the values `fwd` (default), `bwd`, and `both` to set the default direction type-pauses set without the directional underscore are paused.
 - `prefix`: **(string)** This string will displays at the beginning of each typed string and will NOT be included in the animation of the text itself. It's important to note that if you set per-string styles, they cause undesirable effects to the prefix, causing its style to change instantly between strings. In this case, opt to place any prefix/suffix strings outside the animated text element altogether.
 - `end-on`: **(string/number)** This string value will ONLY be rendered when `iterations` is set to a finite number. Once the final iteration completes, the animation will type one final string and keep that string present, thereby concluding the animation. This property can be passed either any custom non-empty string or the nth-index of the string from the `$strings` list to use. By default, if using a finite list of `iterations`, the first string from the list will be re-typed if none is provided using the `end-on` property.
 - `alt-text`: **(string)** This string will be used to add alt text to the pseudo `::before` element for accessibility. When unset, this property will—by default—fall back to the value stored in `end-on`. If `end-on` is also unset, both values will default to the value of the first string passed to the `typed` mixin.

<h2 id="examples">Examples</h2>

<h3 id="basic-examples">Basic Examples</h3>

Type a single string
```scss
@include typed("String 1");
```
Type two strings
```scss
@include typed("String 1", "String 2");
```
Type two strings, adjust the speed of `type` and `pause-deleted` properties (2 methods)
```scss
@include typed("String 1", "String 2", [.1, null, null, .5]);
```
```scss
@include typed("String 1", "String 2", (type: .1, pause-deleted: .5));
```
Type three strings, disable the caret
```scss
@include typed("String 1", "String 2", "String 3", null, (caret: false));
```
Type two strings, disable the caret, loop three times and end on the original string
```scss
@include typed("String 1", "String 2", null, (caret: false, iterations: 3));
```
Type two strings, iterating twice, then end on a custom string
```scss
@include typed("String 1", "String 2", null, (iterations: 2, end-on: "Done!"));
```
Type two strings, provide a custom animation name
```scss
@include typed("String 1", "String 2", null, (name: "my-typewriter"));
```
Color a typewriter including the blinking cursor
(hint: it inherits the text color automatically using `currentColor`)
```scss
color: #f00;
@include typed("String 1", "String 2");
```
Setting custom styles per string, and double the default typing speed by passing a numeric multiplier value in place of the `$speeds` object.
```scss
@include typed((
    "Red": (color: #e53935),
    "Orange": (color: #f4511e),
    "Yellow": (color: #ffb300),
    "Green": (color: #43a047),
    "Blue": (color: #1e88e5),
    "Indigo": (color: #3949ab),
    "Violet": (color: #8e24aa)
), 2);
```

<h3 id="advanced-examples">Advanced Examples</h3>

Type mid-string, adding custom styles to text and caret
```html
<p>I am a developer and enjoy working with languages like <span class="typed"></span> in my spare time.</p>
```
```scss
.typed {
    color: blueviolet;
    @include typed("HTML", "CSS", "JavaScript", "SCSS");
    &::before {
        font-weight: bold;
    }
    &::after {
        border-right-width: 2px;
    }
}
```
Add custom styles per string including the closing `end-on` string, excluding certain string(s) using an empty map, adding custom `$speed` object values using the list method, and setting values for each of the caret-related styling settings `caret-[speed/width/color/space]`.
```scss
@include typed(
    (
        "#1 String": (
            font-family: ("Times New Roman", arial),
            color: blue
        ),
        "#2 String": (
            font-family: (consolas, monospace),
            font-weight: 700,
            background-color: #000,
            color: #0f0
        ),
        "#3 String": ()
    ), [null, .8, .01], (
        iterations: 2,
        end-on: ("#4 String - Ending": (
            background: #fff linear-gradient(to right, cyan, yellow),
            background-blend-mode: hard-light,
            color: red,
            font-size: 120%
        )),
        caret-speed: .65,
        caret-width: 2px,
        caret-color: orange,
        caret-space: 1px
    )
);
```
Type a multi-line paragraph, using `\A` for line-breaks, similar to `\n` in JavaScript
```scss
@include typed("String 1\ALine 2", "String 2\ALine 2\ALine 3");
```

<h2 id="browser-support">Browser Support</h2>
<p>(now with full modern browser support! 🥳)</p>
<ul>
    <li>Chrome ✅</li>
    <li>Edge ✅</li>
    <li>Firefox ✅</li>
    <li>Internet Explorer ✅</li>
    <li>Opera ✅</li>
    <li>Safari ✅</li>
    <li>WebView Android ✅</li>
    <li>Chrome Android ✅</li>
    <li>Firefox for Android ✅</li>
    <li>Opera Android ✅</li>
    <li>Safari on iOS ✅</li>
    <li>Samsung Internet ✅</li>
</ul>

<h2 id="credits">Credits</h2>
<p>Hi there, I'm Brandon! 👨🏻‍💻</p>
<p>It's nioce to meet you. So far, Typed.css has been a one-man show, but I'm always open to feedback or help from others to level up software. If you have ideas for improvements or want to join in the effort to grow this module, please email me directly at brandon[at]dreamthinkbuild.com or open an issue here on GitHub with your idea(s), and I'll get back to you as soon as I can. Cheers! 🍻</p>
