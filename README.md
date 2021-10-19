<div align="center">
<h1>SCSS Typewriter</h1>
The SCSS Typewriter is a fully functional typewriter mixin for SCSS.<br><a href="https://codepen.io/brandonmcconnell/live/0aad0deb0d0a6f308b434309b9b6b93c" target="_blank">Live Demo</a> | Follow me on Twitter <a href="https://twitter.com/branmcconnell" target="_blank">@branmcconnell</a><br><br>
<img alt="demonstration of SCSS typewriter in action" src="https://assets.codepen.io/1580009/typewriter-scss-bg.gif" style="mix-blend-mode: screen;">
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
</ul>

<h2 id="syntax">Syntax</h2>

```scss
selector {
    @include typewriter($string1 [, $string2, ..., $stringN, $speeds, $options]);
}
```

<h2 id="usage">Usage</h2>

The `typewriter` mixin requires at least one string argument and accepts any number of string arguments. When the first non-string argument is encountered, is it assumed to be the `$speeds` object.

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
 - `name`: **(string)** A preferred name for the animation created. If you do not supply an animation name, or when an empty string is the value (as is the default), a generic one is used in the format `typewriter-0` where the `0` increments with each use of the mixin to avoid naming conflicts.
 - `caret`: **(bool)** This boolean value determines whether to show a blinking text (insertion) cursor/caret at the end of the dynamically typed/deleted text where the caret would naturally be. This value defaults to `true`, but changing it to `false` will disable the blinking caret. The color of the caret defaults to match the same color as the text by making use of `currentColor`. To adjust the styles of the caret, add styles to the `::after` pseudo-element of the style which you apply the mixin `@include` to, conversely to the typed text itself, which makes use of the `::before` pseudo-element.
 - `caret-speed`: **(number)** This is the duration of one "blink" animation (in seconds) of the insertion cursor/caret when it has been enabled using the `caret` property. Like the `$speed` object values, these number values do not accept units.
 - `caret-width`: **(number)** This is the width of the caret. By default, it is set to a value of `1ch` (or the width of the character "0" in the current font). By their nature, `ch` units are ideal for this use-case, but any non-percent numeric units may be used (e.g. `ch`, `ex`, `px`, `em`, `rem`, `vw`, `vh`, etc.).
 - `caret-color`: **(number)** This is the color of the caret. By default this color is inherited from the current text color of the parent element using `currentColor`, but this can be set to any valid color value (e.g. `hex`, `rgb`, `rgba`, `hsl`, `hsla`, `lab`, `lch`, etc.).
 - `caret-space`: **(number)** This is the width of the caret. By default, it is set to a value of `.1ch` (or 10% of the width of the character "0" in the current font). By their nature, `ch` units are ideal for this use-case, but any non-percent numeric units may be used (e.g. `ch`, `ex`, `px`, `em`, `rem`, `vw`, `vh`, etc.).
 - `delay`: **(number)** This is the duration of the delay (in seconds) before the animation initially begins. This property has a default value of `1`, as this delay helps to emphasize the animative nature of the mixin. Similarly to `caret-speed` and the `$speed` object values, this value also does not except units.
 - `iterations`: **(number)** This value determines how many times to loop the animation. This defaults to `infinite` to loop continuously. If a finite number is provided (e.g. `1`, `15`, etc.), the animation will repeat that many times and then type the first string again, at which point the typing animation will conclude, but the caret animation will continue if `caret` is enabled. The final typing animation of the first string is rendered via a separate animation that runs once the first full animation has completed all iterations.
 - `end-on`: **(string/number)** This string value will ONLY be rendered when `iterations` is set to a finite number. Once the final iteration completes, the animation will type one final string and keep that string present, thereby concluding the animation. This property can be passed either any custom non-empty string or the nth-index of the string from the `$strings` list to use. By default, if using a finite list of `iterations`, the first string from the list will be re-typed if none is provided using the `end-on` property.

<h2 id="examples">Examples</h2>

<h3 id="basic-examples">Basic Examples</h3>

Type a single string
```scss
@include typewriter("String 1");
```
Type two strings
```scss
@include typewriter("String 1", "String 2");
```
Type two strings, adjust the speed of `type` and `pause-deleted` properties (2 methods)
```scss
@include typewriter("String 1", "String 2", [.1, null, null, .5]);
```
```scss
@include typewriter("String 1", "String 2", (type: .1, pause-deleted: .5));
```
Type three strings, disable the caret
```scss
@include typewriter("String 1", "String 2", "String 3", null, (caret: false));
```
Type two strings, disable the caret, loop three times and end on the original string
```scss
@include typewriter("String 1", "String 2", null, (caret: false, iterations: 3));
```
Type two strings, iterating twice, then end on a custom string
```scss
@include typewriter("String 1", "String 2", null, (iterations: 2, end-on: "Done!"));
```
Type two strings, provide a custom animation name
```scss
@include typewriter("String 1", "String 2", null, (name: "my-typewriter"));
```
Color a typewriter including the blinking cursor
(hint: it inherits the text color automatically using `currentColor`)
```scss
color: #f00;
@include typewriter("String 1", "String 2");
```
Setting custom styles per string, and double the default typing speed by passing a numeric multiplier value in place of the `$speeds` object.
```scss
@include typewriter((
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
<p>I am a developer and enjoy working with languages like <span class="typewriter"></span> in my spare time.</p>
```
```scss
.typewriter {
    color: blueviolet;
    @include typewriter("HTML", "CSS", "JavaScript", "SCSS");
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
@include typewriter(
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
@include typewriter("String 1\ALine 2", "String 2\ALine 2\ALine 3");
```