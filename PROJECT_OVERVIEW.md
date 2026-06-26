# NumierConta Gateway — Project Overview

> **Versión:** 1.0  
> **Fecha:** junio de 2026  
> **Autor:** SaaS Factory Agent  
> **Propósito de este documento:** Brindar a un agente de IA (o a un desarrollador humano) una visión completa, estructurada y técnica del proyecto: arquitectura, módulos, funcionalidades, modelo de datos, decisiones y lecciones aprendidas. Sirve como punto de partida para mejorar, extender o depurar el sistema.

---

## 1. Visión y alcance

**NumierConta Gateway** es un SaaS multi-empresa que automatiza la contabilización de negocios de hostelería que usan **Numier TPV**. Extrae los datos de ventas, gastos y maestros del TPV, los transforma en asientos contables y genera ficheros TXT de ancho fijo importables en **ClassicConta 6/7**.

### Frontera arquitectónica crítica

La lectura de los DBF de Numier requiere **VFPOLEDB**, un driver Windows de 32 bits. Por tanto:

- La extracción ocurre **únicamente en un agente local Windows**.
- El backend serverless (Next.js en Vercel) **nunca lee DBF**: recibe JSON por HTTPS.
- El agente y el backend son dos proyectos independientes dentro del mismo monorepo.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| Framework full-stack | Next.js (App Router) | 16.2.9 con Turbopack |
| Lenguaje | TypeScript | 5.7 |
| UI | React + Tailwind CSS | React 19, Tailwind 3.4 |
| Base de datos | Supabase (Postgres) | Auth + DB + RLS + Storage |
| Cliente DB | supabase-js + @supabase/ssr | Server/client components |
| Validación | Zod | Todos los límites (API, forms, agente) |
| Monorepo | pnpm workspaces | 4 workspaces activos |
| Empaquetado agente | pkg | node18-win-x64 probado; x86 requiere build tools |
| ETL | TypeScript puro | packages/etl |
| Codificación TXT | iconv-lite | Windows-1252, CR+LF |
| Testing | Vitest | packages/shared, packages/etl, apps/agent |

### Nota sobre el diseño original vs. implementación

El documento de diseño original (`NumierConta_Gateway_Design.md`) propone Tailwind CSS v4 + shadcn/ui. En la implementación real se usa **Tailwind CSS 3.4** con componentes propios bajo `apps/web/src/shared/components/ui/`, ya que la configuración inicial del proyecto estaba basada en Tailwind 3.4.

---

## 3. Arquitectura general

```
┌─────────────────────────┐         ┌──────────────────────────────────────┐
│  LOCAL DEL NEGOCIO (Win) │         │       VERCEL + SUPABASE (Cloud)       │
│                         │  HTTPS  │                                       │
│  Numier TPV (FoxPro DBF) │  POST   │  Next.js 16 API  ──►  ETL Transform   │
│         │               │ ──────► │       │                  │            │
│         ▼               │  JSON   │       ▼                  ▼            │
│  Numier Agent (32-bit)  │         │   Supabase Postgres ◄─ Asientos       │
│  - VFPOLEDB read-only   │         │   (RLS multiempresa)     │            │
│  - Detecta cierres      │         │       │                  ▼            │
│  - Envía staging JSON   │         │       ▼            Generador TXT       │
└─────────────────────────┘         │   Panel Next.js          │            │
                                    │   - Dashboard       Supabase Storage  │
┌─────────────────────────┐  HTTPS  │   - Revisión             │            │
│ OFICINA GESTOR (Win)    │ ◄────── │   - Config empresas      ▼            │
│  ClassicConta 6/7       │ descarga│                    DIARIO.TXT /        │
│  Importador de Asientos │  TXT    │                    SUBCUENTAS.TXT     │
└─────────────────────────┘         └──────────────────────────────────────┘
```

### Patrón ETL

1. **Extract:** el agente local lee DBF y envía registros crudos a tablas `stg_*` vía API.
2. **Transform:** el motor ETL lee staging, aplica mapa de cuentas, calcula IVA y genera asientos.
3. **Load:** el generador TXT produce `SUBCUENTAS.TXT` y `DIARIO.TXT`; el gestor los importa en ClassicConta.

---

## 4. Estructura del monorepo

```
numierconta-gateway/
├── apps/
│   ├── web/                  # Next.js 16 — backend + panel
│   └── agent/                # Node.js — agente local Windows → .exe
├── packages/
│   ├── shared/               # tipos TS, esquemas Zod, constantes
│   └── etl/                  # lógica pura de transformación y generación TXT
├── supabase/
│   ├── migrations/           # SQL de esquema + RLS
│   └── seed.sql              # plan contable hostelería por defecto
├── .claude/
│   ├── PRPs/                 # Product Requirements Proposals (PRP-001 a PRP-006)
│   ├── skills/               # skills de SaaS Factory
│   └── memory/               # memoria persistente del proyecto
├── NumierConta_Gateway_Design.md   # diseño original detallado
└── PROJECT_OVERVIEW.md       # este documento
```

---

## 5. Módulos y funcionalidades implementadas

### 5.1 API de ingesta (`apps/web/src/app/api/`)

Autentica al agente mediante `X-Agent-Key`, valida payloads con Zod e inserta/actualiza tablas `stg_*`.

| Endpoint | Payload | Tablas afectadas |
|---|---|---|
| `GET /api/agent/state` | — | Lee `stg_closures` para devolver `last_fec_id` |
| `POST /api/ingest/closures` | `IngestClosuresPayloadSchema` | `stg_closures` |
| `POST /api/ingest/tickets` | `IngestTicketsPayloadSchema` | `stg_ticket_head`, `stg_ticket_lines` |
| `POST /api/ingest/expenses` | `IngestExpensesPayloadSchema` | `stg_expense_head`, `stg_expense_lines` |
| `POST /api/ingest/masters` | `IngestMastersPayloadSchema` | `stg_customers`, `stg_suppliers` |

**Archivos clave:**
- `apps/web/src/app/api/_lib/auth-agent.ts` — valida `X-Agent-Key` contra `companies.agent_api_key`.
- `apps/web/src/app/api/_lib/upsert.ts` — upsert idempotente genérico.
- `apps/web/src/app/api/_lib/respond.ts` — respuestas estándar.

### 5.2 Motor ETL (`packages/etl`)

Lógica pura y testeable que convierte staging en asientos contables.

**Componentes principales:**
- `src/index.ts` — orquestación principal `runEtl(input)`.
- `src/vat.ts` — cálculo de bases y cuotas de IVA.
- `src/balance.ts` — balanceo y redondeo de asientos.
- `src/mapping.ts` — resolución de cuentas por reglas de mapeo.
- `src/closure-entry.ts` — asientos de cierre de caja (ventas).
- `src/invoice-entry.ts` — asientos de facturas.
- `src/expense-entry.ts` — asientos de gastos.
- `src/run-etl.ts` — pipeline completo.

**Flujo del ETL:**
1. Agrupa tickets por cierre (`closure_fec_id`).
2. Calcula base y cuota de IVA por tipo.
3. Aplica reglas de mapeo (`sales_by_vat`, `payment_method`, etc.).
4. Genera asientos de venta, pago e IVA.
5. Procesa gastos y genera asientos de compra/servicio.
6. Balancea cada asiento (debe = haber).
7. Devuelve entries listos para persistir en `batches`/`entries`/`entry_lines`.

**Endpoint web:**
- `POST /api/etl/run` — ejecuta ETL para una empresa y rango de fechas, persiste el lote y devuelve `batch_id`.

### 5.3 Generador TXT (`packages/etl/src/txt/`)

Produce ficheros ASCII de ancho fijo compatibles con ClassicConta.

| Fichero | Registro | Longitud | Codificación |
|---|---|---|---|
| `SUBCUENTAS.TXT` | subcuentas | 444 chars | Windows-1252, CR+LF |
| `DIARIO.TXT` | asientos + líneas | 869 chars | Windows-1252, CR+LF |

**Componentes:**
- `format.ts` — helpers `padInt`, `padNum`, `padStr`, `fmtDate`, `padAccount`.
- `subcuentas.ts` — generador de subcuentas.
- `diario.ts` — generador de asientos.
- `generator.ts` — orquestación y codificación con `iconv-lite`.

**Endpoint web:**
- `POST /api/batches/[id]/generate-txt` — devuelve ambos ficheros en base64.

### 5.4 Autenticación y onboarding (`apps/web/src/features/auth/`)

- Login con email/password mediante Supabase Auth.
- Signup con creación automática de perfil.
- Onboarding que crea organización, empresa y vincula usuario.
- Protección de rutas mediante `src/proxy.ts` (Next.js 16 reemplaza `middleware.ts` por `proxy.ts`).
- Logout.

**Archivos clave:**
- `features/auth/services/login.ts`, `signup.ts`, `logout.ts`
- `features/auth/services/get-user-context.ts`
- `features/auth/services/get-current-company.ts`
- `features/onboarding/services/create-organization.ts`
- `src/proxy.ts`

### 5.5 Agente local Windows (`apps/agent/`)

Aplicación Node.js que se ejecuta en el equipo del cliente para leer DBF de Numier y enviarlos al Gateway.

**Componentes:**
- `src/index.ts` — CLI con comandos `run`, `once`, `config`.
- `src/config/` — carga de configuración.
- `src/api/client.ts` — cliente HTTP nativo con `X-Agent-Key`.
- `src/api/state.ts` / `ingest.ts` — llamadas a la API.
- `src/dbf/connection.ts` — wrapper `node-adodb` + VFPOLEDB con interfaz `QueryExecutor` para testear.
- `src/dbf/closures.ts`, `tickets.ts`, `expenses.ts`, `masters.ts` — lectores de DBF.
- `src/sync/runner.ts` — orquestación del ciclo poll → leer → enviar → avanzar estado.
- `src/sync/retry.ts` — reintentos con backoff exponencial.

**Empaquetado:**
- `node18-win-x64` funciona como prueba de concepto.
- `node18-win-x86` (target deseado para VFPOLEDB) requiere un entorno Windows con herramientas de compilación (Visual Studio Build Tools / patch / python) porque `pkg-fetch` no tiene binario precompilado.

### 5.6 Panel web (`apps/web/src/`)

Interfaz de administración para usuarios no técnicos.

**Layout:**
- Barra lateral + header con selector de empresa activa.
- Menú móvil responsive.
- Componentes UI básicos en `shared/components/ui/`.

**Vistas:**
- `/dashboard` — KPIs del mes + botón "Ejecutar ETL".
- `/companies` — CRUD de empresas.
- `/accounts` — listado y edición del plan contable.
- `/mapping` — CRUD de reglas de mapeo.
- `/batches` — listado de lotes + botón "Ejecutar ETL".
- `/batches/[id]` — detalle de lote, asientos/líneas y descarga de TXT.

**Selector de empresa:**
- Guarda la empresa activa en cookie `active_company_id`.
- `getUserContext` devuelve todas las empresas del usuario.

### 5.7 Simulador de agente (`packages/etl/scripts/simulate-agent.ts`)

Genera datos sintéticos de cierres, tickets, gastos y maestros, y los envía a la API del Gateway como haría el agente real. No requiere Numier TPV ni VFPOLEDB.

**Uso:**
```bash
pnpm --filter etl simulate-agent
```

**Variables configurables:**
- `GATEWAY_URL` (default: `http://localhost:3000`)
- `AGENT_API_KEY` (default: `test_agent_key_001`)
- `SIMULATE_DAYS` (default: 7)
- `TICKETS_PER_DAY` (default: 5)
- `EXPENSES_PER_DAY` (default: 2)

---

## 6. Modelo de datos

### 6.1 Tenancy y usuarios

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant raíz |
| `companies` | Empresas dentro de una organización |
| `profiles` | Perfiles de usuario vinculados a `auth.users` |
| `user_companies` | Relación N:M usuarios ↔ empresas |

### 6.2 Configuración contable

| Tabla | Propósito |
|---|---|
| `accounts` | Plan contable por empresa |
| `mapping_rules` | Reglas de mapeo Numier → ClassicConta |

### 6.3 Staging (datos crudos del agente)

| Tabla | Fuente Numier |
|---|---|
| `stg_closures` | `fechas.DBF` |
| `stg_ticket_head` | `cabecera.DBF` |
| `stg_ticket_lines` | `lineas.DBF` |
| `stg_expense_head` | `gastos.DBF` |
| `stg_expense_lines` | `gasto_lin.DBF` |
| `stg_customers` | `clientes.DBF` |
| `stg_suppliers` | `proveedores.DBF` |

### 6.4 Resultado contable

| Tabla | Propósito |
|---|---|
| `batches` | Lotes generados por el ETL |
| `entries` | Asientos contables |
| `entry_lines` | Líneas de cada asiento |
| `audit_log` | Registro de eventos |

### 6.5 Claves naturales e idempotencia

Todas las tablas de staging usan clave natural `(company_id, numier_*_id)` para upsert sin duplicados. Las tablas de resultado usan UUIDs generados por el backend.

---

## 7. API endpoints implementados

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/agent/state` | Estado del agente (`last_fec_id`) |
| POST | `/api/ingest/closures` | Ingesta de cierres |
| POST | `/api/ingest/tickets` | Ingesta de tickets |
| POST | `/api/ingest/expenses` | Ingesta de gastos |
| POST | `/api/ingest/masters` | Ingesta de maestros |
| POST | `/api/etl/run` | Ejecuta ETL y crea lote |
| POST | `/api/batches/[id]/generate-txt` | Genera TXT de un lote |
| GET/POST | `/api/mapping-rules` | CRUD de reglas de mapeo |
| PUT/DELETE | `/api/mapping-rules/[id]` | CRUD de reglas de mapeo |

---

## 8. Flujos de usuario

### 8.1 Primer acceso (onboarding)

1. Usuario accede a `/signup`.
2. Crea cuenta en Supabase Auth.
3. Redirige a `/onboarding`.
4. Crea organización y primera empresa.
5. Redirige a `/dashboard`.

### 8.2 Operación diaria (con agente real)

1. Agente local se ejecuta en el equipo Windows del negocio.
2. Lee DBF y detecta cierres nuevos.
3. Envía staging al Gateway.
4. Usuario (gestor) entra al panel.
5. Ejecuta ETL desde `/dashboard` o `/batches`.
6. Revisa el lote generado.
7. Descarga `SUBCUENTAS.TXT` y `DIARIO.TXT`.
8. Importa en ClassicConta 6/7.

### 8.3 Operación con simulador (sin Numier TPV)

1. Servidor local: `pnpm --filter web dev`
2. Simulador: `pnpm --filter etl simulate-agent`
3. Panel → Ejecutar ETL.
4. Lotes → descargar TXT.
5. Importar en ClassicConta 6/7.

---

## 9. Configuración y variables de entorno

Archivo: `apps/web/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://spwwajariflvqghmxewr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Para el agente local, usa `agent-config.json` (ver `apps/agent/`).

---

## 10. Comandos de desarrollo

```bash
# Instalar dependencias
pnpm install

# Typecheck en todo el monorepo
pnpm -r typecheck

# Tests en todo el monorepo
pnpm -r test

# Build del panel
pnpm --filter web build

# Servidor de desarrollo
pnpm --filter web dev

# Simulador de agente
pnpm --filter etl simulate-agent

# ETL E2E (lee datos reales de Supabase)
pnpm --filter etl exec tsx scripts/e2e.ts
```

---

## 11. Decisiones técnicas clave

1. **Supabase como plataforma única:** cubre Auth, DB, RLS y Storage sin añadir servicios externos.
2. **Agente local separado:** evita dependencias Windows/VFPOLEDB en el backend serverless.
3. **Staging idempotente:** las tablas `stg_*` permiten reprocesar sin duplicados.
4. **Mapa de cuentas como reglas:** configurable por empresa sin modificar código.
5. **ETL puro en packages/etl:** testeable, reusable y desacoplado de Next.js.
6. **TXT en memoria + base64:** el endpoint devuelve ficheros listos para descargar sin necesidad de Storage obligatorio.
7. **Tailwind 3.4 en lugar de v4:** se mantuvo la configuración inicial del proyecto.
8. **Next.js 16 `proxy.ts` en lugar de `middleware.ts`:** la nueva versión depreca `middleware.ts`.
9. **Selector de empresa por cookie:** permite mantener contexto entre navegaciones.
10. **Service role para onboarding:** las políticas RLS no permiten inserts en tablas de tenant desde un usuario recién registrado.

---

## 12. Aprendizajes y gotchas

- Tailwind CSS 3.4 requiere `@tailwind` directives, no `@import 'tailwindcss'`.
- Cliente tipado de Supabase es rígido; usar cliente no tipado + casts explícitos en helpers genéricos.
- Para gastos, `stg_expense_lines.amount` es la base (sin IVA); para ventas, `stg_ticket_lines.line_amount` es IVA incluido.
- Cuentas de IVA soportado se resuelven desde `accounts` por `account_class='vat_in'` y `vat_rate`, no desde `mapping_rules`.
- Workspaces sin tests hacen fallar `pnpm -r test`; añadir placeholder tests.
- Next.js 16 deprecó `middleware.ts` a favor de `proxy.ts`.
- En `proxy.ts`, `request.cookies.set` no acepta `options`; solo `response.cookies.set`.
- `useActionState` requiere firma `(prevState, payload)` en Server Actions.
- `pkg` con target `node18-win-x86` requiere compilar Node desde fuente si no hay binario precompilado; en este entorno faltó `patch.exe`.
- `node-adodb` se abstrae tras una interfaz `QueryExecutor` para poder testear con mocks sin VFPOLEDB.
- Los gastos en DBF no tienen `fec_id`; se leen desde la fecha del cierre más antiguo no sincronizado.
- `last_fec_id` solo avanza si todos los endpoints de ingest responden 2xx.
- `Asien` usa `padInt`; `EuroDebe`/`EuroHaber` y `% IVA` usan `padNum` (2 decimales implícitos).
- El campo `Cod` de `SUBCUENTAS.TXT` es de 12 caracteres; el código se rellena a `classicconta_digits` y luego se justifica a la izquierda.
- Descargar TXT codificado en Windows-1252 requiere convertir base64 a `Uint8Array` y crear blob con charset `windows-1252`.

---

## 13. Estado actual y roadmap

### Implementado (2026-06-16)

- [x] API de ingesta (closures, tickets, expenses, masters)
- [x] Motor ETL
- [x] Generador TXT (SUBCUENTAS + DIARIO)
- [x] Autenticación y onboarding
- [x] Agente local Windows (core + tests, empaquetado x64 POC)
- [x] Panel web (dashboard, empresas, cuentas, mapeo, lotes, descarga TXT)
- [x] Simulador de agente para pruebas sin Numier TPV
- [x] Botón "Ejecutar ETL" en panel

### En revisión / pendiente

- [ ] Revisión manual del panel por el usuario (`checklist-pruebas-panel.md`).
- [ ] Ajustes según observaciones.
- [ ] Flujo end-to-end con ClassicConta 7 importando TXT reales.
- [ ] Aplicar o descartar migración `0006_add_mapping_rules_created_at.sql`.
- [ ] Mejorar UI/UX del panel (paginación, filtros, notificaciones toast).
- [ ] Empaquetado x86 del agente en entorno Windows con build tools.
- [ ] Subir TXT a Supabase Storage y persistir paths.
- [ ] Webhooks o scheduling para ETL automático.
- [ ] Tests E2E con Playwright.

---

## 14. Datos de prueba

- **Supabase project ref:** `spwwajariflvqghmxewr`
- **Organización:** `Test Organization` (`1913688d-13b7-4b51-8038-67d65270ae6d`)
- **Empresa:** `Test Company` (`129afd20-782b-46b7-bffa-6c64e680ed20`)
- **Agent API Key:** `test_agent_key_001`
- **Usuario de prueba:** `test@numierconta.com` / `TestPassword123!`
- **User ID:** `bca85db2-4080-45aa-8c12-bba6bce6146c`

---

## 15. Referencias

- `NumierConta_Gateway_Design.md` — especificación original detallada.
- `.claude/PRPs/prp-001-api-ingesta.md`
- `.claude/PRPs/prp-002-motor-etl.md`
- `.claude/PRPs/prp-003-auth-onboarding.md`
- `.claude/PRPs/prp-004-agente-local.md`
- `.claude/PRPs/prp-005-generador-txt.md`
- `.claude/PRPs/prp-006-panel-web.md`
- `.claude/memory/project/estado-numierconta-gateway.md`
- `.claude/memory/project/checklist-pruebas-panel.md`
