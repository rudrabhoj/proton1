// Logger facade. Class name kept as `Pino` so the DI graph and existing
// constructor parameter types don't change; the actual implementation is
// just `console.*` calls. We had `pino` as a dependency before, but for the
// four log calls the rest of the app makes, ~30-40 KB of structured-logger
// machinery was overkill. This file is the only place log output is
// produced — swap implementations here without touching call sites.

const APP_TAG = '[proton1]';

export class Pino {
    private _silent: boolean;

    constructor() {
        this._silent = false;
    }

    public info(text: string): void {
        if (this._silent) return;
        console.info(APP_TAG, text);
    }

    public debug(text: string): void {
        if (this._silent) return;
        console.debug(APP_TAG, text);
    }

    public warn(text: string): void {
        if (this._silent) return;
        console.warn(APP_TAG, text);
    }

    public error(text: string): void {
        if (this._silent) return;
        console.error(APP_TAG, text);
    }

    public set_silent(s: boolean): void {
        this._silent = s;
    }
}
