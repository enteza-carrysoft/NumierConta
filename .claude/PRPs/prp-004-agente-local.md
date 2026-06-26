# PRP-004: Agente local Windows (Numier Agent)

> **Estado**: COMPLETADO
> **Fecha**: 2026-06-16
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Implementar el agente local Windows (`apps/agent`) que lee los DBF de Numier TPV mediante VFPOLEDB, detecta cierres/tickets/gastos/maestros nuevos y los envía al backend vía la API de ingesta ya implementada.

## Por Qué

| Problema | Solución |
|---|---|
| VFPOLEDB es un driver Windows 32-bit que no puede ejecutarse en Vercel/serverless. | Agente local Node.js empaquetado a `.exe` que corre en la máquina del cliente. |
| Numier TPV bloquea los DBF si se abren en modo exclusivo. | Conexión `Mode=Read\|Share Deny None` para lectura sin bloqueo. |
| Hay que evitar reenviar datos ya sincronizados. | El agente consulta `GET /api/agent/state` para obtener `last_fec_id` y solo lee registros posteriores. |
| La red puede fallar. | Cola local de reintentos con backoff exponencial; no se avanza `last_fec_id` sin confirmación del backend. |

**Valor de negocio**: El cliente puede instalar un pequeño ejecutable en su servidor Windows con Numier TPV y tener sincronización automática de datos con la nube.

## Qué

### Criterios de Éxito
- [ ] Proyecto `apps/agent` lee DBF con `node-adodb` + VFPOLEDB en modo solo lectura.
- [ ] Configuración por variables de entorno o archivo `agent.json` (ruta DBF, base URL, agent key, intervalo de poll).
- [ ] Ciclo completo: `GET /api/agent/state` → leer cierres/tickets/gastos/maestros nuevos → `POST /api/ingest/*`.
- [ ] Envío por lotes (batches) controlado para no saturar memoria ni la API.
- [ ] Reintentos con backoff exponencial y cola local de fallidos.
- [ ] No avanza `last_fec_id` si algún lote no fue confirmado por el backend.
- [ ] Logging básico por consola y opcionalmente a archivo.
- [ ] `pnpm --filter agent typecheck` y `pnpm --filter agent build` pasan.
- [ ] Empaquetado a `.exe` 32-bit con `pkg` (script `package`).
- [ ] Validación: contra un DBF de prueba (o mocks) el agente envía datos y no avanza sin confirmación.

### Comportamiento Esperado

1. Al arrancar, el agente carga configuración.
2. Cada `pollSeconds` (por defecto 60):
   a. Pide `GET /api/agent/state` con header `X-Agent-Key`.
   b. Obtiene `last_fec_id`.
   c. Lee de `fechas.dbf` los cierres con `FEC_ID > last_fec_id AND FEC_FIN IS NOT NULL`.
   d. Para cada cierre nuevo, lee de `cabecera.dbf` y `detalle.dbf` los tickets/líneas con `FEC_ID = closure_fec_id`.
   e. Lee de `gastocab.dbf`/`gastodet.dbf` los gastos nuevos.
   f. Lee maestros (`clientes.dbf`, `proveedo.dbf`) solo si han pasado más de `masterSyncSeconds` desde la última sincronización.
   g. Envía cada tipo de lote a su endpoint correspondiente.
   h. Si todo fue confirmado (HTTP 200/201), actualiza `last_fec_id` localmente al máximo `FEC_ID` procesado.
3. Si un envío falla, se encola para reintentar con backoff.
4. El proceso no bloquea Numier TPV.

---

## Contexto

### Referencias
- `NumierConta_Gateway_Design.md` secciones 9.3, 9.4, 9.5, 9.6.
- `apps/agent/src/index.ts` — placeholder actual.
- `apps/agent/package.json` — ya incluye `node-adodb` y `pkg`.
- `apps/web/src/app/api/agent/state/route.ts` — endpoint de estado.
- `apps/web/src/app/api/ingest/*` — endpoints de ingesta.
- `packages/shared/src/schemas/ingest.ts` — schemas Zod de los payloads.

### Arquitectura Propuesta

```
apps/agent/
├── src/
│   ├── index.ts              # bootstrap + loop principal
│   ├── config.ts             # carga de configuración
│   ├── logger.ts             # logging simple
│   ├── types.ts              # tipos internos
│   ├── dbf/
│   │   ├── connection.ts     # conexión VFPOLEDB
│   │   ├── closures.ts       # lector de fechas.dbf
│   │   ├── tickets.ts        # lector de cabecera/detalle.dbf
│   │   ├── expenses.ts       # lector de gastocab/gastodet.dbf
│   │   └── masters.ts        # lector de clientes/proveedo.dbf
│   ├── api/
│   │   ├── client.ts         # cliente HTTP al backend
│   │   ├── state.ts          # GET /api/agent/state
│   │   └── ingest.ts         # POST /api/ingest/*
│   └── sync/
│       ├── batch.ts          # construcción de lotes
│       ├── retry-queue.ts    # cola de reintentos
│       └── runner.ts         # orquestación del ciclo
├── config/
│   └── agent.example.json
├── package.json
└── tsconfig.json
```

### Modelo de Datos DBF (resumen)

Ver `NumierConta_Gateway_Design.md` sección 9.6. Tablas principales:
- `fechas.dbf` → cierres (`FEC_ID`, `FEC_INICIO`, `FEC_FIN`, `TOTAL_VENTAS`, ...)
- `cabecera.dbf` → cabeceras de ticket (`TIC_ID`, `FEC_ID`, `FECHA`, `TOTAL`, ...)
- `detalle.dbf` → líneas de ticket (`TIC_ID`, `LINEA`, `ART_ID`, `CANTIDAD`, `PRECIO`, `IVA`, ...)
- `gastocab.dbf`/`gastodet.dbf` → gastos
- `clientes.dbf`, `proveedo.dbf` → maestros

---

## Blueprint (Assembly Line)

### Fase 1: Configuración + tipos + logger
**Objetivo**: Cargar config, definir tipos y tener logging operativo.
**Validación**: `pnpm --filter agent typecheck` pasa; `dist/` no generado aún.

### Fase 2: Cliente HTTP al backend
**Objetivo**: Cliente que hace `GET /api/agent/state` y `POST /api/ingest/*` con `X-Agent-Key`.
**Validación**: Tests unitarios con `nock` o mocks de fetch; maneja 200/4xx/5xx.

### Fase 3: Conexión VFPOLEDB y lectores DBF
**Objetivo**: Conexión `node-adodb` y lectores para closures, tickets, expenses, masters.
**Validación**: Typecheck pasa; lectores devuelven arrays tipados (usar mocks si no hay DBF real).

### Fase 4: Ciclo de sincronización
**Objetivo**: Ensamblar el loop poll → leer → enviar → actualizar `last_fec_id`.
**Validación**: Contra mocks, el runner envía lotes y avanza `last_fec_id` solo si todo OK.

### Fase 5: Reintentos y cola local
**Objetivo**: Backoff exponencial y persistencia mínima de fallidos (memoria o JSON local).
**Validación**: Simular fallo de red → reintento → éxito.

### Fase 6: Empaquetado a .exe
**Objetivo**: Script `pnpm --filter agent package` genera `dist/numierconta-agent.exe` 32-bit.
**Validación**: El `.exe` se genera sin errores (no se requiere ejecutar VFPOLEDB en este entorno).

### Fase 7: Validación final
**Objetivo**: Todo el agente compila, testea y empaqueta.
**Validación**:
- [ ] `pnpm -r typecheck` pasa.
- [ ] `pnpm -r test` pasa.
- [ ] `pnpm --filter web build` sigue pasando.
- [ ] `pnpm --filter agent build` pasa.
- [ ] `pnpm --filter agent package` genera el `.exe`.
- [ ] Simulación con mocks: ciclo completo sin errores.

---

## 🧠 Aprendizajes (Self-Annealing)

- **`pkg` para `win-x86` requiere compilación desde fuente** si no hay binario precompilado. En este entorno faltó `patch.exe` y otras herramientas de build, por lo que el target `node18-win-x86` no pudo generarse aquí.
- **Como prueba de concepto, `pkg` con `node18-win-x64` sí generó el `.exe`**, confirmando que el código se empaqueta correctamente.
- **Para producción**, el empaquetado x86 debe ejecutarse en una máquina Windows con Visual Studio Build Tools / Python / patch disponibles, o usando un binario precompilado de Node x86.
- **`node-adodb` es un módulo nativo-only**; los tests usan un `QueryExecutor` mock para no depender de VFPOLEDB en el entorno de desarrollo.
- **Los gastos no tienen `fec_id`**; se sincronizan desde la fecha de apertura del cierre más antiguo no procesado.
- **`last_fec_id` solo avanza si todos los endpoints de ingest responden 2xx**, gracias a `withRetry` y al hecho de que `saveSyncState` ocurre al final del ciclo.

---

## Gotchas

- [ ] `node-adodb` usa `cscript.exe` internamente; requiere Windows.
- [ ] VFPOLEDB es 32-bit; el `.exe` debe compilarse para `node18-win-x86` o similar.
- [ ] Nunca incluir `node-adodb` ni lógica DBF fuera de `apps/agent`.
- [ ] Los DBF de Numier deben leerse en modo `Read|Share Deny None`.
- [ ] El agente NO debe ejecutar `INSERT/UPDATE/DELETE/PACK/REINDEX` en los DBF.
- [ ] `last_fec_id` solo avanza cuando el backend confirma TODOS los lotes del ciclo.
- [ ] Maestros (clientes/proveedores) no tienen `fec_id`; se sincronizan por tiempo transcurrido.

## Anti-Patrones

- NO usar `any`.
- NO hardcodear credenciales; usar config.
- NO bloquear los DBF de Numier.
- NO avanzar `last_fec_id` sin confirmación.
- NO mezclar código del agente con `apps/web`.

---

*PRP pendiente aprobación. No se ha modificado código.*
