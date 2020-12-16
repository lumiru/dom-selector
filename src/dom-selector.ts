import * as StyleSheets from "./stylesheets";

export class DomSelector {
	public static readonly OUTLINE_CURRENT_ELEMENT_CLASS = "fw-dom-selector-over-outline";
	
	private overCssText: string = "outline: 1px dashed red !important;";
	private selectedCssText: string = "outline: 1px dashed green !important;";
	private tagTooltipCssText: string = "color: white; background-color: red; position: absolute; z-index: 99999999; margin-top: -22px; margin-left: -1px; padding: 2px 6px; font-family: sans-serif; font-size: 12px; opacity: .8; pointer-events: none; line-height: 1.4;";

	private picking: boolean = false;
	private unique: boolean = false;
	private outlineEnabled: boolean = false;
	private selector: string = "";
	private selectedStyleSheetRule?: CSSStyleRule;
	private overStyleSheetRule?: CSSStyleRule;
	private element?: Element;
	private overTagTooltip?: Element;
	private readonly targetArea: Element;
	private pickingChangeListeners: ((val: boolean) => void)[] = [];
	private pickListeners: ((element: Element | null, selector: string) => void)[] = [];
	private selectorChangeListeners: ((val: string) => void)[] = [];
	private uniqueChangeListeners: ((val: boolean) => void)[] = [];
	private outlineEnabledChangeListeners: ((val: boolean) => void)[] = [];

	public constructor(targetArea: Element) {
		this.targetArea = targetArea;
		
		targetArea.addEventListener("mouseover", this.onTargetAreaMouseOver.bind(this));
		targetArea.addEventListener("click", this.onContainerClick.bind(this));
	}

	public addSelectorChangeListener(listener: (val: string) => void) {
		this.selectorChangeListeners.push(listener);
	}

	public addPickListener(listener: (element: Element | null, selector: string) => void) {
		this.pickListeners.push(listener);
	}

	public addPickingChangeListener(listener: (val: boolean) => void) {
		this.pickingChangeListeners.push(listener);
	}

	public addUniqueChangeListener(listener: (val: boolean) => void) {
		this.uniqueChangeListeners.push(listener);
	}

	public addOutlineEnabledChangeListener(listener: (val: boolean) => void) {
		this.outlineEnabledChangeListeners.push(listener);
	}

	private onTargetAreaMouseOver(e: Event) {
		if (this.picking && e.target instanceof Element) {
			this.setCurrentElement(e.target);
		}
	}

	private onContainerClick() {
		if (this.picking) {
			this.pick();
		}
	}

	public pick() {
		this.setPicking(false);
		
		for (const listener of this.pickListeners) {
			listener(this.element || null, this.selector);
		}
	}

	public setPicking(newValue: boolean) {
		this.picking = newValue;
		if (this.picking) {
			this.setOutlineEnabled(true);
		}

		for (const listener of this.pickingChangeListeners) {
			listener(newValue);
		}
		this.clearCurrentElement();
	}

	public setUnique(newValue: boolean) {
		this.unique = newValue;
		for (const listener of this.uniqueChangeListeners) {
			listener(newValue);
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

	public setCurrentElement(element: Element) {
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

	public clearCurrentElement() {
		if (this.element) {
			this.element.classList.remove(DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS);

			if (this.overTagTooltip) {
				this.element.removeChild(this.overTagTooltip);
			}
		}
		
		this.element = undefined;
		this.overTagTooltip = undefined;
	}

	public updateCurrentSelectorFromCurrentElement() {
		this.setCurrentSelector(
			this.element ?
			DomSelector.getSelectorFromElement(this.targetArea, this.element, this.unique) :
			""
		);
	}

	public setCurrentSelector(newSelector: string) {
		this.clearSelectorOutlines();
		
		this.selector = newSelector;
		for (const listener of this.selectorChangeListeners) {
			listener(newSelector);
		}
		
		this.updateSelectorOutlines();
	}

	public updateSelectorOutlines() {
		if (this.outlineEnabled) {
			// Will throw an exception if selector is malformed
			this.targetArea.querySelectorAll(this.selector);
			
			this.selectedStyleSheetRule = StyleSheets.Rule.create(this.selector);
			this.selectedStyleSheetRule.style.cssText = this.selectedCssText;
			this.overStyleSheetRule = StyleSheets.Rule.create(this.selector + "." + DomSelector.OUTLINE_CURRENT_ELEMENT_CLASS);
			this.overStyleSheetRule.style.cssText = this.overCssText;
		}
	}

	public clearSelectorOutlines() {
		if (this.selectedStyleSheetRule) {
			StyleSheets.Rule.drop(this.selectedStyleSheetRule);
			this.selectedStyleSheetRule = undefined;
		}
		if (this.overStyleSheetRule) {
			StyleSheets.Rule.drop(this.overStyleSheetRule);
			this.overStyleSheetRule = undefined;
		}
	}

	public static getSelectorFromElement(container: Element, element: Element, unique: boolean) {
		if (container.isEqualNode(element)) {
			return "";
		}
	
		let id = element.getAttribute("id");
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
				let selectedElements = container.querySelectorAll(selector);
	
				// If several elements was found
				if (selectedElements.length > 1) {
					let pathes: Element[][] = [];
					for (let i = 0; i < selectedElements.length; i++) {
						const item = selectedElements[i];

						if (item) {
							pathes.push([ item ]);
						}
					}
	
					// Search for the last common element in element breadcrumb
					let found = false;
					let testingParent: Element;
	
					// Note: Every element should have the same depth since the selector is restricted enough
					do {
						for (const item of pathes) {
							const firstItemParent = item[0]?.parentNode;

							if (firstItemParent instanceof Element) {
								item.unshift(firstItemParent);
							}
						}
	
						if (!pathes[0] || !pathes[0][0]) {
							break;
						}

						testingParent = pathes[0] && pathes[0][0];
						if (pathes.every(function (v) { return v[0] && testingParent.isEqualNode(v[0]); })) {
							found = true;
						}
					} while (
						!found &&
						!document.body.isEqualNode(testingParent.parentNode) &&
						!container.isEqualNode(testingParent.parentNode)
					);
	
					if (found) {
						const currentNodePath = pathes.find(function (item) {
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
	};
	
	public static connectSelectorInput(domSelector: DomSelector, input: HTMLInputElement) {
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
	
	public static connectPickerCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement) {
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
	
	public static connectUniqueCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement) {
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
	
	public static connectOutlineCheckbox(domSelector: DomSelector, checkbox: HTMLInputElement) {
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
	) {
		const domSelector = new DomSelector(container);
		DomSelector.connectSelectorInput(domSelector, selectorInput);
		DomSelector.connectPickerCheckbox(domSelector, pickerCheckbox);
		DomSelector.connectUniqueCheckbox(domSelector, uniqueCheckbox);
		DomSelector.connectOutlineCheckbox(domSelector, outlineCheckbox);
	
		return domSelector;
	}
	
}

(window as any).DomSelector = DomSelector;
