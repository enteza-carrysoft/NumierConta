-- Configuración contable por empresa (sección 3.2)

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
