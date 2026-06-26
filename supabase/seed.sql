-- Plan de cuentas hostelería por defecto (sección 14)
-- Plantilla a insertar al crear una empresa, sustituyendo :company_id
-- (ejecutar con psql -v company_id="'<uuid>'" -f seed.sql, o adaptar
-- a una función plpgsql que reciba el company_id como parámetro).

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
