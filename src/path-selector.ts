import OutlineManager from "./outline-manager";
import CssRuleOutliner from "./css-rule-outliner";
import Outliner from "./outliner";
import TypedEventTarget from "./typed-event-target";

export default class PathSelector extends (EventTarget as new() => TypedEventTarget<PathSelectorEventMap>) {
    private readonly outliner: Outliner;
    private readonly pathContainer: Element;
    private selector = "";

    public constructor(outlineManager: OutlineManager, targetArea: Element, pathContainer: Element) {
        super();
        this.outliner = new CssRuleOutliner(outlineManager, targetArea, "outline: 1px dashed purple !important;");
        this.pathContainer = pathContainer;
    }

	public on<K extends keyof PathSelectorEventMap>(type: K, listener: (ev: PathSelectorEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void {
		this.addEventListener(type, (ev: CustomEvent<PathSelectorEventMap[K]>) => {
			listener(ev.detail);
		}, options);
	}

    public setSelector(selector: string): void {
        this.setSelectorInner(selector, false);
    }

    private setSelectorInner(selector: string, internal: boolean): void {
        if (selector !== this.selector) {
            this.selector = selector;

            const selectorItemParts = selector.split(">");
            let i = 0;

            if (selectorItemParts.length > 0) {
                const pathNodes = this.pathContainer.childNodes;

                // Check if existing items are the same
                for (; i < selectorItemParts.length; i++) {
                    const selectorItemPart = selectorItemParts[i] || "";
                    const pathNode = pathNodes[i];

                    // Stop to first different item
                    if (!pathNode || pathNode.textContent !== selectorItemPart) {
                        break;
                    }
                }

                // Clear changed items
                while (this.pathContainer.childNodes.length > i && this.pathContainer.lastChild) {
                    this.pathContainer.removeChild(this.pathContainer.lastChild);
                }
            }

            const itemClass = this.pathContainer.getAttribute("data-item-class") || "";
            for (; i < selectorItemParts.length; i++) {
                const selectorItemPart = selectorItemParts[i] || "";
                const selectorItemPath = selectorItemParts.slice(0, i + 1).join(">");

                if (selectorItemPart === ":scope") {
                    continue;
                }

                const selectorItemButton = document.createElement("button");
                selectorItemButton.className = itemClass;
                selectorItemButton.textContent = selectorItemPart;
                selectorItemButton.addEventListener("mouseover", () => {
                    this.outliner.outline(selectorItemPath);
                });
                selectorItemButton.addEventListener("mouseout", () => {
                    this.outliner.clear();
                });
                selectorItemButton.addEventListener("click", () => {
                    this.setSelectorInner(selectorItemPath, true);
                });

                this.pathContainer.appendChild(selectorItemButton);
            }

            this.handleSelectorChange(internal);
        }
    }

    private handleSelectorChange(internal: boolean) {
        this.dispatchEvent(new CustomEvent("selector-changed", {
            detail: { value: this.selector, internal },
            bubbles: true,
            composed: true
        }));
    }
}

interface PathSelectorEventMap {
    "selector-changed": { value: string, internal: boolean };
}
