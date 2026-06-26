"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSyncState = loadSyncState;
exports.saveSyncState = saveSyncState;
const fs_1 = require("fs");
const path_1 = require("path");
const DEFAULT_STATE = {
    lastFecId: 0,
    lastMasterSyncAt: null,
};
function loadSyncState(path) {
    if (!(0, fs_1.existsSync)(path)) {
        return { ...DEFAULT_STATE };
    }
    const raw = (0, fs_1.readFileSync)(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
        lastFecId: typeof parsed.lastFecId === 'number' ? parsed.lastFecId : DEFAULT_STATE.lastFecId,
        lastMasterSyncAt: typeof parsed.lastMasterSyncAt === 'string'
            ? parsed.lastMasterSyncAt
            : DEFAULT_STATE.lastMasterSyncAt,
    };
}
function saveSyncState(path, state) {
    const dir = (0, path_1.dirname)(path);
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    (0, fs_1.writeFileSync)(path, JSON.stringify(state, null, 2), 'utf-8');
}
