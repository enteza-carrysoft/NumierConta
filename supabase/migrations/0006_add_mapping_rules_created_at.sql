-- Añadir created_at a mapping_rules para alinear con el schema compartido

alter table mapping_rules
add column if not exists created_at timestamptz default now();
