import OutlineManager from "./outline-manager";
import CssRuleOutliner from "./css-rule-outliner";
import Outliner from "./outliner";

export default class PathSelector {
    private readonly outliner: Outliner;
    private readonly pathContainer: Element;
    private selector = "";
    private selectorChangeListeners: ((val: string, internal: boolean) => void)[] = [];

    public constructor(outlineManager: OutlineManager, pathContainer: Element) {
        this.outliner = new CssRuleOutliner(outlineManager, "outline: 1px dashed purple !important;");
        this.pathContainer = pathContainer;
    }

    public addSelectorChangeListener(listener: (val: string, internal: boolean) => void): void {
        this.selectorChangeListeners.push(listener);
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
        for (const listener of this.selectorChangeListeners) {
            listener(this.selector, internal);
        }
    }
}
