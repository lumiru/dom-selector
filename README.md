
# Dom Selector

A plain Javascript DOM selector.

## How to use it?

It provides a `DomSelector` class that can be used with any javascript framework.
To use it with simple HTML inputs, call the `createFromPlainHtmlInputs`:

```html
<section>
	<p><label>
		<span>CSS selector:</span>
		<input type="text" id="dom-selector-input-text" />
		<input type="checkbox" id="dom-selector-input-checkbox" />
	</label></p>
</section>
```

```javascript
DomSelector.createFromPlainHtmlInputs(
	document.getElementById("where-tag-can-be-got"),
	document.getElementById("dom-selector-input-text"),
	document.getElementById("dom-selector-input-checkbox")
);
```

You can refer to `DomSelector.connectSelectorInput` and `DomSelector.connectPickerCheckbox` to find how to connect a domSelector object to your prefered javascript framework.
