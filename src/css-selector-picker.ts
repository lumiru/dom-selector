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
		const baseItems = Array.from(targetArea.querySelectorAll(selector));

		function isSelectorEquivalent(newSelector: string) {
			if (!newSelector) {
				return false;
			}
			const newSelectorItems = targetArea.querySelectorAll(newSelector);

			if (baseItems.length === newSelectorItems.length) {
				return baseItems.every(function (item, i) {
					const samePositionNewSelectorItem = newSelectorItems[i];
					return samePositionNewSelectorItem && item.isEqualNode(samePositionNewSelectorItem);
				});
			}

			return false;
		}

		/**
		 * Finds the shortest selector part that matches the given prefix and selector
		 * @param prefix - The prefix to prepend to the selector part
		 * @param selector - The selector part to analyze
		 * @returns The shortest selector that can be used to select the same elements
		 */
		function getShortestSelectorPart(prefix: string, selector: string) {
			const selectorWithPipes = selector.replace(/([.#:])/g, "|$1");
			const selectorParts = selectorWithPipes.split("|");

			/**
			 * Finds a combination of selector parts that matches the given length
			 * @param parts - The parts of the selector to combine
			 * @param combinationLength - The length of the combination to find
			 * @param start - The starting index for the combination
			 * @param current - The current combination being built
			 * @return A selector that can be used to select the same elements, or null if no combination is found
			 */
			function findCombinationOfGivenLength(parts: string[], combinationLength: number, start = 0, current: string[] = []): string | null {
				// Since this method is recursive, we need to check if we have to stop at first
				if (current.length >= combinationLength) {
					const candidate = prefix + current.join('');
					if (isSelectorEquivalent(candidate)) {
						return candidate;
					}
					return null;
				}

				for (let i = start; i < parts.length; i++) {
					current.push(parts[i] as string);
					const result = findCombinationOfGivenLength(parts, combinationLength, i + 1, current);
					if (result) return result;
					current.pop();
				}

				return null;
			}

			// Try combinations from one part
			// We do not try the complete selector since it is the fallback (that is why we stop before the last part)
			for (let k = 1; k <= selectorParts.length; k++) {
				if (selectorParts.length > k) {
					const candidate = findCombinationOfGivenLength(selectorParts, k);
					if (candidate) return prefix + candidate;
				}
			}

			return prefix + selector;
		}

		const lastChevronIndex = selector.lastIndexOf(">");
		const lastElementSelector = selector.substring(lastChevronIndex + 1);

		// If the last selector part is enough to select the same elements, we can return it directly
		if (isSelectorEquivalent(lastElementSelector)) {
			return getShortestSelectorPart("", lastElementSelector);
		}

		// If there is no chevron, we can return the shortest selector part directly
		if (lastChevronIndex <= 0) {
			return getShortestSelectorPart("", selector);
		}
		
		// If the last selector part is not enough, we need to find the shortest parent selector first
		const parentShortestSelector = CssSelectorPicker.getShortestSelector(targetArea, selector.substring(0, lastChevronIndex));
		let result = parentShortestSelector + ">" + lastElementSelector;

		// Then, we check if the selector without chevrons is equivalent to the original selector
		const selectorWithoutChevrons = result.replace(/>/g," ");
		if (isSelectorEquivalent(selectorWithoutChevrons)) {
			result = selectorWithoutChevrons;

			// If chevrons are not needed, we could try to drop some selector parts, so we try to use the extrem selector parts.
			// Please note that, since this method is recursive, we only need to check the extrem selector parts, the other parts are already checked by recursion.
			const splittedSelectorItems = result.split(" ");
			if (splittedSelectorItems.length > 2) {
				const extremsSelector = splittedSelectorItems[0] + " " + splittedSelectorItems[splittedSelectorItems.length - 1];

				if (isSelectorEquivalent(extremsSelector)) {
					result = extremsSelector;
				}
			}
		}

		// Finally, we return the shortest selector that can be used to select the same elements
		const lastElementPrefix = result.substring(0, result.length - lastElementSelector.length);
		return getShortestSelectorPart(lastElementPrefix, lastElementSelector);
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
				if (err instanceof Error) {
					input.setCustomValidity("Invalid selector: " + err.message);
				} else {
					console.error(err);
				}
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
