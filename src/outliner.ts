
export default interface Outliner<T extends unknown[] = unknown[]> {
    outline(...args: T): void;
    show(): void;
    hide(): void;
    clear(): void;
}
