-- Tenancy y usuarios (sección 3.1)

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
