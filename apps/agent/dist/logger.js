"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    constructor(level = 'info') {
        this.level = level;
    }
    shouldLog(level) {
        return LEVELS[level] >= LEVELS[this.level];
    }
    log(level, message, meta) {
        if (!this.shouldLog(level))
            return;
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        if (meta !== undefined) {
            console.log(`${prefix} ${message}`, meta);
        }
        else {
            console.log(`${prefix} ${message}`);
        }
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
}
exports.Logger = Logger;
