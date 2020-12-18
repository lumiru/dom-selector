
import DomSelector from "./dom-selector";
import CssSelectorPicker from "./css-selector-picker";

interface ExportedWindow {
    DomSelector?: typeof DomSelector;
    CssSelectorPicker?: typeof CssSelectorPicker;
}

// Export main classes to window global object
const global: Window & ExportedWindow = window;
global.DomSelector = DomSelector;
global.CssSelectorPicker = CssSelectorPicker;
