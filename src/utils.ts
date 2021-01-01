
export function getSelectorFromElement(container: Element, element: Element, unique: boolean, ignoredClasses: string[] = []): string {
    if (container.isEqualNode(element)) {
        return ":scope";
    }

    const id = element.getAttribute("id");
    let classes = [];
    // .classList does not return an Array so we have to cast it
    for (let i = 0; i < element.classList.length; i++) {
        classes.push(element.classList[i]);
    }
    // We do not want to include our own class to the node path
    if (ignoredClasses.length > 0) {
        classes = classes.filter(function (item) {
            return item && ignoredClasses.indexOf(item) === -1;
        });
    }

    let selector = element.tagName.toLowerCase();

    if (id) {
        selector += "#" + id;
    }

    if (classes.length > 0) {
        selector += "." + classes.join(".");
    }

    const parent = element.parentNode;
    if (parent instanceof Element && !document.body.isEqualNode(parent) && !container.isEqualNode(parent)) {
        selector = getSelectorFromElement(container, parent, false, ignoredClasses) + ">" + selector;
    }
    else if (container.isEqualNode(parent)) {
        selector = ":scope>"+selector;
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

                        selector = getSelectorFromElement(container, firstDivergence, false, ignoredClasses) +
                            ":nth-child(" + (previousSiblingsCount + 1) + ")";
                        selector = getSelectorFromElement(firstDivergence, element, true, ignoredClasses)
                            .replace(":scope", selector);
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
