# Estado del desarrollo — NumierConta Gateway

> Fecha del snapshot: 2026-06-16
> Proyecto: NumierConta Gateway (SaaS multiempresa de contabilización desde Numier TPV hacia ClassicConta)
> Stack: Next.js 16 + Supabase + pnpm monorepo

---

## Resumen de lo implementado

### Fase 1: Infraestructura base (completa)

- Monorepo pnpm configurado con `apps/web`, `apps/agent`, `packages/shared`, `packages/etl`.
- Proyecto Supabase creado y conectado: `spwwajariflvqghmxewr`.
- Migraciones aplicadas en remoto (`0001` a `0005`):
  - `organizations`, `companies`, `profiles`, `user_companies`
  - `accounts`, `mapping_rules`
  - `stg_closures`, `stg_ticket_head`, `stg_ticket_lines`, `stg_expense_head`, `stg_expense_lines`, `stg_customers`, `stg_suppliers`
  - `batches`, `entries`, `entry_lines`, `audit_log`
  - Políticas RLS activas.

### Fase 2: API de ingesta (PRP-001, completa)

Endpoints implementados en `apps/web/src/app/api/`:

- `POST /api/ingest/closures` → `stg_closures`
- `POST /api/ingest/tickets` → `stg_ticket_head` + `stg_ticket_lines`
- `POST /api/ingest/expenses` → `stg_expense_head` + `stg_expense_lines`
- `POST /api/ingest/masters` → `stg_customers` + `stg_suppliers`
- `GET /api/agent/state` → `{ last_fec_id }`

Helpers:

- `apps/web/src/app/api/_lib/auth-agent.ts`
- `apps/web/src/app/api/_lib/respond.ts`
- `apps/web/src/app/api/_lib/upsert.ts`
- `apps/web/src/lib/supabase/service-role.ts`
- `apps/web/src/lib/supabase/database.types.ts` (tipos generados)

Validación:

- Auth por `X-Agent-Key`.
- Upsert idempotente verificado manualmente.
- `pnpm -r typecheck`, `pnpm -r test` y `pnpm --filter web build` pasan.

### Fase 3: Motor ETL (PRP-002, completa)

Implementado en `packages/etl/src/`:

- `vat.ts` — cálculo de base/cuota desde IVA incluido.
- `balance.ts` — cuadre y ajuste por redondeo ±0,02 €.
- `mapping.ts` — resolución de subcuentas desde `mapping_rules`.
- `closure-entry.ts` — asiento de cierre Z (ventas por IVA, cobros, invitaciones).
- `invoice-entry.ts` — facturas nominales con subcuenta cliente 430.
- `expense-entry.ts` — gastos con IVA soportado y proveedor/caja.
- `run-etl.ts` — orquestación y numeración correlativa.
- `scripts/e2e.ts` — validación E2E contra Supabase real.

Integración web:

- `apps/web/src/app/api/etl/run/route.ts`
- `apps/web/src/app/api/_lib/auth-user.ts`
- `apps/web/src/app/api/_lib/persist-batch.ts`

Validación:

- Tests unitarios reproducen ejemplos de la sección 7.4 del diseño.
- Script E2E confirma asientos cuadrados con datos reales de Supabase.
- `pnpm -r typecheck`, `pnpm -r test` y `pnpm --filter web build` pasan.

### Fase 4: Auth + Onboarding (PRP-003, completa)

Implementado en `apps/web/src/`:

- `features/auth/services/login.ts` — login con Supabase Auth (Server Action).
- `features/auth/services/signup.ts` — registro con Supabase Auth.
- `features/auth/services/logout.ts` — cierre de sesión.
- `features/auth/services/get-user-context.ts` — contexto del usuario en Server Components.
- `features/auth/components/login-form.tsx` / `signup-form.tsx` / `logout-button.tsx`.
- `features/onboarding/services/create-organization.ts` — crea organización, empresa, perfil owner y vínculo.
- `features/onboarding/components/onboarding-form.tsx`.
- `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/onboarding/page.tsx`.
- `app/(main)/layout.tsx` — layout protegido con header, info de empresa y logout.
- `app/page.tsx` — redirige a login/onboarding/dashboard según estado.
- `src/proxy.ts` — protección de rutas + redirecciones (reemplaza `middleware.ts` deprecado en Next.js 16).

Validación:

- Login exitoso con usuario de prueba `test@numierconta.com` / `TestPassword123!`.
- `pnpm -r typecheck`, `pnpm -r test` y `pnpm --filter web build` pasan.

### Fase 5: Agente local Windows (PRP-004, completa)

Implementado en `apps/agent/src/`:

- `config/` — carga de configuración por JSON o variables de entorno.
- `logger.ts` — logging simple por niveles.
- `api/client.ts` — cliente HTTP nativo (`http`/`https`) con `X-Agent-Key`.
- `api/state.ts` / `api/ingest.ts` — llamadas a `/api/agent/state` y `/api/ingest/*`.
- `dbf/connection.ts` — wrapper de `node-adodb` + VFPOLEDB y mock executor para tests.
- `dbf/closures.ts`, `tickets.ts`, `expenses.ts`, `masters.ts` — lectores de DBF.
- `sync/state.ts` — persistencia local de `last_fec_id` y `lastMasterSyncAt`.
- `sync/retry.ts` — reintentos con backoff exponencial.
- `sync/runner.ts` — orquestación del ciclo poll → leer → enviar → avanzar estado.
- `index.ts` — CLI con comandos `run`, `once`, `config`.

Validación:

- `pnpm --filter agent typecheck`, `pnpm --filter agent test` y `pnpm --filter agent build` pasan.
- Empaquetado a `.exe` x64 con `pkg` funcionó como prueba de concepto.
- Empaquetado a `.exe` x86 (target deseado para VFPOLEDB) requiere un entorno Windows con herramientas de compilación (Visual Studio Build Tools / patch / python) porque `pkg-fetch` no tiene binario precompilado para `node18-win-x86` en este entorno.

### Fase 6: Generador TXT + mapeo de cuentas (PRP-005, completa)

Implementado en `packages/etl/src/txt/` y `apps/web/src/`:

- `packages/etl/src/txt/format.ts` — `padInt`, `padNum`, `padStr`, `fmtDate`, `padAccount`.
- `packages/etl/src/txt/subcuentas.ts` — generador `SUBCUENTAS.TXT` (444 caracteres).
- `packages/etl/src/txt/diario.ts` — generador `DIARIO.TXT` (869 caracteres).
- `packages/etl/src/txt/generator.ts` — orquestación + codificación Windows-1252 con `iconv-lite`.
- `packages/shared/src/schemas/mapping-rule.ts` — schema Zod de reglas de mapeo.
- `apps/web/src/features/mapping/services/` — CRUD de `mapping_rules`.
- `apps/web/src/app/api/mapping-rules/route.ts` y `[id]/route.ts` — API REST protegida.
- `apps/web/src/app/api/batches/[id]/generate-txt/route.ts` — genera TXT de un batch.

Validación:

- Tests unitarios verifican longitudes exactas (444/869) y posiciones de campo.
- Test reproduce el ejemplo de cierre Z de la sección 7.4 del diseño.
- `pnpm -r typecheck`, `pnpm -r test` y `pnpm --filter web build` pasan.

### Fase 7: Panel web de administración y exportación (PRP-006, en revisión)

Implementado en `apps/web/src/`:

- `shared/components/sidebar.tsx`, `mobile-menu.tsx`, `ui/*` — layout y navegación.
- `app/(main)/layout.tsx` — shell del panel con selector de empresa.
- `features/auth/services/get-user-context.ts` — devuelve todas las empresas y empresa activa por cookie.
- `features/auth/services/set-active-company.ts` — Server Action para cambiar empresa activa.
- `features/auth/components/company-selector.tsx` — selector en el header.
- `features/dashboard/services/get-dashboard-stats.ts` — KPIs del mes.
- `features/companies/` — CRUD de empresas.
- `features/accounts/` — listado y edición de plan contable.
- `features/mapping/components/` — UI de reglas de mapeo sobre la API existente.
- `features/batches/` — listado, detalle y descarga de TXT.
- `features/etl/components/run-etl-button.tsx` — botón "Ejecutar ETL" en dashboard y lotes.
- `features/etl/services/run-etl.ts` — Server Action que llama a `/api/etl/run`.
- `app/(main)/dashboard|companies|accounts|mapping|batches/page.tsx` — vistas del panel.

Validación:

- `pnpm -r typecheck`, `pnpm -r test` y `pnpm --filter web build` pasan.
- El panel está listo para revisión manual (`checklist-pruebas-panel.md`).

### Fase 8: Simulador de agente Numier → Gateway

Creado en `packages/etl/scripts/simulate-agent.ts`:

- Genera datos sintéticos de cierres, tickets, gastos y maestros.
- Envía datos a `/api/agent/state`, `/api/ingest/*` usando `X-Agent-Key`.
- Avanza `last_fec_id` como haría el agente real.
- No requiere Numier TPV ni VFPOLEDB.
- Ejecutable con `pnpm --filter etl simulate-agent`.

Variables configurables:

- `GATEWAY_URL`, `AGENT_API_KEY` (desde `apps/web/.env.local` o entorno).
- `SIMULATE_DAYS`, `TICKETS_PER_DAY`, `EXPENSES_PER_DAY`.

---

## Archivos clave del proyecto

| Ruta | Descripción |
|------|-------------|
| `NumierConta_Gateway_Design.md` | Documento de diseño completo (especificación) |
| `PROJECT_OVERVIEW.md` | Visión general técnica del proyecto para agentes IA |
| `.claude/PRPs/prp-001-api-ingesta.md` | PRP de la API de ingesta |
| `.claude/PRPs/prp-002-motor-etl.md` | PRP del motor ETL |
| `.claude/PRPs/prp-003-auth-onboarding.md` | PRP de autenticación y onboarding |
| `.claude/PRPs/prp-004-agente-local.md` | PRP del agente local Windows |
| `.claude/PRPs/prp-005-generador-txt.md` | PRP del generador TXT + mapeo de cuentas |
| `.claude/PRPs/prp-006-panel-web.md` | PRP del panel web |
| `.claude/memory/project/checklist-pruebas-panel.md` | Checklist de pruebas manuales del panel |
| `.claude/memory/project/guia-ejecucion-flujo-completo.md` | Guía paso a paso para simular datos y generar TXT |
| `apps/web/.env.local` | Variables de entorno del web (incluye secrets) |
| `.mcp.json` | Configuración del MCP de Supabase |
| `supabase/migrations/0001_tenancy.sql` a `0006_add_mapping_rules_created_at.sql` | Esquema y RLS |
| `supabase/seed.sql` | Plan de cuentas hostelería por defecto |
| `packages/etl/scripts/simulate-agent.ts` | Simulador de agente Numier → Gateway |

---

## Datos de prueba en Supabase

- **Organización**: `Test Organization` (`1913688d-13b7-4b51-8038-67d65270ae6d`)
- **Empresa**: `Test Company` (`129afd20-782b-46b7-bffa-6c64e680ed20`)
- **Agent API Key**: `test_agent_key_001`
- **Usuario de prueba**: `test@numierconta.com` / `TestPassword123!`
- **User ID**: `bca85db2-4080-45aa-8c12-bba6bce6146c`

---

## Pendiente / Siguientes pasos recomendados

1. **Revisión manual del panel web** por el usuario (`checklist-pruebas-panel.md`).
2. **Ajustes** según observaciones de la revisión.
3. **Flujo end-to-end con ClassicConta 7**:
   - Ejecutar simulador de agente para volcar datos de prueba.
   - Ejecutar ETL para generar lotes.
   - Descargar TXT desde el panel.
   - Importar TXT en ClassicConta 7 y verificar asientos.

---

## Aprendizajes clave guardados

- Tailwind CSS 3.4 requiere `@tailwind` directives, no `@import 'tailwindcss'`.
- Cliente tipado de Supabase es rígido para operaciones genéricas; usar cliente no tipado + casts explícitos en helpers genéricos.
- Para gastos, `stg_expense_lines.amount` es la base (sin IVA); para ventas, `stg_ticket_lines.line_amount` es IVA incluido.
- Cuentas de IVA soportado se resuelven desde `accounts` por `account_class='vat_in'` y `vat_rate`, no desde `mapping_rules`.
- Workspaces sin tests hacen fallar `pnpm -r test`; añadir placeholder test o `--passWithNoTests`.
- Next.js 16 deprecó `middleware.ts` a favor de `proxy.ts`; el servidor dev falló hasta migrar el archivo y la función.
- En `proxy.ts`, `request.cookies.set` no acepta `options`; solo `response.cookies.set(name, value, options)`.
- `useActionState` requiere que los Server Actions acepten `(prevState, payload)` como firma.
- Onboarding usa `createServiceRoleClient` porque las políticas RLS no permiten inserts en tablas de tenant desde usuario recién registrado.
- `pkg` con target `node18-win-x86` requiere compilar Node desde fuente si no hay binario precompilado; en este entorno faltó `patch.exe`.
- `pkg` con target `node18-win-x64` funcionó como prueba de concepto, confirmando que el código se empaqueta.
- `node-adodb` se abstrae tras una interfaz `QueryExecutor` para poder testear con mocks sin VFPOLEDB.
- Los gastos en DBF no tienen `fec_id`; se leen desde la fecha del cierre más antiguo no sincronizado.
- `last_fec_id` solo avanza si todos los endpoints de ingest responden 2xx; si falla, el siguiente ciclo reintenta.
- `Asien` (nº asiento) usa `padInt` (entero); `EuroDebe`/`EuroHaber` y `% IVA` usan `padNum` (2 decimales implícitos).
- El campo `Cod` de `SUBCUENTAS.TXT` es de 12 caracteres; el código se rellena a `classicconta_digits` y luego se justifica a la izquierda con espacios.
- `idNif` es un flag de 1 dígito, no un importe.
- `iconv-lite` con `win1252` codifica correctamente los TXT de ClassicConta.
- La API de mapeo de cuentas (`mapping_rules`) permite configurar la correspondencia Numier → ClassicConta por empresa.
- El layout del panel usa barra lateral, header con selector de empresa y menú móvil.
- `getUserContext` devuelve todas las empresas del usuario; la empresa activa se guarda en cookie `active_company_id`.
- Server Actions de formularios CRUD deben validar con Zod y llamar a `revalidatePath` para refrescar UI.
- Descargar TXT codificado en Windows-1252 requiere convertir base64 a `Uint8Array` y crear blob con charset `windows-1252`.
- Un simulador de agente sintético permite probar el flujo completo sin Numier TPV ni VFPOLEDB.
- La tabla `mapping_rules` no tenía columna `created_at`; se eliminó del schema y del SELECT para evitar error en runtime. Se dejó migración `0006_add_mapping_rules_created_at.sql` opcional para el futuro.

---

## Comandos útiles

```bash
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm --filter web build
pnpm --filter web dev
pnpm --filter etl exec tsx scripts/e2e.ts
pnpm --filter etl simulate-agent
```

---

*Última actualización: 2026-06-16 (fin de sesión)*
