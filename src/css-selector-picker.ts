import DomSelector from "./dom-selector";
import OutlineManager from "./outline-manager";
import CssRuleOutliner from "./css-rule-outliner";
import PathSelector from "./path-selector";
import TypedEventTarget from "./typed-event-target";

/**
 * A class that manages CSS selector picking and related functionality.
 * 
 * @class CssSelectorPicker
 * 
 * @property {Element} targetArea - The DOM element where selector picking is active
 * @property {CssRuleOutliner} outliner - Handles visual outlining of selected elements
 * @property {boolean} shortestRule - Flag indicating if shortest possible selector should be used
 * @property {boolean} outlineEnabled - Flag indicating if visual outlining is enabled
 * @property {string} selector - Current CSS selector string
 * 
 * @example
 * ```typescript
 * const targetArea = document.querySelector("#myArea");
 * const outlineManager = new OutlineManager();
 * const picker = new CssSelectorPicker(targetArea, outlineManager);
 * ```
 */
export default class CssSelectorPicker extends (EventTarget as new() => TypedEventTarget<CssSelectorPickerEventMap>) {
	private readonly targetArea: Element;
	private readonly outliner: CssRuleOutliner;
	private shortestRule = false;
	private outlineEnabled = false;
	private selector = "";

	public constructor(targetArea: Element, outlineManager: OutlineManager) {
		super();
		this.targetArea = targetArea;
		this.outliner = new CssRuleOutliner(outlineManager, targetArea, "outline: 1px dashed blue !important;");
	}

	public on<K extends keyof CssSelectorPickerEventMap>(type: K, listener: (ev: CssSelectorPickerEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void {
		this.addEventListener(type, (ev: CustomEvent<CssSelectorPickerEventMap[K]>) => {
			listener(ev.detail);
		}, options);
	}

	/**
	 * Sets the current CSS selector and updates related states
	 * @param selector - The CSS selector string to set
	 */
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

	/**
	 * Returns the current CSS selector
	 * @returns The current CSS selector string
	 */
	public getSelector(): string {
		return this.selector;
	}

	/**
	 * Sets whether to use the shortest possible selector
	 * @param shortestRule - Boolean indicating if shortest rule should be used
	 */
	public setShortestRule(shortestRule: boolean): void {
		this.shortestRule = shortestRule;
		this.emit("shortest-rule-change", shortestRule);
	}

	/**
	 * Enables or disables the visual outline of selected elements
	 * @param newValue - Boolean indicating if outline should be enabled
	 */
	public setOutlineEnabled(newValue: boolean): void {
		this.clearSelectorOutlines();
		this.outlineEnabled = newValue;
		this.updateSelectorOutlines();
		this.emit("outline-enabled-change", newValue);
	}

	/**
	 * Attempts to find and apply the shortest equivalent CSS selector
	 * @param handle - Whether to trigger selector change handlers
	 */
	public applyShortestRule(handle = true): void {
		const oldSelector = this.selector;
		this.selector = CssSelectorPicker.getShortestSelector(this.targetArea, this.selector);

		if (oldSelector !== this.selector && handle) {
			this.handleSelectorChange();
		}
	}

	/**
	 * Notifies all selector change listeners of the current selector
	 */
	public handleSelectorChange(): void {
		this.emit("selector-change", this.selector);
	}

	/**
	 * Updates the visual outline for elements matching the current selector
	 */
	public updateSelectorOutlines(): void {
		if (this.outlineEnabled) {
			// Will throw an exception if selector is malformed
			this.targetArea.querySelectorAll(this.selector);

			this.outliner.outline(this.selector);
		}
	}

	/**
	 * Removes all current visual outlines
	 */
	public clearSelectorOutlines(): void {
		this.outliner.clear();
	}

	/**
	 * Finds the shortest possible selector that selects the same elements
	 * @param targetArea - The root element to search within
	 * @param selector - The original selector to optimize
	 * @returns The shortest equivalent CSS selector
	 */
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

	/**
	 * Connects an input element to the selector picker for two-way binding
	 * @param cssSelectorPicker - The selector picker instance
	 * @param input - The input element to connect
	 */
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

		cssSelectorPicker.on("selector-change", function (selector) {
			input.value = selector;
			input.setCustomValidity("");
		});
	}

	/**
	 * Connects a checkbox to control the shortest rule feature
	 * @param cssSelectorPicker - The selector picker instance
	 * @param checkbox - The checkbox element to connect
	 */
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

		cssSelectorPicker.on("shortest-rule-change", function (show) {
			checkbox.checked = show;
		});
	}

	/**
	 * Connects a checkbox to control the outline visibility
	 * @param cssSelectorPicker - The selector picker instance
	 * @param checkbox - The checkbox element to connect
	 */
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

		cssSelectorPicker.on("outline-enabled-change", function (show) {
			checkbox.checked = show;
		});
	}

	/**
	 * Connects an element to display the count of matched elements
	 * @param cssSelectorPicker - The selector picker instance
	 * @param counter - The element to display the count
	 */
	public static connectCounter(cssSelectorPicker: CssSelectorPicker, counter: Element): void {
		function updateCounter(selector: string) {
			const selectedItems = cssSelectorPicker.targetArea.querySelectorAll(selector);
			counter.textContent = selectedItems.length.toString();
		}

		cssSelectorPicker.on("selector-change", (e) => updateCounter(e));

		if (cssSelectorPicker.getSelector()) {
			updateCounter(cssSelectorPicker.getSelector());
		}
	}

	/**
	 * Connects a path selector to the selector picker
	 * @param domSelector - The DOM selector instance
	 * @param cssSelectorPicker - The selector picker instance
	 * @param pathContainer - The container element for the path selector
	 * @param outlineManager - The outline manager instance
	 */
	public static connectPathSelector(
		domSelector: DomSelector,
		cssSelectorPicker: CssSelectorPicker,
		pathContainer: Element,
		outlineManager: OutlineManager
	): void {
		const pathSelector = new PathSelector(outlineManager, cssSelectorPicker.targetArea, pathContainer);

		domSelector.on("selector-change", function (selector) {
			pathSelector.setSelector(selector);
		});
		pathSelector.on("selector-changed", function ({ value, internal }) {
			pathContainer.scrollLeft = pathContainer.scrollWidth - pathContainer.getBoundingClientRect().width + 1;

			if (internal) {
				cssSelectorPicker.setSelector(value);
			}
		});
	}

	/**
	 * Creates a complete selector environment from HTML inputs
	 * @param targetArea - The root element to search within
	 * @param selectorInput - Input element for the CSS selector
	 * @param counter - Element to display match count
	 * @param pathContainer - Container for the path selector
	 * @param pickerCheckbox - Checkbox to enable/disable picker
	 * @param uniqueCheckbox - Checkbox to enable/disable unique selection
	 * @param outlineCheckbox - Checkbox to enable/disable outline
	 * @param shortestCheckbox - Checkbox to enable/disable shortest rule
	 * @returns An object containing the created selector environment
	 */
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

		domSelector.on("element-picked", function ({ selector }) {
			cssSelectorPicker.setSelector(selector);
		});
		domSelector.on("picking-change", function (picking) {
			if (!picking) {
				domSelector.setOutlineEnabled(false);
			}
		});
		cssSelectorPicker.on("selector-change", function (selector) {
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

	/**
	 * Emits an event to all registered listeners
	 * @param type - The event type
	 * @param detail - The value to pass to listeners
	 */
	private emit<K extends keyof CssSelectorPickerEventMap>(type: K, detail: CssSelectorPickerEventMap[K]): void {
		const event = new CustomEvent(type, { detail });
		this.dispatchEvent(event);
	}
}

export interface FullHtmlCssSelectorEnv {
	outlineManager: OutlineManager;
	domSelector: DomSelector;
	cssSelectorPicker: CssSelectorPicker;
}

/**
 * Les types d"événements disponibles
 */
interface CssSelectorPickerEventMap {
	"selector-change": string;
	"shortest-rule-change": boolean;
	"outline-enabled-change": boolean;
}
