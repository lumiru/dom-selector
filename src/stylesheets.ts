
const Rule = {
	create: function(rule: string) {
		let sheet: CSSStyleSheet | null = null;
		
		for (let i = 0, l = document.styleSheets.length; i < l; ++i) {
			const sheetItem = document.styleSheets[i];
			// Exclude CSS @media specific styleSheets
			if(typeof sheetItem === "object" && (typeof sheetItem.media === "string" ?
			 !sheetItem.media : !sheetItem.media.mediaText)) {
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
	},
	drop: function(rule: CSSRule) {
		if (rule.parentStyleSheet) {
			const rules = rule.parentStyleSheet.cssRules;

			for (let i = 0, l = rules.length; i < l; ++i) {
				if(rules[i] === rule) {
					rule.parentStyleSheet.deleteRule(i);

					// Stop when first found
					return;
				}
			}
		}
	}
};

(window as any).StyleSheets = { Rule };

export { Rule };
