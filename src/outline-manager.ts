import Outliner from "./outliner";

export default class OutlineManager {
	private readonly stack: Outliner[];

	public constructor() {
		this.stack = [];
	}

	public add(outliner: Outliner): void {
		const size = this.stack.length;
		if (size > 0) {
			const currentOutlinedElement = this.stack[size - 1];
			if (currentOutlinedElement) {
				currentOutlinedElement.hide();
			}
		}

		this.stack.push(outliner);
		console.log(size);
		outliner.show();
	}

	public remove(outliner: Outliner): void {
		for (let i = 0; i < this.stack.length; i++){
			if (outliner == this.stack[i]) {
				outliner.hide();
				this.stack.splice(i, 1);
				console.log(i);
				break;
			}
		}

		const size = this.stack.length;
		if (size > 0) {
			const currentOutlinedElement = this.stack[size - 1];
			if (currentOutlinedElement) {
				currentOutlinedElement.show();
			}
		}
	}
}

