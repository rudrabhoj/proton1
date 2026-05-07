import pino from 'pino';

const APP_NAME = 'Proton 1';
const LOG_LEVEL = 'debug';

export class Pino {
    private _logger: pino.Logger;

    constructor() {
        this._logger = pino({
            name: APP_NAME,
            level: LOG_LEVEL,
            browser: {
                asObject: false,
            },
        });
    }

    public info(text_to_print: string) {
        this._logger.info(text_to_print);
    }

    public debug(text_to_print: string) {
        this._logger.debug(text_to_print);
    }

    public warn(text_to_print: string) {
        this._logger.warn(text_to_print);
    }

    public error(text_to_print: string) {
        this._logger.error(text_to_print);
    }

    public set_silent(s: boolean) {
        this._logger.level = s ? 'silent' : LOG_LEVEL;
    }
}
