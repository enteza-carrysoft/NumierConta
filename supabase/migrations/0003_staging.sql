-- Staging: réplica fiel de tablas Numier (sección 3.3)
-- Clave natural (company_id, numier_*_id) garantiza idempotencia (upsert sin duplicar).

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
