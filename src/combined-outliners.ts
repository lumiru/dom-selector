import Outliner from "./outliner";
import OutlineManager from "./outline-manager";

export default class CombinedOutliners<T extends BaseOutlineArgsList> implements Outliner<[T]> {
    private readonly manager: OutlineManager;
    private readonly outliners: OutlinerFromArgList<T>;

    public constructor(manager: OutlineManager, outliners: OutlinerFromArgList<T>) {
        this.manager = manager;
        this.outliners = outliners;
    }

    public outline(argsList: T): void {
        for (const k in this.outliners) {
            const outliner = this.outliners[k];
            const args = argsList[k];

            if (outliner && args) {
                outliner.outline(...args);
            }
        }

        this.manager.add(this);
    }

    public show(): void {
        for (const k in this.outliners) {
            this.outliners[k].show();
        }
    }

    public hide(): void {
        for (const k in this.outliners) {
            this.outliners[k].hide();
        }
    }

    public clear(): void {
        this.manager.remove(this);

        for (const k in this.outliners) {
            this.outliners[k].clear();
        }
    }
}

export type OutlineArgs<T> = T extends Outliner<infer R> ? R : never;
type BaseOutlineArgsList = { [name: string]: unknown[]; };
type OutlinerFromArgList<T extends BaseOutlineArgsList> = {
    [K in keyof T]: Outliner<T[K]>;
};
