# SCSS Typewriter

The SCSS Typewriter is a fully functional typewriter mixin for SCSS.

## Syntax

```scss
selector {
	@include typewriter($string1 [, $string2, ..., $stringN, $speeds, $options]);
}
```

## Usage

The `typewriter` mixin requires at least one string argument and accepts any number of string arguments. When the first non-string argument is encountered, is it assumed to be the `$speeds` object. The `$speeds` object can be either a map with named properties matching any of the four valid speed properties— `type`, `pause-typed`, `delete`, and `pause-deleted`, or a list of the values for each of those properties in that same order.

**IMPORTANT::** Make sure not to include units in your `$speeds` property values. The values should be numbers (integer or float is accepted) and are calculated in seconds. If you want to use a speed of `300ms`, use `.3` instead, which equates to `.3s` or `300ms`.

The definitions or each of these is as follows:
 - `type`: the speed at which a single character is typed (in seconds)
 - `pause-typed`: the delay (in seconds) after a string is fully typed before deletion begins
 - `delete`: the speed at which a single character is deleted (in seconds)
 - `pause-deleted`: the delay (in seconds) after a string is fully deleted before typing begins

When using a list for the `$speeds` object instead of a map, a maximum of 4 numeric values is permitted. Passing more than 4 values, or passing any non-numeric values, will result in an error. You can use fewer than four values, will will independantly overwrite the values of `type`, `pause-typed`, `delete`, and `pause-deleted` in that order, as the values in your list will be used to override the values in the default `$speeds` map object. If you would like to use a list instead of a map and skip a particular value, using `null` in place of a numeric value will also be accepted and cause the value for that property to use the default.

To omit the `$speeds` object altogether and use the default speeds, either exclude it (it is optional), or if you need to use the final argument for the `$options` object (detailed below), using a value of `null` in place of the `$speeds` object will fall back to the default values for each which are as follows:

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
	delay: 1,
	iterations: infinite
);
```

Properties of the `$options` map can only be overwridden using another object of the map type, with matching keys. This argument and all its properties are entirely optional. The permitted properties for the `$options` map—along with their definitions—are:
 - `name`: **(string)** A preferred name for the animation created. If you do not supply an animation name, or when an empty string is the value (as is the default), a generic one is used in the format `typewriter-0` where the `0` increments with each use of the mixin to avoid naming conflicts.
 - `caret`: **(bool)** This boolean value determines whether to show a blinking text (insertion) cursor/caret at the end of the dynamically typed/deleted text where the caret would naturally be. This value defaults to `true`, but changing it to `false` will disable the blinking caret. The color of the caret defaults to match the same color as the text by making use of `currentColor`. To adjust the styles of the caret, add styles to the `::after` pseudo-element of the style which you apply the mixin `@include` to, conversely to the typed text itself, which makes use of the `::before` pseudo-element.
 - `caret-speed`: **(number)** This is the duration of one "blink" animation (in seconds) of the insertion cursor/caret when it has been enabled using the `caret` property. Like the `$speed` object values, these number values do not accept units.
 - `delay`: **(number)** This is the duration of the delay (in seconds) before the animation initially begins. This property has a default value of `1`, as this delay helps to emphasize the animative nature of the mixin. Similarly to `caret-speed` and the `$speed` object values, this value also does not except units.
 - `iterations`: **(number)** This value determines how many times to loop the animation. This defaults to `infinite` to loop continuously. If a finite number is provided (e.g. `1`, `15`, etc.), the animation will repeat that many times and then type the first string again, at which point the typing animation will conclude, but the caret animation will continue if `caret` is enabled. The final typing animation of the first string is rendered via a separate animation that runs once the first full animation has completed all iterations.

## Examples

**Type a single string**
```scss
@include typewriter("String 1");
```
**Type two strings**
```scss
@include typewriter("String 1", "String 2");
```
**Type two strings, adjust the speed of `type` and `pause-deleted` properties** (2 methods)
```scss
@include typewriter("String 1", "String 2", [.1, null, null, .5]); 
```
```scss
@include typewriter("String 1", "String 2", (type: .1, pause-deleted: .5));
```
**Type three strings, disable the caret**
```scss
@include typewriter("String 1", "String 2", "String 3", null, (caret: true));
```
**Type two strings, disable the caret, loop three times and end on the original string**
```scss
@include typewriter("String 1", "String 2", null, (caret: true, iterations: 3));
```
**Type two strings, provide a custom animation name**
```scss
@include typewriter("String 1", "String 2", null, (name: "my-typewriter"));
```
**Type a multi-line paragraph, using `\A` for line-breaks, similar to `\n` in JavaScript**
```scss
@include typewriter("String 1\ALine 2", "String 2\ALine 2\ALine 3");
```
**Color a typewriter including the blinking cursor**
(hint: it inherits the text color automatically using `currentColor`)
```scss
color: #f00;
@include typewriter("String 1", "String 2");
```