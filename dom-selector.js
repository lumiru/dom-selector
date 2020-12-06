
(function() {

var OUTLINE_CURRENT_ELEMENT_CLASS = "fw-dom-selector-over-outline";

function DomSelector(container) {
	var self = this;

	this.overCssText = 'outline: 1px dashed red !important;';
	this.selectedCssText = 'outline: 1px dashed green !important;';

	this.selecting = false;
	this.selector = "";
	this.selectedStyleSheetRule = null;
	this.overStyleSheetRule = null;
	this.element = null;
	this.overTagTooltip = null;
	this.container = container;
	this.selectingChangeListeners = [];
	this.selectorChangeListeners = [];

	container.addEventListener("mouseover", this.onContainerMouseOver.bind(this));
	container.addEventListener("click", function() {
		self.setSelecting(false);
	});

	this.createTagTooltip = function() {
		var tooltip = document.createElement("div");
		tooltip.textContent = this.selector.substring(this.selector.lastIndexOf(">") + 1);

		tooltip.style.color = "white";
		tooltip.style.backgroundColor = "red";
		tooltip.style.position = "absolute";
		tooltip.style.zIndex = "99999999";
		tooltip.style.marginTop = "-22px";
		tooltip.style.marginLeft = "-1px";
		tooltip.style.padding = "2px 6px";
		tooltip.style.fontFamily = "sans-serif";
		tooltip.style.fontSize = "12px";
		tooltip.style.opacity = ".8";
		tooltip.style.pointerEvents = "none";
		tooltip.style.lineHeight = "1.4";

		return tooltip;
	}
}

DomSelector.prototype.addSelectorChangeListener = function(listener) {
	this.selectorChangeListeners.push(listener);
};

DomSelector.prototype.addSelectingChangeListener = function(listener) {
	this.selectingChangeListeners.push(listener);
};

DomSelector.prototype.onContainerMouseOver = function(e) {
	if (this.selecting) {
		this.setCurrentElement(e.target);
	}
};

DomSelector.prototype.setSelecting = function(newValue) {
	this.selecting = newValue;
	for (var listener of this.selectingChangeListeners) {
		listener(newValue);
	}
	this.clearCurrentElement();
};

DomSelector.prototype.setCurrentElement = function(element) {
	this.clearCurrentElement();
	element.classList.add(OUTLINE_CURRENT_ELEMENT_CLASS);
	this.element = element;

	this.updateCurrentSelectorFromCurrentElement();

	this.overTagTooltip = this.createTagTooltip(this.element);

	if (this.element.firstChild) {
		this.element.insertBefore(this.overTagTooltip, this.element.firstChild);
	}
	else {
		this.element.appendChild(this.overTagTooltip);
	}
};

DomSelector.prototype.clearCurrentElement = function() {
	if (this.element) {
		this.element.classList.remove(OUTLINE_CURRENT_ELEMENT_CLASS);
	}
	if (this.overTagTooltip) {
		this.element.removeChild(this.overTagTooltip);
	}

	this.element = null;
	this.overTagTooltip = null;
};

DomSelector.prototype.updateCurrentSelectorFromCurrentElement = function() {
	this.setCurrentSelector(DomSelector.getSelectorFromElement(this.element));
};

DomSelector.prototype.setCurrentSelector = function(newSelector) {
	if (this.selectedStyleSheetRule) {
		StyleSheets.Rule.drop(this.selectedStyleSheetRule);
		this.selectedStyleSheetRule = null;
	}
	if (this.overStyleSheetRule) {
		StyleSheets.Rule.drop(this.overStyleSheetRule);
		this.overStyleSheetRule = null;
	}

	this.selector = newSelector;
	for (var listener of this.selectorChangeListeners) {
		listener(newSelector);
	}

	// Will throw an exception if selector is malformed
	document.querySelectorAll(newSelector);

	this.selectedStyleSheetRule = StyleSheets.Rule.create(newSelector);
	this.selectedStyleSheetRule.style.cssText = this.selectedCssText;
	this.overStyleSheetRule = StyleSheets.Rule.create(newSelector + "." + OUTLINE_CURRENT_ELEMENT_CLASS);
	this.overStyleSheetRule.style.cssText = this.overCssText;
};

DomSelector.getSelectorFromElement = function(element) {
	var id = element.getAttribute("id");
	var classes = [];
	classes.push(...element.classList);
	var classes = classes.filter(function (item) {
		return item !== OUTLINE_CURRENT_ELEMENT_CLASS;
	});

	var selector = element.tagName.toLowerCase();

	if (id) {
		selector += "#" + id;
	}

	if (classes.length > 0) {
		selector += "." + classes.join(".");
	}

	if (element.parentNode && element.parentNode.tagName.toLowerCase() !== "html") {
		selector = DomSelector.getSelectorFromElement(element.parentNode) + ">" + selector;
	}

	return selector;
};

DomSelector.connectSelectorInput = function(domSelector, input) {
	function updateInput(e) {
		domSelector.clearCurrentElement();

		try {
			domSelector.setCurrentSelector(input.value);
			input.setCustomValidity("");
		} catch (err) {
			input.setCustomValidity("Invalid format");
		}
	}

	input.addEventListener("input", updateInput);
	input.addEventListener("change", updateInput);

	if (input.value) {
		updateInput();
	}

	domSelector.addSelectorChangeListener(function (selector) {
		input.value = selector;
	});
}

DomSelector.connectPickerCheckbox = function(domSelector, checkbox) {
	function updateCheckbox(e) {
		domSelector.setSelecting(checkbox.checked);
	}

	checkbox.addEventListener("input", updateCheckbox);
	checkbox.addEventListener("change", updateCheckbox);
	checkbox.addEventListener("click", function (e) { e.stopPropagation(); });

	if (checkbox.checked) {
		updateCheckbox();
	}

	domSelector.addSelectingChangeListener(function (selecting) {
		checkbox.checked = selecting;
	});
}

DomSelector.createFromPlainHtmlInputs = function(container, selectorInput, pickerCheckbox) {
	var domSelector = new DomSelector(document.body);
	DomSelector.connectSelectorInput(domSelector, selectorInput);
	DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);

	return domSelector;
}

var StyleSheets = {
	Rule: {
		create: function(rule) {
			var sheet;
			
			for(var i = 0, l = document.styleSheets.length; i < l; ++i) {
				// Exclude CSS @media specific styleSheets
				if(typeof(document.styleSheets[i].media) == 'string' ?
				 !document.styleSheets[i].media : !document.styleSheets[i].media.mediaText) {
					sheet = document.styleSheets[i];
				}
			}

			// Append inline stylesheet if none found
			if(!sheet) {
				var styleTag = document.createElement("style");
				styleTag.setAttribute("type", "text/css");
				document.head.appendChild(styleTag);
				sheet = styleTag.sheet;
			}

			// Create CSS rule
			var index = sheet.cssRules.length;
			sheet.insertRule(rule+"{}", index);

			// Return the new rule object, so we can modify or drop it
			return sheet.cssRules[index];
		},
		drop: function(rule) {
			var rules = rule.parentStyleSheet.cssRules;

			for(var i = 0, l = rules.length; i < l; ++i) {
				if(rules[i] === rule) {
					rule.parentStyleSheet.deleteRule(i);

					// Stop when first found
					return;
				}
			}
		}
	}
};

window.DomSelector = DomSelector;

})();
