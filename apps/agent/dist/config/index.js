"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = require("fs");
const path_1 = require("path");
function getEnv(key, fallback) {
    var _a;
    return (_a = process.env[key]) !== null && _a !== void 0 ? _a : fallback;
}
function parseNumber(value, fallback) {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function isLogLevel(value) {
    return ['debug', 'info', 'warn', 'error'].includes(value);
}
function loadJsonConfig(path) {
    if (!(0, fs_1.existsSync)(path)) {
        return {};
    }
    const raw = (0, fs_1.readFileSync)(path, 'utf-8');
    return JSON.parse(raw);
}
function loadConfig() {
    var _a, _b, _c, _d, _e;
    const configPath = getEnv('AGENT_CONFIG_PATH', './config/agent.json');
    const jsonConfig = loadJsonConfig((0, path_1.resolve)(configPath));
    const numierDataPath = getEnv('NUMIER_DATA_PATH', (_a = jsonConfig.numierDataPath) !== null && _a !== void 0 ? _a : '');
    const apiBaseUrl = getEnv('API_BASE_URL', (_b = jsonConfig.apiBaseUrl) !== null && _b !== void 0 ? _b : '');
    const agentApiKey = getEnv('AGENT_API_KEY', (_c = jsonConfig.agentApiKey) !== null && _c !== void 0 ? _c : '');
    if (!numierDataPath) {
        throw new Error('Missing required config: numierDataPath (NUMIER_DATA_PATH)');
    }
    if (!apiBaseUrl) {
        throw new Error('Missing required config: apiBaseUrl (API_BASE_URL)');
    }
    if (!agentApiKey) {
        throw new Error('Missing required config: agentApiKey (AGENT_API_KEY)');
    }
    const logLevelEnv = getEnv('LOG_LEVEL', (_d = jsonConfig.logLevel) !== null && _d !== void 0 ? _d : 'info');
    const logLevel = isLogLevel(logLevelEnv) ? logLevelEnv : 'info';
    const stateFilePath = getEnv('STATE_FILE_PATH', (_e = jsonConfig.stateFilePath) !== null && _e !== void 0 ? _e : './data/agent-state.json');
    return {
        numierDataPath,
        apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
        agentApiKey,
        pollSeconds: parseNumber(getEnv('POLL_SECONDS', String(jsonConfig.pollSeconds)), 60),
        masterSyncSeconds: parseNumber(getEnv('MASTER_SYNC_SECONDS', String(jsonConfig.masterSyncSeconds)), 3600),
        logLevel,
        stateFilePath,
    };
}
