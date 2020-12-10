"use strict";

(function() {

function DomSelector(targetArea) {
	var self = this;

	this.overCssText = "outline: 1px dashed red !important;";
	this.selectedCssText = "outline: 1px dashed green !important;";
	this.tagTooltipCssText = "color: white; background-color: red; position: absolute; z-index: 99999999; margin-top: -22px; margin-left: -1px; padding: 2px 6px; font-family: sans-serif; font-size: 12px; opacity: .8; pointer-events: none; line-height: 1.4;";

	this.picking = false;
	this.unique = false;
	this.outlineEnabled = false;
	this.selector = "";
	this.selectedStyleSheetRule = null;
	this.overStyleSheetRule = null;
	this.element = null;
	this.overTagTooltip = null;
	this.targetArea = targetArea;
	this.pickingChangeListeners = [];
	this.pickListeners = [];
	this.selectorChangeListeners = [];
	this.uniqueChangeListeners = [];
	this.outlineEnabledChangeListeners = [];

	targetArea.addEventListener("mouseover", this.onTargetAreaMouseOver.bind(this));
	targetArea.addEventListener("click", this.onContainerClick.bind(this));
}

DomSelector.prototype.addSelectorChangeListener = function(listener) {
	this.selectorChangeListeners.push(listener);
};

DomSelector.prototype.addPickListener = function(listener) {
	this.pickListeners.push(listener);
};

DomSelector.prototype.addPickingChangeListener = function(listener) {
	this.pickingChangeListeners.push(listener);
};

DomSelector.prototype.addUniqueChangeListener = function(listener) {
	this.uniqueChangeListeners.push(listener);
};

DomSelector.prototype.addOutlineEnabledChangeListener = function(listener) {
	this.outlineEnabledChangeListeners.push(listener);
};

DomSelector.prototype.onTargetAreaMouseOver = function(e) {
	if (this.picking) {
		this.setCurrentElement(e.target);
	}
};

DomSelector.prototype.onContainerClick = function(e) {
	if (this.picking) {
		this.pick();
	}
};

DomSelector.prototype.pick = function() {
	this.setPicking(false);
	for (var i = 0; i < this.pickListeners.length; i++) {
		this.pickListeners[i](this.element, this.selector);
	}
};

DomSelector.prototype.setPicking = function(newValue) {
	this.picking = newValue;
	if (this.picking) {
		this.setOutlineEnabled(true);
	}

	for (var i = 0; i < this.pickingChangeListeners.length; i++) {
		this.pickingChangeListeners[i](newValue);
	}
	this.clearCurrentElement();
};

DomSelector.prototype.setUnique = function(newValue) {
	this.unique = newValue;
	for (var i = 0; i < this.uniqueChangeListeners.length; i++) {
		this.uniqueChangeListeners[i](newValue);
	}
}

DomSelector.prototype.setOutlineEnabled = function(newValue) {
	this.clearSelectorOutlines();
	this.outlineEnabled = newValue;
	this.updateSelectorOutlines();

	for (var i = 0; i < this.outlineEnabledChangeListeners.length; i++) {
		this.outlineEnabledChangeListeners[i](newValue);
	}
}

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
	this.setCurrentSelector(DomSelector.getSelectorFromElement(this.targetArea, this.element, this.unique));
};

DomSelector.prototype.setCurrentSelector = function(newSelector) {
	this.clearSelectorOutlines();

	this.selector = newSelector;
	for (var i = 0; i < this.selectorChangeListeners.length; i++) {
		this.selectorChangeListeners[i](newSelector);
	}

	this.updateSelectorOutlines();
};

DomSelector.prototype.updateSelectorOutlines = function() {
	if (this.outlineEnabled) {
		// Will throw an exception if selector is malformed
		this.targetArea.querySelectorAll(this.selector);

		this.selectedStyleSheetRule = StyleSheets.Rule.create(this.selector);
		this.selectedStyleSheetRule.style.cssText = this.selectedCssText;
		this.overStyleSheetRule = StyleSheets.Rule.create(this.selector + "." + OUTLINE_CURRENT_ELEMENT_CLASS);
		this.overStyleSheetRule.style.cssText = this.overCssText;
	}
};

DomSelector.prototype.clearSelectorOutlines = function() {
	if (this.selectedStyleSheetRule) {
		StyleSheets.Rule.drop(this.selectedStyleSheetRule);
		this.selectedStyleSheetRule = null;
	}
	if (this.overStyleSheetRule) {
		StyleSheets.Rule.drop(this.overStyleSheetRule);
		this.overStyleSheetRule = null;
	}
};

var OUTLINE_CURRENT_ELEMENT_CLASS = DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS = "fw-dom-selector-over-outline";

DomSelector.getSelectorFromElement = function(container, element, unique) {
	if (container.isEqualNode(element)) {
		return "";
	}

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

	if (!document.body.isEqualNode(element.parentNode) && !container.isEqualNode(element.parentNode)) {
		selector = DomSelector.getSelectorFromElement(container, element.parentNode, false) + ">" + selector;
	}

	if (unique) {
		try {
			var selectedElements = container.querySelectorAll(selector);

			// If several elements was found
			if (selectedElements.length > 1) {
				var pathes = [];
				for (var i = 0; i < selectedElements.length; i++) {
					pathes.push([ selectedElements[i] ]);
				}

				var selectedElementIndex = pathes.findIndex(function (item) { return element.isEqualNode(item[0]); });
				var found = false;
				var counter = 0;

				// Every element should have the same depth since the selector is restricted enough
				do {
					for (var i = 0; i < pathes.length; i++) {
						pathes[i].unshift(pathes[i][0].parentNode);
					}

					if (pathes.every(function (v) { return pathes[0][0].isEqualNode(v[0]); })) {
						found = true;
					}
				} while (
					!found &&
					!document.body.isEqualNode(pathes[0][0].parentNode) &&
					!container.isEqualNode(pathes[0][0].parentNode)
				);

				if (found) {
					var firstDifferentElement = pathes[selectedElementIndex][1];
					var firstDifferentElementSiblings = [];
					// .children does not return an Array so we have to cast it
					for (var i = 0; i < firstDifferentElement.parentNode.children.length; i++) {
						firstDifferentElementSiblings.push(firstDifferentElement.parentNode.children[i]);
					}
					var firstDifferentElementSelector =
						DomSelector.getSelectorFromElement(container, firstDifferentElement, false) +
						":nth-child(" + (
							firstDifferentElementSiblings.findIndex(function (child) {
								return firstDifferentElement.isEqualNode(child);
							}) + 1
						) + ")";
					selector = firstDifferentElementSelector;
					var innerSelector = DomSelector.getSelectorFromElement(firstDifferentElement, element, true);
					if (innerSelector) {
						selector += ">" + innerSelector;
					}
				}
			}
		}
		catch (err) {
			// console.warn(err);
		}
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
		try {
			domSelector.setPicking(checkbox.checked);
		}
		catch (err) {
			console.error(err);
		}
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

DomSelector.connectUniqueCheckbox = function(domSelector, checkbox) {
	function updateCheckbox(e) {
		try {
			domSelector.setUnique(checkbox.checked);
		}
		catch (err) {
			console.error(err);
		}
	}

	checkbox.addEventListener("input", updateCheckbox);
	checkbox.addEventListener("change", updateCheckbox);
	checkbox.addEventListener("click", function (e) { e.stopPropagation(); });

	if (checkbox.checked) {
		updateCheckbox();
	}

	domSelector.addUniqueChangeListener(function (unique) {
		checkbox.checked = unique;
	});
}

DomSelector.connectOutlineCheckbox = function(domSelector, checkbox) {
	function updateCheckbox(e) {
		try {
			domSelector.setOutlineEnabled(checkbox.checked);
		}
		catch (err) {
			console.error(err);
		}
	}

	checkbox.addEventListener("input", updateCheckbox);
	checkbox.addEventListener("change", updateCheckbox);
	checkbox.addEventListener("click", function (e) { e.stopPropagation(); });

	if (checkbox.checked) {
		updateCheckbox();
	}

	domSelector.addOutlineEnabledChangeListener(function (show) {
		checkbox.checked = show;
	});
}

DomSelector.createFromPlainHtmlInputs = function(container, selectorInput, pickerCheckbox, uniqueCheckbox, outlineCheckbox) {
	var domSelector = new DomSelector(container);
	DomSelector.connectSelectorInput(domSelector, selectorInput);
	DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);
	DomSelector.connectUniqueCheckbox(domSelector, uniqueCheckbox);
	DomSelector.connectOutlineCheckbox(domSelector, outlineCheckbox);

	return domSelector;
}

window.DomSelector = DomSelector;

})();
