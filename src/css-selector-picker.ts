
import { DomSelector } from './dom-selector';
import * as StyleSheets from './stylesheets';

class CssSelectorPicker {
	private selectedCssText = "outline: 1px dashed blue !important;";

	private targetArea: Element;
	private shortestRule = false;
	private outlineEnabled = false;
	private selectedStyleSheetRule?: CSSStyleRule;
	private selectorChangeListeners: ((val: string) => void)[] = [];
	private shortestRuleChangeListeners: ((val: boolean) => void)[] = [];
	private outlineEnabledChangeListeners: ((val: boolean) => void)[] = [];
	private selector = "";

	public constructor(targetArea: Element) {
		this.targetArea = targetArea;
	}

	public addSelectorChangeListener(listener: (val: string) => void) {
		this.selectorChangeListeners.push(listener);
	}

	public addShortestRuleChangeListener(listener: (val: boolean) => void) {
		this.shortestRuleChangeListeners.push(listener);
	}

	public addOutlineEnabledChangeListener(listener: (val: boolean) => void) {
		this.outlineEnabledChangeListeners.push(listener);
	}

	public setSelector(selector: string) {
		let oldSelector = this.selector;
		this.clearSelectorOutlines();
		this.selector = selector;

		if (this.shortestRule) {
			this.applyShortestRule(false);
		}
		
		this.updateSelectorOutlines();
		
		if (oldSelector !== this.selector) {
			this.handleSelectorChange();
		}
	}

	public setShortestRule(shortestRule: boolean) {
		this.shortestRule = shortestRule;

		for (const listener of this.shortestRuleChangeListeners) {
			listener(shortestRule);
		}
	}

	public setOutlineEnabled(newValue: boolean) {
		this.clearSelectorOutlines();
		this.outlineEnabled = newValue;
		this.updateSelectorOutlines();

		for (const listener of this.outlineEnabledChangeListeners) {
			listener(newValue);
		}
	}

	public applyShortestRule(handle: boolean = true) {
		let oldSelector = this.selector;
		this.selector = CssSelectorPicker.getShortestSelector(this.targetArea, this.selector);

		if (oldSelector !== this.selector && handle) {
			this.handleSelectorChange();
		}
	}

	public handleSelectorChange() {
		for (const listener of this.selectorChangeListeners) {
			listener(this.selector);
		}
	}

	public updateSelectorOutlines() {
		if (this.outlineEnabled) {
			// Will throw an exception if selector is malformed
			this.targetArea.querySelectorAll(this.selector);

			this.selectedStyleSheetRule = StyleSheets.Rule.create(this.selector);
			this.selectedStyleSheetRule.style.cssText = this.selectedCssText;
		}
	}

	public clearSelectorOutlines() {
		if (this.selectedStyleSheetRule) {
			StyleSheets.Rule.drop(this.selectedStyleSheetRule);
			this.selectedStyleSheetRule = undefined;
		}
	}

	public static getShortestSelector(targetArea: Element, selector: string) {
		let baseItemList = targetArea.querySelectorAll(selector);

		// // Use finder from https://github.com/antonmedv/finder
		// // It does not work with selection of multiple entities
		// if (typeof finder !== "undefined" && baseItemList.length === 1) {
		// 	return finder(baseItemList[0], {
		// 		root: targetArea,
		// 		className: function(name) { return name !== DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS; }
		// 	}).replace(/ > /g, ">");
		// }

		let baseItems: Element[] = [];
		for (let i = 0; i < baseItemList.length; i++) {
			baseItems.push(baseItemList.item(i));
		}

		function isSelectorEquivalent(newSelector: string) {
			const newSelectorItems = targetArea.querySelectorAll(newSelector);

			if (baseItems.length === newSelectorItems.length) {
				return baseItems.every(function (item, i) {
					const samePositionNewSelectorItem = newSelectorItems[i];
					return samePositionNewSelectorItem && item.isEqualNode(samePositionNewSelectorItem);
				});
			}

			return false;
		}

		function getShortestSelectorPart(prefix: string, selector: string) {
			const selectorWithPipes = selector.replace(/([.#:])/g, "|$1");
			const selectorParts = selectorWithPipes.split("|");

			if (selectorParts.length > 1) {
				for (let i = 0; i < selectorParts.length; i++) {
					let part = selectorParts[i];

					if (isSelectorEquivalent(prefix + part)) {
						return prefix + part;
					}
				}
			}

			if (selectorParts.length > 2) {
				for (let i = 0; i < selectorParts.length; i++) {
					let part = selectorParts[i];

					for (let j = 0; j < selectorParts.length; j++) {
						if (i !== j && isSelectorEquivalent(prefix + part + selectorParts[j])) {
							return prefix + part + selectorParts[j];
						}
					}
				}
			}

			if (selectorParts.length > 3) {
				for (let i = 0; i < selectorParts.length; i++) {
					let part = selectorParts[i];

					for (let j = 0; j < selectorParts.length; j++) {
						if (i !== j) {
							let part2 = selectorParts[j];

							for (let k = 0; k < selectorParts.length; k++) {
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


		let lastChevronIndex = selector.lastIndexOf(">");
		let lastElementSelector = selector.substring(lastChevronIndex + 1);

		if (isSelectorEquivalent(lastElementSelector)) {
			selector = getShortestSelectorPart("", lastElementSelector);
		}
		else if (lastChevronIndex > 0) {
			let parentShortestSelector = CssSelectorPicker.getShortestSelector(targetArea, selector.substring(0, lastChevronIndex));
			selector = parentShortestSelector + ">" + lastElementSelector;

			let selectorWithoutChevrons = selector.replace(/>/g," ");
			if (isSelectorEquivalent(selectorWithoutChevrons)) {
				selector = selectorWithoutChevrons;

				let splittedSelectorItems = selector.split(" ");
				if (splittedSelectorItems.length > 2) {
					let extremsSelector = splittedSelectorItems[0] + " " + splittedSelectorItems[splittedSelectorItems.length - 1];

					if (isSelectorEquivalent(extremsSelector)) {
						selector = extremsSelector;
					}
				}
			}

			let lastElementPrefix = selector.substring(0, selector.length - lastElementSelector.length);
			selector = getShortestSelectorPart(lastElementPrefix, lastElementSelector);
		}

		return selector;
	}

	public static connectSelectorInput(cssSelectorPicker: CssSelectorPicker, input: HTMLInputElement) {
		function updateInput() {
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

	public static connectShortestCheckbox(cssSelectorPicker: CssSelectorPicker, checkbox: HTMLInputElement) {
		function updateCheckbox() {
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

	public static connectOutlineCheckbox(cssSelectorPicker: CssSelectorPicker, checkbox: HTMLInputElement) {
		function updateCheckbox() {
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

	public static connectCounter(cssSelectorPicker: CssSelectorPicker, counter: Element) {
		cssSelectorPicker.addSelectorChangeListener(function (selector) {
			let selectedItems = document.querySelectorAll(selector);
			counter.textContent = selectedItems.length.toString();
		});
	}

	public static createFromPlainHtmlInputs(
		targetArea: Element,
		selectorInput: HTMLInputElement,
		counter: Element,
		pathContainer: Element,
		pickerCheckbox: HTMLInputElement,
		uniqueCheckbox: HTMLInputElement,
		outlineCheckbox: HTMLInputElement,
		shortestCheckbox: HTMLInputElement
	) {
		let cssSelectorPicker = new CssSelectorPicker(targetArea);
		let domSelector = new DomSelector(targetArea);

		domSelector.addPickListener(function (_element, selector) {
			cssSelectorPicker.setSelector(selector);
			domSelector.setOutlineEnabled(false);
		});
		domSelector.addSelectorChangeListener(function (selector) {
			pathContainer.textContent = selector;
		});
		cssSelectorPicker.addSelectorChangeListener(function (selector) {
			let firstCurrentSelectedElement = document.querySelector(selector);

			if (firstCurrentSelectedElement) {
				domSelector.setCurrentElement(firstCurrentSelectedElement);
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
}

(window as any).CssSelectorPicker = CssSelectorPicker;
