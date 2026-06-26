"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDbfConnection = createDbfConnection;
exports.createMockExecutor = createMockExecutor;
const node_adodb_1 = __importDefault(require("node-adodb"));
function createDbfConnection(numierDataPath) {
    const connectionString = `Provider=VFPOLEDB.1;Data Source=${numierDataPath};Mode=Read|Share Deny None;`;
    const connection = node_adodb_1.default.open(connectionString, false);
    return {
        query(sql) {
            return connection.query(sql);
        },
    };
}
function createMockExecutor(queries) {
    return {
        query(sql) {
            const lowerSql = sql.toLowerCase();
            for (const key of Object.keys(queries)) {
                if (lowerSql.includes(key.toLowerCase())) {
                    return Promise.resolve(queries[key]);
                }
            }
            return Promise.resolve([]);
        },
    };
}
