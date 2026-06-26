"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const logger_1 = require("./logger");
const runner_1 = require("./sync/runner");
function printUsage(error) {
    if (error) {
        console.error(`Error: ${error}`);
        console.error();
    }
    console.log('NumierConta Agent');
    console.log();
    console.log('Uso: numierconta-agent [comando]');
    console.log();
    console.log('Comandos:');
    console.log('  run     Inicia el ciclo de sincronización (por defecto)');
    console.log('  once    Ejecuta una sola pasada y termina');
    console.log('  config  Muestra la configuración cargada');
    console.log();
    console.log('Configuración vía archivo JSON:');
    console.log('  Copia config/agent.example.json a config/agent.json y completa los valores.');
    console.log();
    console.log('Configuración vía variables de entorno:');
    console.log('  NUMIER_DATA_PATH   Ruta a los DBF de Numier');
    console.log('  API_BASE_URL       URL base del backend');
    console.log('  AGENT_API_KEY      Clave del agente (X-Agent-Key)');
    console.log('  POLL_SECONDS       Intervalo entre sincronizaciones (default 60)');
    console.log('  MASTER_SYNC_SECONDS  Intervalo de sincronización de maestros (default 3600)');
    console.log('  LOG_LEVEL          debug | info | warn | error');
    console.log('  STATE_FILE_PATH    Ruta del fichero de estado (default ./data/agent-state.json)');
}
async function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
async function runOnce(config, logger) {
    const result = await (0, runner_1.runSync)(config, logger);
    logger.info('Resultado de sincronización', result);
}
async function runLoop(config, logger) {
    logger.info('Iniciando agente en modo continuo', { pollSeconds: config.pollSeconds });
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const result = await (0, runner_1.runSync)(config, logger);
            logger.info('Resultado de sincronización', result);
        }
        catch (error) {
            logger.error('Error en ciclo de sincronización', error);
        }
        logger.info(`Esperando ${config.pollSeconds}s hasta el siguiente ciclo`);
        await sleep(config.pollSeconds);
    }
}
async function main() {
    var _a;
    const command = (_a = process.argv[2]) !== null && _a !== void 0 ? _a : 'run';
    if (command === '--help' || command === '-h') {
        printUsage();
        return;
    }
    let config;
    try {
        config = (0, config_1.loadConfig)();
    }
    catch (error) {
        printUsage(error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
    const logger = new logger_1.Logger(config.logLevel);
    if (command === 'config') {
        logger.info('Configuración cargada', {
            numierDataPath: config.numierDataPath,
            apiBaseUrl: config.apiBaseUrl,
            pollSeconds: config.pollSeconds,
            masterSyncSeconds: config.masterSyncSeconds,
            logLevel: config.logLevel,
            stateFilePath: config.stateFilePath,
        });
        return;
    }
    if (command === 'run') {
        await runLoop(config, logger);
        return;
    }
    if (command === 'once') {
        await runOnce(config, logger);
        return;
    }
    printUsage(`Comando desconocido: ${command}`);
    process.exit(1);
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
