-- Resultado contable (sección 3.4)

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
