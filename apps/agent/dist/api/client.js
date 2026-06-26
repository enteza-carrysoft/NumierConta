"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = createHttpClient;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
function requestJson(baseUrl, apiKey, method, path, body) {
    const url = new url_1.URL(path, baseUrl);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: {
            'Content-Type': 'application/json',
            'X-Agent-Key': apiKey,
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
    };
    const transport = url.protocol === 'https:' ? https_1.default : http_1.default;
    return new Promise((resolve, reject) => {
        const req = transport.request(options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                var _a;
                let parsed = null;
                if (data.trim()) {
                    try {
                        parsed = JSON.parse(data);
                    }
                    catch {
                        parsed = data;
                    }
                }
                resolve({ status: (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0, body: parsed });
            });
        });
        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}
function createHttpClient(baseUrl, apiKey) {
    return {
        get(path) {
            return requestJson(baseUrl, apiKey, 'GET', path);
        },
        post(path, body) {
            return requestJson(baseUrl, apiKey, 'POST', path, body);
        },
    };
}
