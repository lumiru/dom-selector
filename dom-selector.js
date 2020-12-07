
(function() {

var OUTLINE_CURRENT_ELEMENT_CLASS = "fw-dom-selector-over-outline";

function DomSelector(container) {
	var self = this;

	this.overCssText = "outline: 1px dashed red !important;";
	this.selectedCssText = "outline: 1px dashed green !important;";
	this.tagTooltipCssText = "color: white; background-color: red; position: absolute; z-index: 99999999; margin-top: -22px; margin-left: -1px; padding: 2px 6px; font-family: sans-serif; font-size: 12px; opacity: .8; pointer-events: none; line-height: 1.4;";

	this.picking = false;
	this.selector = "";
	this.selectedStyleSheetRule = null;
	this.overStyleSheetRule = null;
	this.element = null;
	this.overTagTooltip = null;
	this.container = container;
	this.pickingChangeListeners = [];
	this.selectorChangeListeners = [];

	container.addEventListener("mouseover", this.onContainerMouseOver.bind(this));
	container.addEventListener("click", this.onContainerClick.bind(this));
}

DomSelector.prototype.addSelectorChangeListener = function(listener) {
	this.selectorChangeListeners.push(listener);
};

DomSelector.prototype.addPickingChangeListener = function(listener) {
	this.pickingChangeListeners.push(listener);
};

DomSelector.prototype.onContainerMouseOver = function(e) {
	if (this.picking) {
		this.setCurrentElement(e.target);
	}
};

DomSelector.prototype.onContainerClick = function(e) {
	this.setPicking(false);
};

DomSelector.prototype.setPicking = function(newValue) {
	this.picking = newValue;
	for (var i = 0; i < this.pickingChangeListeners.length; i++) {
		this.pickingChangeListeners[i](newValue);
	}
	this.clearCurrentElement();
};

DomSelector.prototype.setCurrentElement = function(element) {
	this.clearCurrentElement();
	element.classList.add(OUTLINE_CURRENT_ELEMENT_CLASS);
	this.element = element;

	this.updateCurrentSelectorFromCurrentElement();

	this.overTagTooltip = document.createElement("div");
	this.overTagTooltip.style.cssText = this.tagTooltipCssText;
	this.overTagTooltip.textContent = this.selector.substring(this.selector.lastIndexOf(">") + 1);

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
	for (var i = 0; i < this.selectorChangeListeners.length; i++) {
		this.selectorChangeListeners[i](newSelector);
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
	// .classList does not return an Array so we have to cast it
	for (var i = 0; i < element.classList.length; i++) {
		classes.push(element.classList[i]);
	}
	// We do not want to include our own class to the node path
	classes = classes.filter(function (item) {
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
		input.setCustomValidity("");
	});
}

DomSelector.connectPickerCheckbox = function(domSelector, checkbox) {
	function updateCheckbox(e) {
		domSelector.setPicking(checkbox.checked);
	}

	checkbox.addEventListener("input", updateCheckbox);
	checkbox.addEventListener("change", updateCheckbox);
	checkbox.addEventListener("click", function (e) { e.stopPropagation(); });

	if (checkbox.checked) {
		updateCheckbox();
	}

	domSelector.addPickingChangeListener(function (picking) {
		checkbox.checked = picking;
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
				if(typeof(document.styleSheets[i].media) == "string" ?
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
