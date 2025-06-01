/**
 * Interface for typed event target to ensure type safety in event handling.
 */
export default interface TypedEventTarget<T> extends Omit<EventTarget, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> {
    addEventListener<K extends keyof T>(
        type: K,
        listener: (ev: CustomEvent<T[K]>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;

    on<K extends keyof T>(
        type: K,
        listener: (ev: T[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): void;

    removeEventListener<K extends keyof T>(
        type: K,
        listener: (ev: CustomEvent<T[K]>) => void,
        options?: boolean | EventListenerOptions
    ): void;

    dispatchEvent(evt: CustomEvent<T[keyof T]>): boolean;
}
