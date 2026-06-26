-- Row Level Security (sección 4)
-- Regla de oro: ninguna fila de negocio es accesible sin pertenecer a una
-- company a la que el usuario tiene acceso.

create or replace function auth_company_ids()
returns setof uuid language sql stable security definer as $$
  select uc.company_id
  from user_companies uc
  join profiles p on p.id = uc.user_id
  where p.id = auth.uid()
$$;

-- companies: solo lectura de las accesibles
alter table companies enable row level security;
create policy company_access on companies
  for select using (id in (select auth_company_ids()));

-- profiles: cada usuario ve su propio perfil
alter table profiles enable row level security;
create policy profiles_self on profiles
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations: visibles si el usuario tiene perfil en ellas
alter table organizations enable row level security;
create policy organizations_access on organizations
  for select using (id in (select organization_id from profiles where id = auth.uid()));

-- user_companies
alter table user_companies enable row level security;
create policy user_companies_rw on user_companies
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

-- accounts
alter table accounts enable row level security;
create policy accounts_rw on accounts
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

-- mapping_rules
alter table mapping_rules enable row level security;
create policy mapping_rules_rw on mapping_rules
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

-- staging tables
alter table stg_closures enable row level security;
create policy stg_closures_rw on stg_closures
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_ticket_head enable row level security;
create policy stg_ticket_head_rw on stg_ticket_head
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_ticket_lines enable row level security;
create policy stg_ticket_lines_rw on stg_ticket_lines
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_expense_head enable row level security;
create policy stg_expense_head_rw on stg_expense_head
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_expense_lines enable row level security;
create policy stg_expense_lines_rw on stg_expense_lines
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_customers enable row level security;
create policy stg_customers_rw on stg_customers
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table stg_suppliers enable row level security;
create policy stg_suppliers_rw on stg_suppliers
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

-- resultado contable
alter table batches enable row level security;
create policy batches_rw on batches
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table entries enable row level security;
create policy entries_rw on entries
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table entry_lines enable row level security;
create policy entry_lines_rw on entry_lines
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

alter table audit_log enable row level security;
create policy audit_log_rw on audit_log
  using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));
