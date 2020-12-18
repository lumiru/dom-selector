import CssRuleOutliner, {CssRuleOutlineArgs} from "./css-rule-outliner";
import OutlineManager from "./outline-manager";
import CombinedOutliners from "./combined-outliners";

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

	public constructor(targetArea: Element, outlineManager: OutlineManager) {
		this.targetArea = targetArea;
		const selectedOutliner = new CssRuleOutliner(new OutlineManager(), "outline: 1px dashed green !important;");
		const overOutliner = new CssRuleOutliner(new OutlineManager(), "outline: 1px dashed red !important;");
		this.outliner = new CombinedOutliners<DomSelectorCombinedOutliners>(outlineManager, {
			list: selectedOutliner,
			over: overOutliner
		});

		targetArea.addEventListener("mouseover", this.onTargetAreaMouseOver.bind(this));
		targetArea.addEventListener("click", this.onContainerClick.bind(this));
	}

	public addSelectorChangeListener(listener: (val: string) => void): void {
		this.selectorChangeListeners.push(listener);
	}

	public addPickListener(listener: (element: Element | null, selector: string) => void): void {
		this.pickListeners.push(listener);
	}

	public addPickingChangeListener(listener: (val: boolean) => void): void {
		this.pickingChangeListeners.push(listener);
	}

	public addUniqueChangeListener(listener: (val: boolean) => void): void {
		this.uniqueChangeListeners.push(listener);
	}

	public addOutlineEnabledChangeListener(listener: (val: boolean) => void): void {
		this.outlineEnabledChangeListeners.push(listener);
	}

	private onTargetAreaMouseOver(e: Event): void {
		if (this.picking && e.target instanceof Element) {
			this.setCurrentElement(e.target);
		}
	}

	private onContainerClick = () => {
		if (this.picking) {
			this.pick();
		}
	};

	public pick(): void {
		this.setPicking(false);

		for (const listener of this.pickListeners) {
			listener(this.element || null, this.selector);
		}
	}

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

	public setUnique(newValue: boolean): void {
		this.unique = newValue;
		for (const listener of this.uniqueChangeListeners) {
			listener(newValue);
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

	public updateCurrentSelectorFromCurrentElement(): void {
		this.setCurrentSelector(
			this.element ?
			DomSelector.getSelectorFromElement(this.targetArea, this.element, this.unique) :
			""
		);
	}

	public setCurrentSelector(newSelector: string): void {
		this.clearSelectorOutlines();
		
		this.selector = newSelector;
		for (const listener of this.selectorChangeListeners) {
			listener(newSelector);
		}
		
		this.updateSelectorOutlines();
	}

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

	public clearSelectorOutlines(): void {
		this.outliner.clear();
	}

	public static getSelectorFromElement(container: Element, element: Element, unique: boolean): string {
		if (container.isEqualNode(element)) {
			return "";
		}
	
		const id = element.getAttribute("id");
		let classes = [];
		// .classList does not return an Array so we have to cast it
		for (let i = 0; i < element.classList.length; i++) {
			classes.push(element.classList[i]);
		}
		// We do not want to include our own class to the node path
		classes = classes.filter(function (item) {
			return item !== DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS;
		});
	
		let selector = element.tagName.toLowerCase();
	
		if (id) {
			selector += "#" + id;
		}
	
		if (classes.length > 0) {
			selector += "." + classes.join(".");
		}
	
		const parent = element.parentNode;
		if (parent instanceof Element && !document.body.isEqualNode(parent) && !container.isEqualNode(parent)) {
			selector = DomSelector.getSelectorFromElement(container, parent, false) + ">" + selector;
		}
	
		if (unique) {
			try {
				const selectedElements = container.querySelectorAll(selector);
	
				// If several elements was found
				if (selectedElements.length > 1) {
					const paths: Element[][] = [];
					for (let i = 0; i < selectedElements.length; i++) {
						const item = selectedElements[i];

						if (item) {
							paths.push([ item ]);
						}
					}
	
					// Search for the last common element in element breadcrumb
					let found = false;
					let testingParent: Element;
	
					// Note: Every element should have the same depth since the selector is restricted enough
					do {
						for (const item of paths) {
							const firstItemParent = item[0]?.parentNode;

							if (firstItemParent instanceof Element) {
								item.unshift(firstItemParent);
							}
						}
	
						if (!paths[0] || !paths[0][0]) {
							break;
						}

						testingParent = paths[0] && paths[0][0];
						if (paths.every(function (v) { return v[0] && testingParent.isEqualNode(v[0]); })) {
							found = true;
						}
					} while (
						!found &&
						!document.body.isEqualNode(testingParent.parentNode) &&
						!container.isEqualNode(testingParent.parentNode)
					);
	
					if (found) {
						const currentNodePath = paths.find(function (item) {
							const itemElement = item[item.length - 1];
							return itemElement && element.isEqualNode(itemElement);
						});
						const firstDivergence = currentNodePath && currentNodePath[1];

						if (firstDivergence) {
							let currentElement = firstDivergence;
							let previousSiblingsCount = 0;

							while (currentElement.previousElementSibling) {
								++previousSiblingsCount;
								currentElement = currentElement.previousElementSibling;
							}

							selector = DomSelector.getSelectorFromElement(container, firstDivergence, false) +
								":nth-child(" + (previousSiblingsCount + 1) + ")";
							const innerSelector = DomSelector.getSelectorFromElement(firstDivergence, element, true);
							if (innerSelector) {
								selector += ">" + innerSelector;
							}
						}
					}
				}
			}
			catch (err) {
				// console.warn(err);
			}
		}
	
		return selector;
	}
	
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

type DomSelectorCombinedOutliners = {
	list: CssRuleOutlineArgs;
	over: CssRuleOutlineArgs;
};
