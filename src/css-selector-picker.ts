
import DomSelector from './dom-selector';
import OutlineManager from "./outline-manager";
import CssRuleOutliner from "./css-rule-outliner";
import PathSelector from "./path-selector";

export default class CssSelectorPicker {
	private readonly targetArea: Element;
	private readonly outliner: CssRuleOutliner;
	private shortestRule = false;
	private outlineEnabled = false;
	private selectorChangeListeners: ((val: string) => void)[] = [];
	private shortestRuleChangeListeners: ((val: boolean) => void)[] = [];
	private outlineEnabledChangeListeners: ((val: boolean) => void)[] = [];
	private selector = "";

	public constructor(targetArea: Element, outlineManager: OutlineManager) {
		this.targetArea = targetArea;
		this.outliner = new CssRuleOutliner(outlineManager, targetArea, "outline: 1px dashed blue !important;");
	}

	public addSelectorChangeListener(listener: (val: string) => void): void {
		this.selectorChangeListeners.push(listener);
	}

	public addShortestRuleChangeListener(listener: (val: boolean) => void): void {
		this.shortestRuleChangeListeners.push(listener);
	}

	public addOutlineEnabledChangeListener(listener: (val: boolean) => void): void {
		this.outlineEnabledChangeListeners.push(listener);
	}

	public setSelector(selector: string): void {
		const oldSelector = this.selector;
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

	public getSelector(): string {
		return this.selector;
	}

	public setShortestRule(shortestRule: boolean): void {
		this.shortestRule = shortestRule;

		for (const listener of this.shortestRuleChangeListeners) {
			listener(shortestRule);
		}
	}

	public setOutlineEnabled(newValue: boolean): void {
		this.clearSelectorOutlines();
		this.outlineEnabled = newValue;
		this.updateSelectorOutlines();

		for (const listener of this.outlineEnabledChangeListeners) {
			listener(newValue);
		}
	}

	public applyShortestRule(handle = true): void {
		const oldSelector = this.selector;
		this.selector = CssSelectorPicker.getShortestSelector(this.targetArea, this.selector);

		if (oldSelector !== this.selector && handle) {
			this.handleSelectorChange();
		}
	}

	public handleSelectorChange(): void {
		for (const listener of this.selectorChangeListeners) {
			listener(this.selector);
		}
	}

	public updateSelectorOutlines(): void {
		if (this.outlineEnabled) {
			// Will throw an exception if selector is malformed
			this.targetArea.querySelectorAll(this.selector);

			this.outliner.outline(this.selector);
		}
	}

	public clearSelectorOutlines(): void {
		this.outliner.clear();
	}

	public static getShortestSelector(targetArea: Element, selector: string): string {
		const baseItemList = targetArea.querySelectorAll(selector);

		// // Use finder from https://github.com/antonmedv/finder
		// // It does not work with selection of multiple entities
		// if (typeof finder !== "undefined" && baseItemList.length === 1) {
		// 	return finder(baseItemList[0], {
		// 		root: targetArea,
		// 		className: function(name) { return name !== DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS; }
		// 	}).replace(/ > /g, ">");
		// }

		const baseItems: Element[] = [];
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
					const part = selectorParts[i];

					if (part && isSelectorEquivalent(prefix + part)) {
						return prefix + part;
					}
				}
			}

			if (selectorParts.length > 2) {
				for (let i = 0; i < selectorParts.length; i++) {
					const part = selectorParts[i];

					for (let j = 0; j < selectorParts.length; j++) {
						if (i !== j && isSelectorEquivalent(prefix + part + selectorParts[j])) {
							return prefix + part + selectorParts[j];
						}
					}
				}
			}

			if (selectorParts.length > 3) {
				for (let i = 0; i < selectorParts.length; i++) {
					const part = selectorParts[i];

					for (let j = 0; j < selectorParts.length; j++) {
						if (i !== j) {
							const part2 = selectorParts[j];

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


		const lastChevronIndex = selector.lastIndexOf(">");
		const lastElementSelector = selector.substring(lastChevronIndex + 1);

		if (isSelectorEquivalent(lastElementSelector)) {
			selector = getShortestSelectorPart("", lastElementSelector);
		}
		else if (lastChevronIndex > 0) {
			const parentShortestSelector = CssSelectorPicker.getShortestSelector(targetArea, selector.substring(0, lastChevronIndex));
			selector = parentShortestSelector + ">" + lastElementSelector;

			const selectorWithoutChevrons = selector.replace(/>/g," ");
			if (isSelectorEquivalent(selectorWithoutChevrons)) {
				selector = selectorWithoutChevrons;

				const splittedSelectorItems = selector.split(" ");
				if (splittedSelectorItems.length > 2) {
					const extremsSelector = splittedSelectorItems[0] + " " + splittedSelectorItems[splittedSelectorItems.length - 1];

					if (isSelectorEquivalent(extremsSelector)) {
						selector = extremsSelector;
					}
				}
			}

			const lastElementPrefix = selector.substring(0, selector.length - lastElementSelector.length);
			selector = getShortestSelectorPart(lastElementPrefix, lastElementSelector);
		}

		return selector;
	}

	public static connectSelectorInput(cssSelectorPicker: CssSelectorPicker, input: HTMLInputElement): void {
		function updateInput() {
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

	public static connectShortestCheckbox(cssSelectorPicker: CssSelectorPicker, checkbox: HTMLInputElement): void {
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

	public static connectOutlineCheckbox(cssSelectorPicker: CssSelectorPicker, checkbox: HTMLInputElement): void {
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

	public static connectCounter(cssSelectorPicker: CssSelectorPicker, counter: Element): void {
		function updateCounter(selector: string) {
			const selectedItems = cssSelectorPicker.targetArea.querySelectorAll(selector);
			counter.textContent = selectedItems.length.toString();
		}

		cssSelectorPicker.addSelectorChangeListener(updateCounter);

		if (cssSelectorPicker.getSelector()) {
			updateCounter(cssSelectorPicker.getSelector());
		}
	}

	public static connectPathSelector(
		domSelector: DomSelector,
		cssSelectorPicker: CssSelectorPicker,
		pathContainer: Element,
		outlineManager: OutlineManager
	): void {
		const pathSelector = new PathSelector(outlineManager, cssSelectorPicker.targetArea, pathContainer);

		domSelector.addSelectorChangeListener(function (selector) {
			pathSelector.setSelector(selector);
		});
		pathSelector.addSelectorChangeListener(function (selector, internal) {
			pathContainer.scrollLeft = pathContainer.scrollWidth - pathContainer.getBoundingClientRect().width + 1;

			if (internal) {
				cssSelectorPicker.setSelector(selector);
			}
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
	): FullHtmlCssSelectorEnv {
		const outlineManager = new OutlineManager();
		const cssSelectorPicker = new CssSelectorPicker(targetArea, outlineManager);
		const domSelector = new DomSelector(targetArea, outlineManager);

		domSelector.addPickListener(function (_element, selector) {
			cssSelectorPicker.setSelector(selector);
		});
		domSelector.addPickingChangeListener(function (picking) {
			if (!picking) {
				domSelector.setOutlineEnabled(false);
			}
		});
		cssSelectorPicker.addSelectorChangeListener(function (selector) {
			const firstCurrentSelectedElement = document.querySelector(selector);

			if (firstCurrentSelectedElement) {
				domSelector.setCurrentElement(firstCurrentSelectedElement);
			}
		});

		DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);
		DomSelector.connectUniqueCheckbox(domSelector, uniqueCheckbox);
		CssSelectorPicker.connectPathSelector(domSelector, cssSelectorPicker, pathContainer, outlineManager);
		CssSelectorPicker.connectSelectorInput(cssSelectorPicker, selectorInput);
		CssSelectorPicker.connectShortestCheckbox(cssSelectorPicker, shortestCheckbox);
		CssSelectorPicker.connectOutlineCheckbox(cssSelectorPicker, outlineCheckbox);
		CssSelectorPicker.connectCounter(cssSelectorPicker, counter);

		return {
			outlineManager,
			domSelector,
			cssSelectorPicker
		};
	}
}

export interface FullHtmlCssSelectorEnv {
	outlineManager: OutlineManager;
	domSelector: DomSelector;
	cssSelectorPicker: CssSelectorPicker;
}
