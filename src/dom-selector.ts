import CssRuleOutliner, {CssRuleOutlineArgs} from "./css-rule-outliner";
import OutlineManager from "./outline-manager";
import CombinedOutliners from "./combined-outliners";
import {getSelectorFromElement} from "./utils";

/**
 * A class that provides DOM element selection functionality with visual feedback.
 * Allows picking elements from a target area, generating unique selectors, and highlighting selected elements.
 */
export default class DomSelector {
	public static readonly OUTLINE_CURRENT_ELEMENT_CLASS = "fw-dom-selector-over-outline";

	private tagTooltipCssText = "color: white; background-color: red; position: absolute; z-index: 99999999; margin-top: -22px; margin-left: -1px; padding: 2px 6px; font-family: sans-serif; font-size: 12px; opacity: .8; pointer-events: none; line-height: 1.4;";

	private picking = false;
	private unique = false;
	private outlineEnabled = false;
	private selector = "";
	private readonly outliner: CombinedOutliners<DomSelectorCombinedOutliners>;
	private element?: Element;
	private overTagTooltip?: Element;
	private readonly targetArea: Element;
	private pickingChangeListeners: ((val: boolean) => void)[] = [];
	private pickListeners: ((element: Element | null, selector: string) => void)[] = [];
	private selectorChangeListeners: ((val: string) => void)[] = [];
	private uniqueChangeListeners: ((val: boolean) => void)[] = [];
	private outlineEnabledChangeListeners: ((val: boolean) => void)[] = [];

	/**
	 * Creates a new DomSelector instance.
	 * @param targetArea - The DOM element within which selection will be active
	 * @param outlineManager - The manager handling element outlining
	 */
	public constructor(targetArea: Element, outlineManager: OutlineManager) {
		this.targetArea = targetArea;
		const selectedOutliner = new CssRuleOutliner(new OutlineManager(), targetArea, "outline: 1px dashed green !important;");
		const overOutliner = new CssRuleOutliner(new OutlineManager(), targetArea, "outline: 1px dashed red !important;");
		this.outliner = new CombinedOutliners<DomSelectorCombinedOutliners>(outlineManager, {
			list: selectedOutliner,
			over: overOutliner
		});

		targetArea.addEventListener("mouseover", this.onTargetAreaMouseOver.bind(this));
		targetArea.addEventListener("click", this.onContainerClick.bind(this));
	}

	/**
	 * Adds a listener that will be called when the selector changes.
	 * @param listener - Function to be called with the new selector value
	 */
	public addSelectorChangeListener(listener: (val: string) => void): void {
		this.selectorChangeListeners.push(listener);
	}

	/**
	 * Adds a listener that will be called when an element is picked.
	 * @param listener - Function to be called with the picked element and its selector
	 */
	public addPickListener(listener: (element: Element | null, selector: string) => void): void {
		this.pickListeners.push(listener);
	}

	/**
	 * Adds a listener that will be called when picking mode changes.
	 * @param listener - Function to be called with the new picking state
	 */
	public addPickingChangeListener(listener: (val: boolean) => void): void {
		this.pickingChangeListeners.push(listener);
	}

	/**
	 * Adds a listener that will be called when unique mode changes.
	 * @param listener - Function to be called with the new unique state
	 */
	public addUniqueChangeListener(listener: (val: boolean) => void): void {
		this.uniqueChangeListeners.push(listener);
	}

	/**
	 * Adds a listener that will be called when outline visibility changes.
	 * @param listener - Function to be called with the new outline visibility state
	 */
	public addOutlineEnabledChangeListener(listener: (val: boolean) => void): void {
		this.outlineEnabledChangeListeners.push(listener);
	}

	/**
	 * Handles mouseover events on the target area.
	 * @private
	 */
	private onTargetAreaMouseOver(e: Event): void {
		if (this.picking && e.target instanceof Element) {
			this.setCurrentElement(e.target);
		}
	}

	/**
	 * Handles click events on the container.
	 * @private
	 */
	private onContainerClick = () => {
		if (this.picking) {
			this.pick();
		}
	};

	/**
	 * Finalizes the element selection process.
	 */
	public pick(): void {
		this.setPicking(false);

		for (const listener of this.pickListeners) {
			listener(this.element || null, this.selector);
		}
	}

	/**
	 * Sets the picking mode state.
	 * @param newValue - Whether picking mode should be enabled
	 */
	public setPicking(newValue: boolean): void {
		this.picking = newValue;
		if (this.picking) {
			this.setOutlineEnabled(true);
		}

		for (const listener of this.pickingChangeListeners) {
			listener(newValue);
		}
		this.clearCurrentElement();
	}

	/**
	 * Sets whether selectors should be unique.
	 * @param newValue - Whether unique selectors should be generated
	 */
	public setUnique(newValue: boolean): void {
		this.unique = newValue;
		for (const listener of this.uniqueChangeListeners) {
			listener(newValue);
		}
	}

	/**
	 * Sets whether element outlines should be visible.
	 * @param newValue - Whether outlines should be shown
	 */
	public setOutlineEnabled(newValue: boolean): void {
		this.clearSelectorOutlines();
		this.outlineEnabled = newValue;
		this.updateSelectorOutlines();
		
		for (const listener of this.outlineEnabledChangeListeners) {
			listener(newValue);
		}
	}

	/**
	 * Sets the current selected element and updates visual feedback.
	 * @param element - The element to set as current
	 */
	public setCurrentElement(element: Element): void {
		this.clearCurrentElement();
		element.classList.add(DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS);
		this.element = element;
		
		this.updateCurrentSelectorFromCurrentElement();
		
		if (this.picking) {
			const tooltip = document.createElement("div");
			tooltip.style.cssText = this.tagTooltipCssText;
			tooltip.textContent = this.selector.substring(this.selector.lastIndexOf(">") + 1);

			this.overTagTooltip = tooltip;

			if (element.firstChild) {
				element.insertBefore(this.overTagTooltip, element.firstChild);
			}
			else {
				element.appendChild(this.overTagTooltip);
			}
		}
	}

	/**
	 * Clears the current selected element and its visual feedback.
	 */
	public clearCurrentElement(): void {
		if (this.element) {
			this.element.classList.remove(DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS);

			if (this.overTagTooltip) {
				this.element.removeChild(this.overTagTooltip);
			}
		}
		
		this.element = undefined;
		this.overTagTooltip = undefined;
	}

	/**
	 * Updates the current selector based on the selected element.
	 */
	public updateCurrentSelectorFromCurrentElement(): void {
		this.setCurrentSelector(
			this.element ?
			DomSelector.getSelectorFromElement(this.targetArea, this.element, this.unique) :
			""
		);
	}

	/**
	 * Sets the current CSS selector.
	 * @param newSelector - The CSS selector to set
	 */
	public setCurrentSelector(newSelector: string): void {
		this.clearSelectorOutlines();
		
		this.selector = newSelector;
		for (const listener of this.selectorChangeListeners) {
			listener(newSelector);
		}
		
		this.updateSelectorOutlines();
	}

	/**
	 * Updates the visual outlines based on the current selector.
	 */
	public updateSelectorOutlines(): void {
		if (this.outlineEnabled) {
			// Will throw an exception if selector is malformed
			this.targetArea.querySelectorAll(this.selector);

			this.outliner.outline({
				list: [this.selector],
				over: [this.selector + "." + DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS]
			});
		}
	}

	/**
	 * Removes all element outlines.
	 */
	public clearSelectorOutlines(): void {
		this.outliner.clear();
	}

	/**
	 * Generates a CSS selector for an element.
	 * @param container - The containing element
	 * @param element - The element to generate a selector for
	 * @param unique - Whether to generate a unique selector
	 * @returns The generated CSS selector
	 */
	public static getSelectorFromElement(container: Element, element: Element, unique: boolean): string {
		return getSelectorFromElement(container, element, unique, [DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS]);
	}

	/**
	 * Connects a DomSelector instance to an input element for selector editing.
	 * @param domSelector - The DomSelector instance
	 * @param input - The input element to connect
	 */
	public static connectSelectorInput(domSelector: DomSelector, input: HTMLInputElement): void {
		function updateInput() {
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

	/**
	 * Connects a DomSelector instance to a checkbox for picking mode control.
	 * @param domSelector - The DomSelector instance
	 * @param checkbox - The checkbox element to connect
	 */
	public static connectPickerCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement): void {
		function updateCheckbox() {
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

	/**
	 * Connects a DomSelector instance to a checkbox for unique selector control.
	 * @param domSelector - The DomSelector instance
	 * @param checkbox - The checkbox element to connect
	 */
	public static connectUniqueCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement): void {
		function updateCheckbox() {
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

	/**
	 * Connects a DomSelector instance to a checkbox for outline visibility control.
	 * @param domSelector - The DomSelector instance
	 * @param checkbox - The checkbox element to connect
	 */
	public static connectOutlineCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement): void {
		function updateCheckbox() {
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

	/**
	 * Creates a DomSelector instance from plain HTML input elements.
	 * @param container - The container element for selection
	 * @param selectorInput - Input element for the selector
	 * @param pickerCheckbox - Checkbox for picking mode
	 * @param uniqueCheckbox - Checkbox for unique selector mode
	 * @param outlineCheckbox - Checkbox for outline visibility
	 * @returns A new DomSelector instance
	 */
	public static createFromPlainHtmlInputs(
		container: Element,
		selectorInput: HTMLInputElement,
		pickerCheckbox: HTMLInputElement,
		uniqueCheckbox: HTMLInputElement,
		outlineCheckbox: HTMLInputElement
	): DomSelector {
		const domSelector = new DomSelector(container, new OutlineManager());
		DomSelector.connectSelectorInput(domSelector, selectorInput);
		DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);
		DomSelector.connectUniqueCheckbox(domSelector, uniqueCheckbox);
		DomSelector.connectOutlineCheckbox(domSelector, outlineCheckbox);
	
		return domSelector;
	}
}

/**
 * Type definition for the combined outliners used in DomSelector
 */
type DomSelectorCombinedOutliners = {
	list: CssRuleOutlineArgs;
	over: CssRuleOutlineArgs;
};
