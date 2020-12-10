"use strict";

(function() {

function CssSelectorPicker(targetArea) {
	this.selectedCssText = "outline: 1px dashed blue !important;";

	this.targetArea = targetArea;
	this.shortestRule = false;
	this.outlineEnabled = false;
	this.selectedStyleSheetRule = null;
	this.selectorChangeListeners = [];
	this.shortestRuleChangeListeners = [];
	this.outlineEnabledChangeListeners = [];
	this.selector = "";
}

CssSelectorPicker.prototype.addSelectorChangeListener = function(listener) {
	this.selectorChangeListeners.push(listener);
};

CssSelectorPicker.prototype.addShortestRuleChangeListener = function(listener) {
	this.shortestRuleChangeListeners.push(listener);
};

CssSelectorPicker.prototype.addOutlineEnabledChangeListener = function(listener) {
	this.outlineEnabledChangeListeners.push(listener);
};

CssSelectorPicker.prototype.setSelector = function(selector) {
	var oldSelector = this.selector;
	this.clearSelectorOutlines();
	this.selector = selector;

	if (this.shortestRule) {
		this.applyShortestRule(false);
	}
	
	this.updateSelectorOutlines();
	
	if (oldSelector !== this.selector) {
		this.handleSelectorChange();
	}
};

CssSelectorPicker.prototype.setShortestRule = function(shortestRule) {
	this.shortestRule = shortestRule;

	for (var i = 0; i < this.shortestRuleChangeListeners.length; i++) {
		this.shortestRuleChangeListeners[i](this.shortestRule);
	}
};

CssSelectorPicker.prototype.setOutlineEnabled = function(newValue) {
	this.clearSelectorOutlines();
	this.outlineEnabled = newValue;
	this.updateSelectorOutlines();

	for (var i = 0; i < this.outlineEnabledChangeListeners.length; i++) {
		this.outlineEnabledChangeListeners[i](newValue);
	}
}

CssSelectorPicker.prototype.applyShortestRule = function(handle) {
	var oldSelector = this.selector;
	this.selector = CssSelectorPicker.getShortestSelector(this.targetArea, this.selector);

	if (oldSelector !== this.selector && (handle || handle === undefined)) {
		this.handleSelectorChange();
	}
};

CssSelectorPicker.prototype.handleSelectorChange = function() {
	for (var i = 0; i < this.selectorChangeListeners.length; i++) {
		this.selectorChangeListeners[i](this.selector);
	}
};

CssSelectorPicker.prototype.updateSelectorOutlines = function() {
	if (this.outlineEnabled) {
		// Will throw an exception if selector is malformed
		this.targetArea.querySelectorAll(this.selector);

		this.selectedStyleSheetRule = StyleSheets.Rule.create(this.selector);
		this.selectedStyleSheetRule.style.cssText = this.selectedCssText;
	}
};

CssSelectorPicker.prototype.clearSelectorOutlines = function() {
	if (this.selectedStyleSheetRule) {
		StyleSheets.Rule.drop(this.selectedStyleSheetRule);
		this.selectedStyleSheetRule = null;
	}
};

CssSelectorPicker.getShortestSelector = function(targetArea, selector) {
	var baseItemList = targetArea.querySelectorAll(selector);

	// Use finder from https://github.com/antonmedv/finder
	// It does not work with selection of multiple entities
	if (typeof finder !== "undefined" && baseItemList.length === 1) {
		return finder(baseItemList[0], {
			root: targetArea,
			className: function(name) { return name !== DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS; }
		}).replace(/ > /g, ">");
	}

	var baseItems = [];
	for (var i = 0; i < baseItemList.length; i++) {
		baseItems.push(baseItemList[i]);
	}

	function isSelectorEquivalent(selector) {
		var items = targetArea.querySelectorAll(selector);

		if (baseItems.length === items.length) {
			return baseItems.every(function (item, i) { return item.isEqualNode(items[i]); });
		}

		return false;
	};

	function getShortestSelectorPart(prefix, selector) {
		var selectorWithPipes = selector.replace(/([.#:])/g, "|$1");
		var selectorParts = selectorWithPipes.split("|");

		if (selectorParts.length > 1) {
			for (var i = 0; i < selectorParts.length; i++) {
				var part = selectorParts[i];

				if (isSelectorEquivalent(prefix + part)) {
					return prefix + part;
				}
			}
		}

		if (selectorParts.length > 2) {
			for (var i = 0; i < selectorParts.length; i++) {
				var part = selectorParts[i];

				for (var j = 0; j < selectorParts.length; j++) {
					if (i !== j && isSelectorEquivalent(prefix + part + selectorParts[j])) {
						return prefix + part + selectorParts[j];
					}
				}
			}
		}

		if (selectorParts.length > 3) {
			for (var i = 0; i < selectorParts.length; i++) {
				var part = selectorParts[i];

				for (var j = 0; j < selectorParts.length; j++) {
					if (i !== j && isSelectorEquivalent(prefix + part + selectorParts[j])) {
						var part2 = selectorParts[j];

						for (var k = 0; k < selectorParts.length; k++) {
							if (i !== k && j !== k && isSelectorEquivalent(prefix + part + part2 + selectorParts[k])) {
								return prefix + part + part2 + selectorParts[k];
							}
						}
					}
				}
			}
		}

		return prefix + selector;
	}


	var lastChevronIndex = selector.lastIndexOf(">");
	var lastElementSelector = selector.substring(lastChevronIndex + 1);

	if (isSelectorEquivalent(lastElementSelector)) {
		selector = getShortestSelectorPart("", lastElementSelector);
	}
	else if (lastChevronIndex > 0) {
		var parentShortestSelector = CssSelectorPicker.getShortestSelector(targetArea, selector.substring(0, lastChevronIndex));
		selector = parentShortestSelector + ">" + lastElementSelector;

		var selectorWithoutChevrons = selector.replace(/>/g," ");
		if (isSelectorEquivalent(selectorWithoutChevrons)) {
			selector = selectorWithoutChevrons;

			var splittedSelectorItems = selector.split(" ");
			if (splittedSelectorItems.length > 2) {
				var extremsSelector = splittedSelectorItems[0] + " " + splittedSelectorItems[splittedSelectorItems.length - 1];

				if (isSelectorEquivalent(extremsSelector)) {
					selector = extremsSelector;
				}
			}
		}

		var lastElementPrefix = selector.substring(0, selector.length - lastElementSelector.length);
		selector = getShortestSelectorPart(lastElementPrefix, lastElementSelector);
	}

	return selector;
}

CssSelectorPicker.connectSelectorInput = function(cssSelectorPicker, input) {
	function updateInput(e) {
		cssSelectorPicker.setShortestRule(false);

		try {
			cssSelectorPicker.setSelector(input.value);

			if (document.querySelector(input.value)) {
				input.setCustomValidity("");
			}
			else {
				input.setCustomValidity("No element found with this selector")
			}
		} catch (err) {
			input.setCustomValidity("Invalid format: " + err.message);
		}
	}

	input.addEventListener("input", updateInput);
	input.addEventListener("change", updateInput);

	if (input.value) {
		updateInput();
	}

	cssSelectorPicker.addSelectorChangeListener(function (selector) {
		input.value = selector;
		input.setCustomValidity("");
	});
}

CssSelectorPicker.connectShortestCheckbox = function(cssSelectorPicker, checkbox) {
	function updateCheckbox(e) {
		cssSelectorPicker.setShortestRule(checkbox.checked);
	}

	checkbox.addEventListener("input", updateCheckbox);
	checkbox.addEventListener("change", updateCheckbox);
	checkbox.addEventListener("click", function (e) { e.stopPropagation(); });

	if (checkbox.checked) {
		updateCheckbox();
	}

	cssSelectorPicker.addShortestRuleChangeListener(function (show) {
		checkbox.checked = show;
	});
}

CssSelectorPicker.connectOutlineCheckbox = function(cssSelectorPicker, checkbox) {
	function updateCheckbox(e) {
		try {
			cssSelectorPicker.setOutlineEnabled(checkbox.checked);
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

	cssSelectorPicker.addOutlineEnabledChangeListener(function (show) {
		checkbox.checked = show;
	});
}

CssSelectorPicker.connectCounter = function(cssSelectorPicker, counter) {
	cssSelectorPicker.addSelectorChangeListener(function (selector) {
		var selectedItems = document.querySelectorAll(selector);
		counter.textContent = selectedItems.length;
	});
}

CssSelectorPicker.createFromPlainHtmlInputs = function (targetArea, selectorInput, counter, pathContainer, pickerCheckbox, uniqueCheckbox, outlineCheckbox, shortestCheckbox) {
	var cssSelectorPicker = new CssSelectorPicker(targetArea);
	var domSelector = new DomSelector(targetArea);

	domSelector.addPickListener(function (element, selector) {
		cssSelectorPicker.setSelector(selector);
		domSelector.setOutlineEnabled(false);
	});
	domSelector.addSelectorChangeListener(function (selector) {
		pathContainer.textContent = selector;
	});
	cssSelectorPicker.addSelectorChangeListener(function (selector) {
		var firstCurrentSelectedElement = document.querySelector(selector);

		if (firstCurrentSelectedElement) {
			domSelector.setCurrentSelector(DomSelector.getSelectorFromElement(targetArea, firstCurrentSelectedElement, domSelector.unique));
		}
	});

	CssSelectorPicker.connectSelectorInput(cssSelectorPicker, selectorInput);
	CssSelectorPicker.connectShortestCheckbox(cssSelectorPicker, shortestCheckbox);
	CssSelectorPicker.connectOutlineCheckbox(cssSelectorPicker, outlineCheckbox);
	CssSelectorPicker.connectCounter(cssSelectorPicker, counter);
	DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);
	DomSelector.connectUniqueCheckbox(domSelector, uniqueCheckbox);

	return cssSelectorPicker;
}

window.CssSelectorPicker = CssSelectorPicker;

})();
