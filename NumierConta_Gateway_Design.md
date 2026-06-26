# NumierConta Gateway — Documento de Diseño, Desarrollo e Implementación

> **Versión:** 1.0  **Fecha:** junio de 2026
> **Destinatario:** agente de desarrollo (implementación *one-shot*)
> **Rol del autor:** Senior ETL & Data Migration Engineer

---

## 0. Cómo usar este documento

Este documento es **autocontenido** y está pensado para que un agente de programación construya la aplicación completa en una sola iteración. Implementa **exactamente** lo aquí descrito. Donde se indica un nombre de tabla, campo, endpoint o constante, respétalo literalmente para que las piezas encajen.

**Pila tecnológica fijada (no sustituir):**

- **Frontend + Backend:** Next.js 16 (App Router, Route Handlers, Server Actions) — desplegable en **Vercel**.
- **Base de datos + Auth + Storage:** **Supabase** (Postgres + Supabase Auth + Row Level Security + Storage).
- **Agente local:** Node.js 20 empaquetado a `.exe` con `pkg`, usando `node-adodb` sobre **VFPOLEDB** (driver Windows 32-bit) para leer los DBF de Numier.
- **Lenguaje:** TypeScript en todo el stack.
- **Estilos:** Tailwind CSS v4 + componentes shadcn/ui.
- **Validación:** Zod en los límites (API e ingestion).

---

## 1. Resumen ejecutivo y alcance

**NumierConta Gateway** automatiza la contabilización de la actividad de uno o varios negocios de hostelería que operan con **Numier TPV**, generando los asientos contables que se importan en **ClassicConta 6/7**. Es **multiempresa** (multitenant), **configurable** por cliente y se opera como **SaaS**.

### 1.1. Componentes

| Componente | Responsabilidad | Tecnología |
|---|---|---|
| **Numier Agent** | Extraer datos de los DBF, detectar cierres nuevos, enviar *staging* por HTTPS, reintentos | Node.js + `node-adodb` (VFPOLEDB) → `.exe` |
| **API Ingesta** | Recibir *staging*, autenticar agente (API key), validar (Zod), upsert en tablas `stg_*` | Next.js 16 Route Handlers |
| **Motor ETL** | Transformar *staging* → asientos según mapa de cuentas, calcular IVA, validar cuadre | TypeScript (Server Action / job) |
| **Generador TXT** | Producir ficheros ASCII de ancho fijo (subcuentas + diario), subir a Storage | TypeScript |
| **Panel web** | Gestión de empresas, mapas, revisión de asientos, descarga TXT, dashboard | Next.js 16 + React + Supabase |
| **Base de datos** | Persistencia multiempresa con RLS, auth, storage | Supabase |

### 1.2. Frontera arquitectónica crítica (LEER)

La lectura de DBF de FoxPro requiere **VFPOLEDB**, un driver **Windows de 32 bits**. **No puede ejecutarse en Vercel ni en funciones serverless** (Linux). Por tanto:

- La **extracción (E)** ocurre **solo** en el **agente local Windows**.
- El **backend serverless nunca lee DBF**: recibe datos ya extraídos en **JSON**.
- **No** incluyas dependencias de FoxPro/OLEDB en el proyecto Next.js. Son dos proyectos separados en el monorepo: `apps/web` y `apps/agent`.

### 1.3. Por qué Supabase (no Neon)

| Necesidad | Supabase | Neon |
|---|---|---|
| Postgres gestionado | Sí | Sí |
| Auth y gestión de usuarios | Integrada | No (añadir Clerk/Auth.js) |
| Multitenancy con RLS | Nativo y declarativo | Manual en aplicación |
| Storage de ficheros (TXT) | Supabase Storage | No (añadir S3/R2) |
| Realtime / APIs autogeneradas | Sí | No |

**Decisión:** Supabase cubre Postgres + Auth + aislamiento multiempresa (RLS) + Storage en una plataforma, minimizando superficie de desarrollo. **Se construye sobre Supabase.**

---

## 2. Arquitectura general

### 2.1. Flujo end-to-end (ETL distribuido)

Extracción en el borde (local), transformación y carga en el centro (cloud).

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

### 2.2. Patrón ETL

- **Extract (agente):** lee DBF y vuelca registros crudos a tablas `stg_*` vía API, **sin transformar**. Desacopla captura de lógica contable y permite reprocesar.
- **Transform (backend):** el motor ETL lee el *staging*, aplica el mapa de cuentas de la empresa, calcula bases y cuotas de IVA, agrupa por cierre y construye asientos. **Idempotente**.
- **Load (backend + gestor):** el generador produce los TXT de ancho fijo; el gestor los descarga e importa en ClassicConta. La carga final es **asistida** (el Importador de Asientos muestra rejilla de revisión).

### 2.3. Monorepo

```
numierconta-gateway/
├── apps/
│   ├── web/            # Next.js 16 (Vercel) — backend + panel
│   └── agent/          # Node.js → .exe (Windows local)
├── packages/
│   ├── shared/         # tipos TS compartidos, esquemas Zod, constantes
│   └── etl/            # lógica pura de transformación (testeable)
├── supabase/
│   ├── migrations/     # SQL de esquema + RLS
│   └── seed.sql        # datos de ejemplo (plan contable hostelería)
└── package.json        # workspaces (pnpm)
```

---

## 3. Modelo de datos (Supabase / Postgres)

Cuatro grupos: **tenancy/usuarios**, **configuración por empresa**, **staging** (crudo del agente) y **resultado contable**. Todas las tablas de negocio llevan `company_id` para RLS.

### 3.1. Tenancy y usuarios

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  cif text,
  classicconta_digits int default 8,    -- nº dígitos de subcuenta del plan
  fiscal_year int,                       -- ejercicio activo en ClassicConta
  agent_api_key text unique not null,    -- clave del agente local (hash en prod)
  timezone text default 'Europe/Madrid',
  active boolean default true,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name text,
  role text not null default 'viewer',   -- owner | admin | accountant | viewer
  created_at timestamptz default now()
);

create table user_companies (
  user_id uuid references profiles(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  primary key (user_id, company_id)
);
```

### 3.2. Configuración contable por empresa

El **mapa de cuentas** es el corazón configurable. Se modela como **reglas** (editables desde el panel), no como código.

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,                 -- p.ej. 70000002
  title text not null,
  nif text,
  vat_type char(1),                   -- G/N/I/P/J/T (tipo IVA ClassicConta)
  vat_rate numeric(5,2),              -- % IVA si es subcuenta de IVA
  surcharge_rate numeric(5,2),
  account_class text,                 -- sales|vat_out|vat_in|cash|bank|expense|customer|supplier|invitation
  created_at timestamptz default now(),
  unique(company_id, code)
);

create table mapping_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  rule_type text not null,   -- sales_by_vat | payment_method | expense_category | invitation
  match_key text,            -- p.ej. '10' (tipo IVA), 'TARJETA', id de categoría
  debit_account text,        -- subcuenta al debe (code)
  credit_account text,       -- subcuenta al haber (code)
  vat_account text,          -- subcuenta de IVA asociada (si aplica)
  priority int default 100,
  active boolean default true
);
```

### 3.3. Staging (datos crudos del agente)

Réplica fiel de las tablas Numier relevantes. La clave natural `(company_id, numier_*_id)` garantiza **idempotencia** (upsert sin duplicar).

```sql
-- Cierres de caja (fechas.DBF)
create table stg_closures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  numier_fec_id bigint not null,      -- FEC_ID
  opened_at timestamptz,              -- FEC_INI
  closed_at timestamptz,              -- FEC_FIN (null = sesión abierta)
  total_cash numeric(14,2),           -- FEC_EFECTI
  total_card numeric(14,2),           -- FEC_TARJET
  total_sales numeric(14,2),          -- FEC_TOTAL
  change_kept numeric(14,2),          -- FEC_CAMBIO
  withdrawals numeric(14,2),          -- FEC_RETIRA
  ingested_at timestamptz default now(),
  processed boolean default false,
  unique(company_id, numier_fec_id)
);

-- Cabeceras de ticket (cabecera.DBF)
create table stg_ticket_head (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  numier_cab_id bigint not null,      -- CAB_ID
  ticket_date date not null,          -- CAB_FECHA
  ticket_time time,                   -- CAB_HORA
  operator_code text,                 -- CAB_OPERAR
  state char(1),                      -- CAB_ESTADO (C/P/N/X/G/I)
  payment_main char(1),               -- CAB_COBRO
  amount_card numeric(12,2),          -- CAB_ENT_TA
  amount_check numeric(12,2),         -- CAB_ENT_CH
  invoice_number text,                -- CAB_FACTUR
  customer_nif text,                  -- CAB_CIFNIF
  doc_number text,                    -- CAB_NUMDOC
  numier_cli_id bigint,               -- CAB_ID_CLI
  total numeric(14,2),
  closure_fec_id bigint,              -- enlace al cierre
  unique(company_id, numier_cab_id)
);

-- Líneas de ticket (detalle.DBF) — el IVA por línea vive aquí
create table stg_ticket_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  numier_cab_id bigint not null,      -- DET_ID (enlaza con cabecera)
  line_seq int,                       -- orden de línea (para idempotencia)
  article_code text,                  -- DET_ARTICU
  qty numeric(12,3),                  -- DET_CANTID
  unit_price numeric(12,2),           -- DET_PRECIO (IVA incl.)
  line_amount numeric(12,2),          -- DET_IMPORT (IVA incl.)
  vat_rate numeric(6,2),              -- DET_TIPO_I  ** CLAVE **
  description text,                   -- DET_DESCRI
  unique(company_id, numier_cab_id, line_seq)
);

-- Gastos (gastocab.DBF / gastodet.DBF)
create table stg_expense_head (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  numier_gac_id bigint not null,
  expense_date date not null,         -- GAC_FECHA
  supplier_id bigint,                 -- GAC_ID_PRO
  total numeric(16,2),                -- GAC_TOTAL
  from_cash boolean,                  -- GAC_DE_CAJ
  invoice_ref text,                   -- GAC_REF_FA
  processed boolean default false,
  unique(company_id, numier_gac_id)
);

create table stg_expense_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  numier_gac_id bigint not null,
  line_seq int,
  amount numeric(15,2),               -- GAD_IMPORT
  total numeric(17,2),                -- GAD_TOTAL
  vat_rate numeric(12,2),             -- GAD_TIPO_I
  unique(company_id, numier_gac_id, line_seq)
);

-- Maestros (clientes / proveedores)
create table stg_customers (
  company_id uuid not null references companies(id) on delete cascade,
  numier_cli_id bigint not null,
  nif text, name text, address text, postal_code text, city text, province text,
  primary key (company_id, numier_cli_id)
);

create table stg_suppliers (
  company_id uuid not null references companies(id) on delete cascade,
  numier_con_id bigint not null,
  nif text, name text, address text, postal_code text, city text, province text,
  category_id bigint,
  primary key (company_id, numier_con_id)
);
```

### 3.4. Resultado contable

```sql
create table batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  period_from date, period_to date,
  status text default 'draft',          -- draft|reviewed|exported|imported
  total_debit numeric(16,2), total_credit numeric(16,2),
  balanced boolean,
  txt_diario_path text,                 -- ruta en Supabase Storage
  txt_subcuentas_path text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  batch_id uuid references batches(id) on delete cascade,
  entry_number int not null,            -- nº de asiento (Asien)
  entry_date date not null,
  concept text,
  doc_number text,
  source_type text,                     -- closure | expense | invoice
  source_ref text,                      -- FEC_ID / GAC_ID / CAB_ID origen
  balanced boolean
);

create table entry_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  line_seq int,
  account_code text not null,           -- subcuenta
  concept text,
  debit numeric(16,2) default 0,
  credit numeric(16,2) default 0,
  vat_invoice_type char(1),             -- E|R (TipoFac)
  is_rectification boolean default false
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  event text, detail jsonb, created_at timestamptz default now()
);
```

---

## 4. Multitenancy y seguridad (Row Level Security)

**Regla de oro:** ninguna fila de negocio es accesible sin pertenecer a una `company` a la que el usuario tiene acceso. Activar RLS en **todas** las tablas con `company_id`.

### 4.1. Función auxiliar y políticas

```sql
-- Devuelve las companies accesibles por el usuario autenticado
create or replace function auth_company_ids()
returns setof uuid language sql stable security definer as $$
  select uc.company_id
  from user_companies uc
  join profiles p on p.id = uc.user_id
  where p.id = auth.uid()
$$;

alter table companies enable row level security;
create policy company_access on companies
  for select using (id in (select auth_company_ids()));

-- Patrón aplicado a TODAS las tablas con company_id:
alter table entries enable row level security;
create policy entries_rw on entries
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));
-- (replicar la política anterior para: accounts, mapping_rules, stg_*, batches,
--  entry_lines, audit_log, user_companies)
```

### 4.2. Roles de aplicación

| Rol | Permisos |
|---|---|
| `owner` | Todo dentro de su organización; gestión de usuarios y facturación |
| `admin` | Configurar empresas y mapas de cuentas, lanzar ETL, exportar |
| `accountant` | Revisar y exportar asientos; editar mapas; sin gestión de usuarios |
| `viewer` | Solo lectura (dashboard y asientos) |

### 4.3. Autenticación del agente local

El agente **no** usa Supabase Auth (no hay usuario interactivo). Se autentica con `agent_api_key` por empresa, enviada en cabecera `X-Agent-Key`. La API de ingesta valida la clave contra `companies.agent_api_key` usando el **service role** de Supabase (que bypassa RLS) y fija el `company_id` correspondiente. **La service role key vive solo en variables de entorno del servidor, nunca en el cliente.**

---

## 5. Contrato de la API (Next.js Route Handlers)

Base: `/api`. Todas las respuestas en JSON. Errores con `{ error: { code, message } }` y código HTTP adecuado.

### 5.1. Ingesta (consumida por el agente)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/ingest/closures` | `X-Agent-Key` | Upsert de cierres (`stg_closures`) |
| `POST` | `/api/ingest/tickets` | `X-Agent-Key` | Upsert de cabeceras + líneas de ticket |
| `POST` | `/api/ingest/expenses` | `X-Agent-Key` | Upsert de gastos cabecera + líneas |
| `POST` | `/api/ingest/masters` | `X-Agent-Key` | Upsert de clientes y proveedores |
| `GET`  | `/api/agent/state` | `X-Agent-Key` | Devuelve `last_fec_id` procesado (para que el agente sepa desde dónde leer) |

**Payload `POST /api/ingest/tickets`** (validar con Zod):

```jsonc
{
  "heads": [
    {
      "numier_cab_id": 1024, "ticket_date": "2026-06-15", "ticket_time": "13:42:10",
      "operator_code": "00001", "state": "C", "payment_main": "E",
      "amount_card": 0, "amount_check": 0, "invoice_number": "",
      "customer_nif": "", "doc_number": "FS-000123", "numier_cli_id": null,
      "total": 12.50, "closure_fec_id": 42
    }
  ],
  "lines": [
    {
      "numier_cab_id": 1024, "line_seq": 1, "article_code": "00001",
      "qty": 2, "unit_price": 1.20, "line_amount": 2.40, "vat_rate": 10,
      "description": "COCA-COLA"
    }
  ]
}
```

**Reglas de ingesta:** upsert por clave natural; nunca borrar; responder `{ inserted, updated, skipped }`. Idempotente: reenviar el mismo lote no duplica.

### 5.2. Gestión y ETL (consumida por el panel, con Supabase Auth)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/etl/run` | Lanza la transformación para `{ company_id, period_from, period_to }`; crea un `batch` y sus `entries` |
| `GET`  | `/api/batches?company_id=` | Lista lotes |
| `GET`  | `/api/batches/:id` | Detalle del lote con asientos y apuntes |
| `POST` | `/api/batches/:id/generate-txt` | Genera `DIARIO.TXT` y `SUBCUENTAS.TXT`, sube a Storage, devuelve URLs firmadas |
| `PATCH`| `/api/batches/:id` | Cambia estado (`reviewed`, `exported`, `imported`) |
| `GET`  | `/api/dashboard?company_id=&from=&to=` | KPIs agregados para el cuadro de mando |

---

## 6. Motor ETL — lógica de transformación (NÚCLEO)

> Implementar en `packages/etl` como **funciones puras y testeables** (entrada: filas de staging + mapa de cuentas; salida: asientos). El backend solo orquesta (lee staging, llama a `etl`, persiste).

### 6.1. Principios

- **Precios de Numier son IVA INCLUIDO.** Base e IVA se calculan, no se leen:
  - `base = round(line_amount / (1 + vat_rate/100), 2)`
  - `cuota = round(line_amount - base, 2)`
- **Agrupación por cierre (Z):** un asiento resumen por cierre, no por ticket (reduce volumen y es la práctica estándar en hostelería). Excepción: las **facturas completas con NIF** generan asiento propio (trazabilidad fiscal).
- **Idempotencia:** reprocesar un cierre elimina y regenera sus `entries` (mismo `source_ref`).
- **Cuadre obligatorio:** `Σ debit == Σ credit` por asiento. Si por redondeo difiere en ±0,02 €, ajustar el **último apunte de mayor importe**. Si difiere más, marcar `balanced=false` y no exportar.

### 6.2. Casuística completa (toda debe implementarse)

| # | Caso | Origen | Tratamiento |
|---|---|---|---|
| 1 | Venta ticket simplificado | `stg_ticket_head.state='C'` sin `invoice_number` | Agregar al asiento de cierre Z. Cliente = subcuenta genérica "Ventas mostrador" |
| 2 | Venta con factura completa (NIF) | `state='C'` con `invoice_number` y `customer_nif` | Asiento propio; subcuenta cliente 430 nominal; `TipoFac='E'` |
| 3 | Desglose multi-IVA | `stg_ticket_lines.vat_rate` distintos en un cierre | Una línea de venta (700) y una de IVA (477) **por cada tipo** |
| 4 | Cobro efectivo | `payment_main='E'` / residual | Debe 570 (caja) |
| 5 | Cobro tarjeta | `amount_card > 0` | Debe 572 (banco) |
| 6 | Cobro cheque | `amount_check > 0` | Debe 572 (banco/cheques) |
| 7 | Cobro mixto | varias formas en mismo ticket | Repartir el debe entre 570/572 según importes |
| 8 | Invitación / cortesía | `state='I'` o líneas marcadas | Gasto 659 al debe + contrapartida que minora venta |
| 9 | Anulación | `state='N'` | **Excluir** del asiento (no se contabiliza) |
| 10 | Cambio / apertura | `state='X'` | **Excluir** (movimiento de caja, no venta) |
| 11 | Cuenta pendiente | `state='P'` | **Excluir** del cierre; se contabiliza cuando pase a `'C'` |
| 12 | Gasto con IVA | `stg_expense_*` con `vat_rate>0` | Gasto (6XX) + IVA soportado (472) al debe; proveedor (400) al haber |
| 13 | Gasto sin IVA | `vat_rate=0` | Gasto (6XX) al debe; proveedor/caja al haber |
| 14 | Gasto de caja | `from_cash=true` | Haber a 570 (caja) en vez de 400 |
| 15 | Factura rectificativa | serie `FR` (de Numier) | `is_rectification=true`, importes en negativo o invertidos según criterio |
| 16 | Descuadre de cierre | `FEC_EFECTI` ≠ ventas-gastos calculados | Registrar diferencia en cuenta de descuadre (apunte de ajuste 659/759) y avisar |
| 17 | Multi-tipo de IVA en gasto | `stg_expense_lines.vat_rate` varios | Una línea 472 por cada tipo |

### 6.3. Algoritmo de generación del asiento de cierre Z (pseudocódigo)

```ts
function buildClosureEntry(closure, tickets, lines, rules, accounts): Entry {
  const entry = newEntry({ date: closure.closed_at, concept: `CIERRE Z ${fmt(date)}`,
                           source_type: 'closure', source_ref: closure.numier_fec_id });

  // 1) Agrupar líneas de tickets COBRADOS (state='C') sin factura nominal, por tipo de IVA
  const salesByVat = groupBy(
    lines.filter(l => isCashTicket(l, tickets)),  // excluye N, X, P, facturas nominales
    l => l.vat_rate
  );

  // 2) HABER: por cada tipo de IVA, una línea de venta (700) y una de IVA (477)
  for (const [rate, ls] of salesByVat) {
    const gross = sum(ls, 'line_amount');
    const base  = round(gross / (1 + rate/100), 2);
    const cuota = round(gross - base, 2);
    entry.add({ account: salesAccount(rate, rules),  credit: base });
    if (cuota > 0) entry.add({ account: vatOutAccount(rate, rules), credit: cuota });
  }

  // 3) Invitaciones (state='I'): gasto al debe + contrapartida al haber
  const inv = sumInvitations(tickets, lines);
  if (inv > 0) { entry.add({ account: '65900001', debit: inv });
                 entry.add({ account: defaultSalesAccount(rules), credit: inv }); }

  // 4) DEBE: cobros por forma de pago
  const card  = sum(tickets, 'amount_card');
  const check = sum(tickets, 'amount_check');
  const cash  = entry.totalCredit() - card - check - inv;  // residual
  if (cash  > 0) entry.add({ account: cashAccount(rules),  debit: cash });
  if (card  > 0) entry.add({ account: bankAccount(rules),  debit: card });
  if (check > 0) entry.add({ account: checkAccount(rules), debit: check });

  // 5) Cuadre y ajuste por redondeo
  balanceOrAdjust(entry, tolerance = 0.02);
  return entry;
}
```

### 6.4. Numeración de asientos

`entry_number` correlativo dentro del `batch`, comenzando en 1. ClassicConta renumera al importar según su propio contador, así que la numeración del batch solo debe ser **consistente y única dentro del fichero**.

---

## 7. Generador de ficheros para ClassicConta

> Especificación basada en el **Protocolo de comunicación de programas de gestión con ClassicConta 6** (AIG). Ancho fijo, codificación **Windows-1252 (ANSI)**, fin de registro **CR+LF**. Numéricos alineados a la derecha rellenando con **ceros** a la izquierda; alfanuméricos a la izquierda rellenando con **blancos** a la derecha. Importes: 16 posiciones, **2 decimales implícitos** (sin separador; los 2 últimos dígitos son decimales).

### 7.1. SUBCUENTAS.TXT — 444 caracteres/registro

| Nº | Campo | Tipo | Pos. inicio | Long. | Obl. | Notas |
|---|---|---|---|---|---|---|
| 1 | Cod | C | 1 | 12 | * | Código de subcuenta |
| 2 | Titulo | C | 13 | 40 | * | Título |
| 3 | NIF | C | 53 | 15 | * | NIF (blancos si no aplica) |
| 4 | Domicilio | C | 68 | 35 | | |
| 5 | Poblacion | C | 103 | 25 | | |
| 6 | Provincia | C | 128 | 20 | | |
| 7 | CodPostal | C | 148 | 5 | | |
| 8 | Reservado | C | 153 | 8 | | Blancos |
| 9 | TipoIVA | C | 161 | 1 | | G/N/I/P/A/R/J/T |
| 10 | Reservado | C | 162 | 46 | | Blancos |
| 11 | TPC | N | 208 | 5 | * | % IVA (oblig. en subcuenta de IVA) |
| 12 | RecEquiv | N | 213 | 5 | * | % recargo equivalencia |
| 13 | Fax01 | C | 218 | 15 | | |
| 14 | Email | C | 233 | 50 | | |
| 15 | Reservado | C | 283 | 100 | | Blancos |
| 16 | IdNif | N | 383 | 1 | | Clave id. tercero (1=NIF) |
| 17 | CodPais | C | 384 | 2 | | ISO país |
| 18 | Rep14NIF | C | 386 | 9 | | |
| 19 | Reservado | C | 395 | 45 | | Blancos |
| 20 | nIRPF | N | 440 | 5 | | % IRPF |

**Total: 444.** El fichero de subcuentas debe incluir **todas** las subcuentas referenciadas por los asientos del batch que no preexistan en ClassicConta (clientes/proveedores nominales, cuentas de IVA con su `TipoIVA` y `TPC`). Las subcuentas con dígitos distintos a `companies.classicconta_digits` deben rellenarse a esa longitud.

### 7.2. DIARIO.TXT — 869 caracteres/registro

| Nº | Campo | Tipo | Pos. inicio | Long. | Obl. | Notas |
|---|---|---|---|---|---|---|
| 1 | Asien | N | 1 | 6 | * | Nº de asiento |
| 2 | Fecha | F | 7 | 8 | * | AAAAMMDD |
| 3 | Subcta | C | 15 | 12 | * | Subcuenta |
| 4 | Reservado | C | 27 | 28 | | Blancos |
| 5 | Concepto | C | 55 | 25 | * | Concepto |
| 6 | Reservado | C | 80 | 50 | | Blancos |
| 7 | Documento | C | 130 | 10 | | Nº documento |
| 8 | Reservado | C | 140 | 3 | | Blancos |
| 9 | Clave | C | 143 | 6 | | Proyecto (analítica) |
| 10 | Reservado | C | 149 | 90 | | Blancos |
| 11 | EuroDebe | N | 239 | 16 | * | Importe debe (2 dec. implícitos) |
| 12 | EuroHaber | N | 255 | 16 | * | Importe haber (2 dec. implícitos) |
| 13 | Reservado | C | 271 | 68 | | Blancos |
| 14 | Rectifica | L | 339 | 1 | | T si rectificativa |
| 15 | Reservado | C | 340 | 529 | | Blancos |
| 16 | TipoFac | C | 869 | 1 | | E=Emitida / R=Recibida |

**Total: 869.** ClassicConta **calcula automáticamente el registro de IVA** a partir de la subcuenta y su `TipoIVA`/`TPC`. El generador solo debe emitir los apuntes correctos.

### 7.3. Implementación del formateador (helpers obligatorios)

```ts
const padNum = (value: number, len: number): string => {
  // 2 decimales implícitos: 12.5 -> "0000000000001250"
  const cents = Math.round(value * 100);
  const neg = cents < 0;
  const s = Math.abs(cents).toString().padStart(len - (neg ? 1 : 0), '0');
  return (neg ? '-' : '') + s;
};
const padStr = (value: string, len: number): string =>
  (value ?? '').slice(0, len).padEnd(len, ' ');
const fmtDate = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
// Escribir con iconv-lite a 'win1252' y unir registros con '\r\n'.
```

### 7.4. Ejemplos de asientos (validación funcional)

**Cierre Z 15/06/2026** — ventas 1.500 € (base 10%: 900 + IVA 90; base 21%: 400 + IVA 84; invitaciones 26). Cobro 874 efectivo + 600 tarjeta:

| Asien | Fecha | Subcta | Concepto | Debe | Haber |
|---|---|---|---|---|---|
| 1 | 20260615 | 57000001 | CIERRE Z 15/06 EFECT | 874,00 | |
| 1 | 20260615 | 57200001 | CIERRE Z 15/06 TARJ | 600,00 | |
| 1 | 20260615 | 65900001 | CIERRE Z 15/06 INVIT | 26,00 | |
| 1 | 20260615 | 70000002 | CIERRE Z 15/06 VTA10 | | 900,00 |
| 1 | 20260615 | 47700002 | CIERRE Z 15/06 IVA10 | | 90,00 |
| 1 | 20260615 | 70000001 | CIERRE Z 15/06 VTA21 | | 400,00 |
| 1 | 20260615 | 47700001 | CIERRE Z 15/06 IVA21 | | 84,00 |
| 1 | 20260615 | 70000002 | CIERRE Z 15/06 INV.CT | | 26,00 |

Debe = Haber = 1.500,00 ✔

**Gasto de proveedor** — base 320 + IVA 10% (32) = 352:

| Asien | Fecha | Subcta | Concepto | Debe | Haber | TipoFac |
|---|---|---|---|---|---|---|
| 2 | 20260614 | 60000001 | FRA DISTRIB SUR MP | 320,00 | | R |
| 2 | 20260614 | 47200002 | FRA DISTRIB SUR IVA | 32,00 | | R |
| 2 | 20260614 | 40000002 | FRA DISTRIB SUR | | 352,00 | R |

---

## 8. Esquema de origen Numier (referencia para el agente)

Tablas FoxPro DBF en la carpeta de datos de Numier. El agente las lee con VFPOLEDB. **Solo lectura.**

| Tabla DBF | Uso | Campos clave |
|---|---|---|
| `fechas` | Cierres de caja (Z) | FEC_ID, FEC_INI, FEC_FIN, FEC_EFECTI, FEC_TARJET, FEC_TOTAL, FEC_CAMBIO, FEC_RETIRA |
| `cabecera` | Cabecera de ticket/cuenta | CAB_ID, CAB_FECHA, CAB_HORA, CAB_OPERAR, CAB_ESTADO, CAB_COBRO, CAB_ENT_TA, CAB_ENT_CH, CAB_FACTUR, CAB_CIFNIF, CAB_NUMDOC, CAB_ID_CLI |
| `detalle` | Líneas de venta (IVA por línea) | DET_ID, DET_ARTICU, DET_CANTID, DET_PRECIO, DET_IMPORT, **DET_TIPO_I**, DET_DESCRI |
| `gastocab` | Cabecera de gasto | GAC_ID, GAC_ID_PRO, GAC_FECHA, GAC_TOTAL, GAC_DE_CAJ, GAC_REF_FA |
| `gastodet` | Líneas de gasto (IVA) | GAD_ID_CAB, GAD_IMPORT, GAD_TOTAL, **GAD_TIPO_I** |
| `clientes` | Maestro clientes | CLI_ID, CLI_CIFNIF, CLI_NOMBRE, CLI_APELLI, CLI_DIRECC, CLI_CP, CLI_LOCALI, CLI_PROVIN |
| `conceptos` | Proveedores/conceptos de gasto | CON_ID, CON_CIFNIF, CON_NOMBRE, CON_DIRECC, CON_CP, CON_LOCALI, CON_PROVIN |
| `articulos` | Artículos | ART_CODIGO, ART_DESCRI, ART_TIPO_I, ART_GRUPO, ART_SCANDL |
| `series` | Series de facturación | SER_SERIE (FS/FR/FA), SER_ANO, SER_NUMERO |
| `categorias` | Categorías de gasto/artículo | CAT_ID, CAT_NOMBRE, CAT_TIPO (P/A) |

**Estados de ticket (`CAB_ESTADO`):** `C`=Cobrada, `P`=Pendiente, `N`=Anulada, `X`=Cambio, `G`=Gasto, `I`=Invitación. **Solo se contabiliza `C` (y `I` como invitación).**

---

## 9. Agente local (Numier Agent)

### 9.1. Requisitos de ejecución

- Windows (XP SP3 a 11). Proceso **32-bit** obligatorio (VFPOLEDB es 32-bit).
- Requiere **VFPOLEDB.dll** instalado (Microsoft OLE DB Provider for Visual FoxPro 9.0 SP2). Si no está, el instalador del agente lo despliega.
- Lee la carpeta de datos de Numier (configurable; por defecto `C:\Numier\datos`).

### 9.2. Configuración (`agent.config.json`)

```jsonc
{
  "apiBaseUrl": "https://app.numierconta.com",
  "agentApiKey": "ck_live_xxx",      // = companies.agent_api_key
  "numierDataPath": "C:\\Numier\\datos",
  "pollSeconds": 300,                 // frecuencia de sondeo
  "batchSize": 500
}
```

### 9.3. Ciclo de trabajo

```
cada pollSeconds:
  1. GET /api/agent/state            -> last_fec_id
  2. abrir conexión VFPOLEDB (read-only) a numierDataPath
  3. SELECT cierres nuevos:  FEC_ID > last_fec_id AND FEC_FIN IS NOT NULL
  4. por cada cierre:
       - leer cabeceras del período [FEC_INI, FEC_FIN]
       - leer líneas (detalle) de esas cabeceras
       - leer gastos del período
  5. sincronizar maestros nuevos/cambiados (clientes, proveedores)
  6. POST a /api/ingest/* en lotes de batchSize (idempotente)
  7. registrar en log local + audit remoto
  8. cerrar conexión
```

### 9.4. Conexión VFPOLEDB y ejemplo de consulta

```ts
import ADODB from 'node-adodb';
const conn = ADODB.open(
  `Provider=VFPOLEDB.1;Data Source=${cfg.numierDataPath};Mode=Read|Share Deny None;`
);

// Desglose de ventas por tipo de IVA de un período (cierre)
const sql = `
  SELECT d.DET_TIPO_I AS vat_rate,
         SUM(d.DET_IMPORT) AS gross
  FROM cabecera c
  INNER JOIN detalle d ON d.DET_ID = c.CAB_ID
  WHERE c.CAB_FECHA BETWEEN ?from AND ?to
    AND c.CAB_ESTADO = 'C'
  GROUP BY d.DET_TIPO_I`;
```

> **Nota técnica:** abrir siempre en `Mode=Read` con `Share Deny None` para no bloquear a Numier. Nunca emitir `INSERT/UPDATE/DELETE` ni `PACK/REINDEX`. Manejar memo files (.FPT) e índices (.CDX) como solo lectura.

### 9.5. Robustez

- **Reintentos:** cola local persistente (SQLite embebido o fichero) de lotes pendientes; reenviar ante fallo de red con backoff exponencial.
- **Idempotencia:** la API hace upsert, así que reenviar es seguro.
- **Estado local:** guardar `last_fec_id` y marca temporal del último maestro sincronizado.
- **Sin pérdida:** si el backend no confirma, no avanzar `last_fec_id`.

---

## 10. Panel web (Next.js 16)

### 10.1. Rutas (App Router)

```
/                         -> redirección a /dashboard o /login
/login                    -> Supabase Auth (email+password, magic link)
/onboarding               -> crear organización y primera empresa
/dashboard                -> selector de empresa + KPIs (cuadro de mando)
/companies                -> CRUD de empresas, generar agent_api_key
/companies/[id]/accounts  -> editor de plan de subcuentas
/companies/[id]/mapping   -> editor de reglas de mapeo (mapa de cuentas)
/batches                  -> lista de lotes ETL
/batches/[id]             -> revisión de asientos; botón Generar TXT / Descargar
/settings/users           -> gestión de usuarios y roles (solo owner/admin)
/settings/agent           -> instrucciones e instalador del agente, API key
```

### 10.2. Cuadro de mando (dashboard)

KPIs operativos (de staging) + cierre fiscal cuando exista contabilidad. Origen de cada KPI:

| KPI | Cálculo | Fuente |
|---|---|---|
| Ventas del período | Σ `stg_ticket_head.total` (state='C') | staging |
| Ticket medio | ventas / nº tickets | staging |
| Ventas por tipo de IVA | agregación de `stg_ticket_lines` | staging |
| Ventas por franja horaria | group by hora de `ticket_time` | staging |
| Top productos | Σ por `article_code` | staging |
| Gastos del período | Σ `stg_expense_head.total` | staging |
| Margen operativo bruto | ventas − coste materia (escandallo) − gastos | staging |
| Cobros efectivo vs tarjeta | Σ amount_card vs residual | staging |

> El P&L real (con amortizaciones, personal, etc.) procede de ClassicConta y queda **fuera del MVP**; dejar el panel preparado para incorporarlo como fase 2.

### 10.3. UX de revisión de asientos

Tabla de asientos con: nº, fecha, concepto, total debe, total haber, indicador de cuadre. Filas de apuntes expandibles. Asientos descuadrados resaltados en rojo y **no exportables**. Botón "Generar TXT" deshabilitado si algún asiento del lote no cuadra.

---

## 11. Seguridad y cumplimiento

- **Secretos:** `SUPABASE_SERVICE_ROLE_KEY` solo en entorno servidor (Route Handlers / Server Actions). El cliente usa la `anon key` + sesión RLS.
- **API keys del agente:** almacenar **hasheadas** (p.ej. SHA-256) en `companies.agent_api_key`; el agente envía la clave en claro por TLS y la API compara hashes. Permitir rotación.
- **Aislamiento:** todo acceso de datos vía RLS; ninguna consulta del panel sin sesión.
- **Auditoría:** registrar en `audit_log` cada ingesta, run de ETL, generación de TXT y cambio de estado.
- **Datos personales:** NIF y nombres de clientes son datos personales (RGPD). Cifrado en reposo (Supabase lo provee) y minimización: el agente solo envía clientes con factura.
- **Verifactu:** el cumplimiento de emisión es de Numier, no del gateway. No replicar lógica de firma.

---

## 12. Variables de entorno

```bash
# apps/web (Vercel)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # solo servidor
APP_BASE_URL=https://app.numierconta.com

# apps/agent (local)
# se leen de agent.config.json (ver 9.2)
```

---

## 13. Plan de implementación (orden recomendado para el agente)

1. **Monorepo + Supabase:** crear workspaces, proyecto Supabase, aplicar migraciones (sección 3) y políticas RLS (sección 4). Cargar `seed.sql` con un plan de cuentas de hostelería por defecto.
2. **Tipos compartidos:** en `packages/shared`, definir tipos TS y esquemas Zod de todos los payloads (sección 5).
3. **API de ingesta:** Route Handlers `/api/ingest/*` con auth por `X-Agent-Key`, validación Zod y upsert idempotente.
4. **Motor ETL:** en `packages/etl`, funciones puras de la sección 6 con **tests unitarios** sobre los ejemplos de 7.4 (deben cuadrar exactamente).
5. **Generador TXT:** sección 7, con tests que verifiquen longitudes (444/869) y posiciones de campos.
6. **API de gestión/ETL:** `/api/etl/run`, `/api/batches/*`, `/api/dashboard`.
7. **Panel web:** auth, onboarding, empresas, editor de mapa de cuentas, revisión de lotes, dashboard (sección 10).
8. **Agente local:** proyecto `apps/agent`, conexión VFPOLEDB, ciclo de trabajo (sección 9), empaquetado a `.exe` con `pkg`, instalador que despliegue VFPOLEDB.
9. **E2E:** simular un agente enviando un cierre de ejemplo → run ETL → generar TXT → validar contenido byte a byte contra el ejemplo esperado.

### 13.1. Criterios de aceptación (Definition of Done)

- [ ] Migraciones aplican y RLS impide ver datos de otra empresa (test con dos companies).
- [ ] Ingesta idempotente: reenviar el mismo lote no duplica filas.
- [ ] ETL reproduce **exactamente** los asientos de la sección 7.4 (cuadre al céntimo).
- [ ] Toda la casuística de 6.2 cubierta con test por caso.
- [ ] `DIARIO.TXT` (869) y `SUBCUENTAS.TXT` (444) con longitudes y posiciones correctas, Windows-1252, CR+LF.
- [ ] Asientos descuadrados bloquean la exportación.
- [ ] Dashboard muestra los KPIs de la sección 10.2 para la empresa seleccionada.
- [ ] Agente compila a `.exe` 32-bit, lee DBF en solo lectura y completa el ciclo sin bloquear Numier.
- [ ] Multiempresa real: un usuario `accountant` con acceso a 2 empresas opera ambas sin fuga de datos.

---

## 14. Anexo — `seed.sql` (plan de cuentas hostelería por defecto)

Insertar como plantilla al crear empresa (sustituyendo `:company_id`):

```sql
insert into accounts (company_id, code, title, vat_type, vat_rate, account_class) values
(:company_id, '70000001', 'Ventas IVA 21%',        null, null, 'sales'),
(:company_id, '70000002', 'Ventas IVA 10%',        null, null, 'sales'),
(:company_id, '70000003', 'Ventas IVA 4%',         null, null, 'sales'),
(:company_id, '70000004', 'Ventas exentas',        null, null, 'sales'),
(:company_id, '47700001', 'HP IVA repercutido 21%','G',  21.0, 'vat_out'),
(:company_id, '47700002', 'HP IVA repercutido 10%','G',  10.0, 'vat_out'),
(:company_id, '47200001', 'HP IVA soportado 21%',  'G',  21.0, 'vat_in'),
(:company_id, '47200002', 'HP IVA soportado 10%',  'G',  10.0, 'vat_in'),
(:company_id, '57000001', 'Caja',                  null, null, 'cash'),
(:company_id, '57200001', 'Bancos (tarjeta)',      null, null, 'bank'),
(:company_id, '57200002', 'Bancos (cheques)',      null, null, 'bank'),
(:company_id, '60000001', 'Compras mercaderias',   null, null, 'expense'),
(:company_id, '62100001', 'Arrendamientos',        null, null, 'expense'),
(:company_id, '62800001', 'Suministros',           null, null, 'expense'),
(:company_id, '64000001', 'Sueldos y salarios',    null, null, 'expense'),
(:company_id, '65900001', 'Invitaciones/cortesias',null, null, 'invitation'),
(:company_id, '43000000', 'Ventas mostrador',      null, null, 'customer');

insert into mapping_rules (company_id, rule_type, match_key, credit_account, vat_account) values
(:company_id, 'sales_by_vat', '21', '70000001', '47700001'),
(:company_id, 'sales_by_vat', '10', '70000002', '47700002'),
(:company_id, 'sales_by_vat', '4',  '70000003', null),
(:company_id, 'sales_by_vat', '0',  '70000004', null);

insert into mapping_rules (company_id, rule_type, match_key, debit_account) values
(:company_id, 'payment_method', 'EFECTIVO', '57000001'),
(:company_id, 'payment_method', 'TARJETA',  '57200001'),
(:company_id, 'payment_method', 'CHEQUE',   '57200002'),
(:company_id, 'invitation',     'DEFAULT',  '65900001');
```

---

*Fin del documento. Implementar conforme a esta especificación; ante cualquier ambigüedad, priorizar el cuadre contable exacto y el aislamiento multiempresa.*
