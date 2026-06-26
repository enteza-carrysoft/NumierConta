# PRP-001: NumierConta Gateway

> **Estado**: PENDIENTE
> **Fecha**: 2026-06-15
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Construir un SaaS multiempresa que automatiza la contabilización de la actividad de negocios de hostelería operados con Numier TPV: un agente local Windows extrae datos de los DBF, un backend Next.js + Supabase los transforma en asientos contables según un mapa de cuentas configurable, y genera ficheros TXT de ancho fijo (`DIARIO.TXT` / `SUBCUENTAS.TXT`) listos para importar en ClassicConta 6/7.

## Por Qué

| Problema | Solución |
|----------|----------|
| La contabilización manual de cierres Z, ventas y gastos de Numier hacia ClassicConta es lenta y propensa a errores de cuadre e IVA | ETL automatizado e idempotente que agrupa por cierre, calcula bases/cuotas de IVA y genera asientos cuadrados |
| Cada negocio tiene su propio plan de cuentas y reglas de mapeo | Mapa de cuentas configurable por empresa (tablas `accounts` / `mapping_rules`), editable desde el panel sin tocar código |
| Los DBF de FoxPro solo son legibles con un driver Windows 32-bit (VFPOLEDB), incompatible con Vercel/serverless | Arquitectura distribuida: agente local Windows extrae y envía JSON; el backend serverless nunca toca DBF |
| Gestores con varias empresas necesitan operarlas de forma aislada | Multitenancy con RLS en Supabase: organizations → companies → usuarios |

**Valor de negocio**: Reduce el cierre contable mensual de horas de trabajo manual a minutos, elimina errores de cuadre/IVA, y permite escalar a múltiples clientes (gestorías) operando varias empresas desde un único panel SaaS.

## Qué

### Criterios de Éxito
- [ ] Migraciones de Supabase aplican y RLS impide ver datos de otra `company` (verificado con dos companies de prueba)
- [ ] La ingesta `/api/ingest/*` es idempotente: reenviar el mismo lote no duplica filas (upsert por clave natural)
- [ ] El motor ETL (`packages/etl`) reproduce **exactamente** los asientos del ejemplo de la sección 7.4 del documento de diseño (cuadre al céntimo, Debe = Haber = 1.500,00 y Debe = Haber = 352,00)
- [ ] Toda la casuística de la tabla 6.2 (17 casos: ticket simple, factura con NIF, multi-IVA, cobro mixto, invitación, anulación, cambio, pendiente, gastos con/sin IVA, gasto de caja, rectificativa, descuadre, multi-IVA en gasto) tiene un test unitario que pasa
- [ ] `DIARIO.TXT` (869 chars/registro) y `SUBCUENTAS.TXT` (444 chars/registro) se generan con longitudes y posiciones de campo correctas, codificación Windows-1252 y terminador CR+LF
- [ ] Asientos descuadrados (`balanced=false`) bloquean el botón "Generar TXT" en el panel
- [ ] El dashboard muestra los KPIs de la sección 10.2 (ventas del período, ticket medio, ventas por IVA, ventas por franja horaria, top productos, gastos, margen operativo, cobros efectivo vs tarjeta) para la empresa seleccionada
- [ ] El agente local (`apps/agent`) compila a `.exe` 32-bit, lee DBF en modo `Read|Share Deny None` sin bloquear Numier, y completa el ciclo de sincronización
- [ ] Un usuario con rol `accountant` y acceso a 2 companies puede operar ambas sin fuga de datos entre ellas

### Comportamiento Esperado

1. El gestor instala el **Numier Agent** en el PC del negocio, configura `agent.config.json` con su `agentApiKey` y `numierDataPath`.
2. Cada `pollSeconds`, el agente consulta `/api/agent/state`, lee de los DBF (vía VFPOLEDB) los cierres, tickets, gastos y maestros nuevos desde `last_fec_id`, y los envía por lotes a `/api/ingest/*` (idempotente, con reintentos).
3. Desde el panel web, un usuario `admin`/`accountant` autenticado selecciona la empresa, configura el **mapa de cuentas** (subcuentas + reglas de mapeo) si aún no lo está, y lanza `/api/etl/run` para un rango de fechas.
4. El motor ETL lee el staging, aplica las reglas de mapeo, calcula IVA (precios IVA incluido → base + cuota), agrupa por cierre Z (excepto facturas con NIF que generan asiento propio), y crea un `batch` con sus `entries`/`entry_lines`. Calcula cuadre y ajusta redondeos ≤0,02€.
5. El usuario revisa los asientos en `/batches/[id]`; los descuadrados se resaltan y bloquean exportación.
6. Si todo cuadra, pulsa "Generar TXT" → se generan `DIARIO.TXT` y `SUBCUENTAS.TXT`, se suben a Supabase Storage, y se ofrecen URLs firmadas para descarga.
7. El gestor descarga los TXT y los importa en ClassicConta 6/7 mediante su Importador de Asientos (paso asistido, fuera del sistema).

---

## Contexto

### Referencias
- `NumierConta_Gateway_Design.md` — documento de diseño completo y autocontenido (fuente única de verdad para esta PRP; secciones 1-14)
- Estado actual del repo: proyecto Next.js 16 + React 19 + TypeScript single-app generado por `new-app` (sin monorepo todavía). Contiene `src/`, `package.json` con dependencias de `@supabase/supabase-js` y `@supabase/ssr` ya instaladas
- `.claude/skills/add-login/` — patrón a seguir para Supabase Auth + `profiles` (la tabla `profiles` del diseño extiende el patrón estándar con `organization_id` y `role`)
- `.claude/skills/supabase/` — patrón para migraciones, RLS y queries
- Protocolo AIG de ClassicConta 6 (sección 7 del documento) — especificación de formato de ficheros, ya transcrita en el diseño

### Arquitectura Propuesta (Monorepo)

El documento de diseño exige una arquitectura **monorepo pnpm** porque el agente local requiere un driver Windows 32-bit (VFPOLEDB) que NO puede coexistir con el proyecto Next.js desplegado en Vercel (Linux/serverless). Esto es una divergencia respecto al setup actual (single-app). La Fase 1 del Blueprint debe migrar a:

```
numierconta-gateway/
├── apps/
│   ├── web/            # Next.js 16 (Vercel) — proyecto actual migrado aquí
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login, /onboarding
│   │       │   ├── (main)/dashboard, /companies, /batches, /settings
│   │       │   └── api/ingest/*, /api/etl/run, /api/batches/*, /api/dashboard, /api/agent/state
│   │       └── features/
│   │           ├── companies/
│   │           ├── accounts/        # editor de plan de subcuentas
│   │           ├── mapping/         # editor de reglas de mapeo
│   │           ├── batches/         # revisión de asientos
│   │           └── dashboard/
│   └── agent/          # Node.js 20 → .exe (pkg), Windows 32-bit, node-adodb/VFPOLEDB
├── packages/
│   ├── shared/         # tipos TS + esquemas Zod de todos los payloads (sección 5)
│   └── etl/            # funciones puras de transformación + generador TXT (secciones 6 y 7), testeables
├── supabase/
│   ├── migrations/      # SQL de secciones 3 y 4
│   └── seed.sql          # plan de cuentas hostelería (sección 14)
└── package.json (workspaces pnpm)
```

### Modelo de Datos

Definido íntegramente en las secciones 3 y 4 del documento de diseño (`organizations`, `companies`, `profiles`, `user_companies`, `accounts`, `mapping_rules`, `stg_closures`, `stg_ticket_head`, `stg_ticket_lines`, `stg_expense_head`, `stg_expense_lines`, `stg_customers`, `stg_suppliers`, `batches`, `entries`, `entry_lines`, `audit_log`), con RLS vía `auth_company_ids()` aplicada a todas las tablas con `company_id`. Reutilizar tal cual — no rediseñar.

---

## Blueprint (Assembly Line)

> Solo FASES. Las subtareas se generan al entrar a cada fase con bucle-agentico.

### Fase 1: Monorepo + Base de Datos
**Objetivo**: Reestructurar el repo a workspaces pnpm (`apps/web`, `apps/agent`, `packages/shared`, `packages/etl`), migrar el proyecto Next.js actual a `apps/web`, crear el proyecto Supabase, aplicar todas las migraciones de las secciones 3 y 4 (tablas + RLS + función `auth_company_ids`), y cargar `seed.sql` (sección 14) como plantilla de plan de cuentas.
**Validación**: `pnpm install` funciona desde la raíz; `apps/web` arranca con `npm run dev`; `list_tables` de Supabase muestra todas las tablas con RLS habilitado; un test con dos companies confirma aislamiento.

### Fase 2: Tipos Compartidos y Esquemas Zod
**Objetivo**: En `packages/shared`, definir los tipos TS y esquemas Zod de todos los payloads de ingesta y gestión (sección 5), incluyendo el payload de ejemplo `/api/ingest/tickets`.
**Validación**: `packages/shared` compila (`tsc --noEmit`); los esquemas Zod validan correctamente el payload de ejemplo de la sección 5.1 y rechazan payloads malformados.

### Fase 3: API de Ingesta
**Objetivo**: Implementar Route Handlers `/api/ingest/closures`, `/api/ingest/tickets`, `/api/ingest/expenses`, `/api/ingest/masters` y `/api/agent/state`, con autenticación `X-Agent-Key` (hash contra `companies.agent_api_key` vía service role), validación Zod, y upsert idempotente por clave natural devolviendo `{ inserted, updated, skipped }`.
**Validación**: Reenviar el mismo lote de prueba dos veces no duplica filas en `stg_*`; petición sin `X-Agent-Key` válida devuelve 401; `audit_log` registra cada ingesta.

### Fase 4: Motor ETL (packages/etl)
**Objetivo**: Implementar como funciones puras y testeables toda la lógica de la sección 6: cálculo de base/cuota IVA (precios IVA incluido), `buildClosureEntry`, agrupación por cierre Z, asiento propio para facturas con NIF, y los 17 casos de la tabla 6.2, con cuadre obligatorio y ajuste de redondeo ≤0,02€.
**Validación**: Tests unitarios reproducen exactamente los dos ejemplos de la sección 7.4 (cuadres 1.500,00 y 352,00); un test por cada uno de los 17 casos de la tabla 6.2 pasa.

### Fase 5: Generador de Ficheros TXT
**Objetivo**: Implementar `padNum`, `padStr`, `fmtDate` y los generadores de `SUBCUENTAS.TXT` (444 chars) y `DIARIO.TXT` (869 chars) según las tablas de campos de la sección 7, codificados en Windows-1252 con CR+LF, incluyendo subcuentas referenciadas no preexistentes con padding según `companies.classicconta_digits`.
**Validación**: Tests verifican longitud exacta de registro (444/869) y posiciones de campo para los ejemplos de la sección 7.4; fichero generado se decodifica correctamente como Windows-1252.

### Fase 6: API de Gestión y ETL
**Objetivo**: Implementar `/api/etl/run` (crea `batch` + `entries` desde staging, idempotente: reprocesar un cierre regenera sus entries), `/api/batches` (GET lista), `/api/batches/:id` (GET detalle, PATCH estado), `/api/batches/:id/generate-txt` (genera y sube TXT a Storage, devuelve URLs firmadas), y `/api/dashboard`.
**Validación**: `/api/etl/run` sobre datos de prueba crea un batch balanceado; reprocesar el mismo período no duplica entries; `/api/dashboard` devuelve los 8 KPIs de la sección 10.2.

### Fase 7: Panel Web
**Objetivo**: Implementar las rutas del App Router (sección 10.1): `/login`, `/onboarding`, `/dashboard` (selector de empresa + KPIs), `/companies` (CRUD + generación de `agent_api_key`), `/companies/[id]/accounts` (editor de subcuentas), `/companies/[id]/mapping` (editor de reglas), `/batches` y `/batches/[id]` (revisión con apuntes expandibles, indicador de cuadre, asientos descuadrados en rojo y no exportables), `/settings/users`, `/settings/agent`.
**Validación**: Playwright confirma navegación completa; botón "Generar TXT" deshabilitado si hay asientos descuadrados; gestión de usuarios solo visible para `owner`/`admin`.

### Fase 8: Agente Local (Numier Agent)
**Objetivo**: Proyecto `apps/agent` en Node.js 20, conexión `node-adodb` sobre VFPOLEDB (modo `Read|Share Deny None`), ciclo de trabajo completo de la sección 9.3 (poll → leer DBF → enviar staging → actualizar `last_fec_id`), cola local de reintentos con backoff exponencial, empaquetado a `.exe` 32-bit con `pkg`.
**Validación**: El `.exe` ejecuta el ciclo contra un DBF de prueba, envía datos a `/api/ingest/*`, y no avanza `last_fec_id` si el backend no confirma.

### Fase 9: Validación Final E2E
**Objetivo**: Sistema funcionando end-to-end: agente de prueba → ingesta → ETL → generación TXT → validación byte a byte contra los ejemplos esperados.
**Validación**:
- [ ] `npm run typecheck` pasa en todos los workspaces
- [ ] `npm run build` exitoso en `apps/web`
- [ ] Playwright screenshot confirma UI del dashboard y revisión de batches
- [ ] Todos los criterios de éxito de la sección "Qué" cumplidos
- [ ] Checklist completo de la sección 13.1 del documento de diseño verificado

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección crecerá durante la implementación.

### 2026-06-15: Fase 1 completada (parcial — pendiente Supabase real)
- **Hecho**: Migrado a monorepo pnpm (`apps/web`, `apps/agent`, `packages/shared`, `packages/etl`, `supabase/migrations`, `supabase/seed.sql`). `pnpm install` funciona desde la raíz; `apps/web` arranca con `pnpm dev` (Next.js 16 + Turbopack, OK). Typecheck pasa en `web`, `shared` y `etl`.
- **Pendiente**: el MCP de Supabase no está conectado (`.mcp.json` con placeholders). No se han aplicado migraciones ni verificado RLS con `list_tables`/dos companies de prueba. El usuario eligió continuar sin Supabase por ahora.
- **Aplicar en**: antes de iniciar Fase 3 (API de ingesta) o cualquier fase que dependa de la BD, hay que: (1) crear proyecto Supabase, (2) configurar `--project-ref` y `SUPABASE_ACCESS_TOKEN` en `.mcp.json`, (3) aplicar `supabase/migrations/0001..0005` con `apply_migration`, (4) ejecutar `seed.sql` adaptado por empresa, (5) verificar aislamiento RLS con dos companies.
- **Nota técnica**: `node-adodb` (VFPOLEDB) solo existe en `apps/agent` — nunca en `apps/web`, confirmado en estructura.

### 2026-06-15: Fase 2 completada
- **Hecho**: `packages/shared/src/schemas/{common,ingest,management}.ts` con esquemas Zod de `IngestClosuresPayload`, `IngestTicketsPayload`, `IngestExpensesPayload`, `IngestMastersPayload`, `AgentState`, `IngestResult`, `ApiError`, y de gestión (`EtlRunPayload`, `PatchBatchPayload`, `DashboardQuery/Kpis`). `packages/shared/src/types/accounting.ts` con tipos de dominio (`Account`, `MappingRule`, `EntryDraft`, etc.) para el motor ETL.
- **Validado**: test con vitest reproduce el payload de ejemplo de la sección 5.1 (`IngestTicketsPayloadSchema`) — válido, y rechaza `heads` vacío, `state` inválido y tipos malformados (4/4 tests OK). `tsc --noEmit` pasa en `shared` y `web` (que ya consume `@numierconta/shared`).

---

## Gotchas

- [ ] **Migración a monorepo**: el proyecto actual es un single-app Next.js generado por `new-app`. La Fase 1 implica reestructurar a `apps/web` dentro de un monorepo pnpm — mover `src/`, `package.json`, configs (tailwind, tsconfig, next.config, components.json) sin romper rutas ni imports
- [ ] **VFPOLEDB es 32-bit**: el agente (`apps/agent`) debe compilarse y ejecutarse en proceso 32-bit; jamás incluir `node-adodb`/dependencias FoxPro en `apps/web`
- [ ] **Precios Numier son IVA incluido**: base y cuota SIEMPRE se calculan (`base = round(line_amount / (1 + vat_rate/100), 2)`), nunca se leen directamente
- [ ] **Idempotencia doble**: tanto la ingesta (`stg_*` por clave natural) como el ETL (reprocesar cierre regenera `entries` con mismo `source_ref`) deben ser idempotentes
- [ ] **Tolerancia de cuadre**: diferencias ≤0,02€ se ajustan en el apunte de mayor importe; diferencias mayores marcan `balanced=false` y bloquean exportación
- [ ] **Codificación TXT**: Windows-1252 (no UTF-8) con terminador CR+LF — usar `iconv-lite`
- [ ] **Service role key**: `SUPABASE_SERVICE_ROLE_KEY` solo en Route Handlers servidor, nunca expuesta al cliente; usada para bypass RLS al validar `X-Agent-Key`
- [ ] **Hash de agent_api_key**: almacenar hasheada (SHA-256) en `companies.agent_api_key`, comparar hashes, permitir rotación

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan
- NO ignorar errores de TypeScript
- NO hardcodear valores (usar constantes, especialmente posiciones/longitudes de campo TXT)
- NO omitir validación Zod en inputs de usuario y payloads del agente
- NO contabilizar tickets en estado `N` (anulado), `X` (cambio/apertura) o `P` (pendiente)
- NO leer/escribir DBF desde `apps/web` o cualquier función serverless
- NO emitir `INSERT/UPDATE/DELETE/PACK/REINDEX` contra los DBF de Numier desde el agente

---

*PRP pendiente aprobación. No se ha modificado código.*
