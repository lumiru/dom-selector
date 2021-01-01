import Outliner from "./outliner";
import OutlineManager from "./outline-manager";
import {getSelectorFromElement} from "./utils";

export default class CssRuleOutliner implements Outliner<CssRuleOutlineArgs> {
	private readonly manager: OutlineManager;
	private readonly cssText: string;
	private readonly scopeSelector: string;
	private selector: string;
	private rule?: CSSStyleRule;

	public constructor(manager: OutlineManager, scope: Element, cssText: string) {
		this.manager = manager;
		this.cssText = cssText;
		this.scopeSelector = getSelectorFromElement(document.body, scope, true).replace(":scope", "body");
		this.selector = "";
	}

	public outline(selector: string): void {
		if (!this.selector) {
			this.selector = selector;
			this.manager.add(this);
		}
	}

	public show(): void {
		if (!this.rule && this.selector) {
			this.rule = CssRuleOutliner.createRule(this.selector.replace(":scope", this.scopeSelector));
			this.rule.style.cssText = this.cssText;
		}
	}

	public hide(): void {
		if (this.rule) {
			CssRuleOutliner.dropRule(this.rule);
			this.rule = undefined;
		}
	}

	public clear(): void {
		if (this.selector) {
			this.manager.remove(this);
			this.selector = "";
		}
	}

	private static createRule(rule: string): CSSStyleRule {
		let sheet: CSSStyleSheet | null = null;
		
		for (let i = 0, l = document.styleSheets.length; i < l; ++i) {
			const sheetItem = document.styleSheets[i];
			// Exclude CSS @media specific styleSheets
			if (typeof sheetItem === "object" && !sheetItem.media.mediaText) {
				sheet = sheetItem;
			}
		}

		// Append inline stylesheet if none found
		if (!sheet) {
			const styleTag = document.createElement("style");
			styleTag.setAttribute("type", "text/css");
			document.head.appendChild(styleTag);
			sheet = styleTag.sheet;
		}

		if (!sheet) {
			throw new Error("Cannot retrieve a stylesheet to edit.");
		}

		// Create CSS rule
		const index = sheet.cssRules.length;
		sheet.insertRule(rule+"{}", index);

		// Return the new rule object, so we can modify or drop it
		const result = sheet.cssRules[index];
		
		if (!(result instanceof CSSStyleRule)) {
			throw new Error("Cannot create a CSS rule.");
		}

		return result;
	}

	private static dropRule(rule: CSSRule): void {
		const sheet = rule.parentStyleSheet;

		if (sheet) {
			const rules = sheet.cssRules;

			for (let i = 0, l = rules.length; i < l; ++i) {
				if(rules[i] === rule) {
					sheet.deleteRule(i);

					// Stop when first found
					return;
				}
			}
		}
	}
}

export type CssRuleOutlineArgs = [selector: string];
