"use strict";

if (typeof window.StyleSheets === "undefined") {
	window.StyleSheets = {};
}

StyleSheets.Rule = {
	create: function(rule) {
		var sheet;
		
		for(var i = 0, l = document.styleSheets.length; i < l; ++i) {
			// Exclude CSS @media specific styleSheets
			if(typeof(document.styleSheets[i].media) === "string" ?
			 !document.styleSheets[i].media : !document.styleSheets[i].media.mediaText) {
				sheet = document.styleSheets[i];
			}
		}

		// Append inline stylesheet if none found
		if(!sheet) {
			var styleTag = document.createElement("style");
			styleTag.setAttribute("type", "text/css");
			document.head.appendChild(styleTag);
			sheet = styleTag.sheet;
		}

		// Create CSS rule
		var index = sheet.cssRules.length;
		sheet.insertRule(rule+"{}", index);

		// Return the new rule object, so we can modify or drop it
		return sheet.cssRules[index];
	},
	drop: function(rule) {
		var rules = rule.parentStyleSheet.cssRules;

		for(var i = 0, l = rules.length; i < l; ++i) {
			if(rules[i] === rule) {
				rule.parentStyleSheet.deleteRule(i);

				// Stop when first found
				return;
			}
		}
	}
};
