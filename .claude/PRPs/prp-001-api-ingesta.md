# PRP-001: API de Ingesta (Fase 3)

> **Estado**: COMPLETADO
> **Fecha**: 2026-06-16
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Implementar los endpoints REST de ingesta en `apps/web/src/app/api/` para recibir datos crudos del agente local Windows, autenticarlos mediante `X-Agent-Key`, validarlos con Zod y persistirlos en las tablas `stg_*` de Supabase mediante upsert idempotente.

## Por Qué

| Problema | Solución |
|---|---|
| El agente local extrae datos de DBF de Numier pero no puede ejecutarse en el servidor cloud. | Un API de ingesta en Next.js recibe los datos por HTTPS y los almacena en staging. |
| Reenviar lotes no debe duplicar registros. | Upsert por clave natural `(company_id, numier_*_id)` garantiza idempotencia. |
| El backend necesita aislamiento multiempresa. | Cada request se asocia a una `company_id` mediante la API key del agente. |

**Valor de negocio**: Habilita el flujo ETL end-to-end; sin ingesta no hay asientos contables que exportar a ClassicConta.

## Qué

### Criterios de Éxito
- [x] Endpoint `POST /api/ingest/closures` upserta en `stg_closures` y responde `{ inserted, updated, skipped }`.
- [x] Endpoint `POST /api/ingest/tickets` upserta cabeceras en `stg_ticket_head` y líneas en `stg_ticket_lines`.
- [x] Endpoint `POST /api/ingest/expenses` upserta cabeceras en `stg_expense_head` y líneas en `stg_expense_lines`.
- [x] Endpoint `POST /api/ingest/masters` upserta clientes en `stg_customers` y proveedores en `stg_suppliers`.
- [x] Endpoint `GET /api/agent/state` devuelve `{ last_fec_id }` para la empresa del agente.
- [x] Todos los endpoints autentican con cabecera `X-Agent-Key` y usan `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.
- [x] Todos los payloads se validan con Zod usando los schemas de `@numierconta/shared`.
- [x] Reenviar el mismo payload no duplica filas (test de idempotencia).
- [x] `pnpm -r typecheck` pasa y `pnpm -r test` añade tests de los nuevos schemas/helpers.

### Comportamiento Esperado

1. El agente local envía un lote JSON por HTTPS con la cabecera `X-Agent-Key`.
2. La API busca la empresa asociada a esa clave en `companies.agent_api_key` usando el service role de Supabase.
3. Si la clave no existe, responde `401 Unauthorized` con `{ error: { code, message } }`.
4. Si el payload no pasa la validación Zod, responde `400 Bad Request` detallando el error.
5. Si todo es válido, realiza upsert por clave natural para cada registro y responde el conteo.
6. `GET /api/agent/state` consulta `MAX(numier_fec_id)` de `stg_closures` para la empresa.

---

## Contexto

### Referencias
- `NumierConta_Gateway_Design.md` secciones 3.3, 4.3, 5.1 y 8.
- `supabase/migrations/0003_staging.sql` — esquema de tablas `stg_*`.
- `supabase/migrations/0005_rls.sql` — políticas RLS.
- `packages/shared/src/schemas/ingest.ts` — schemas Zod de payloads.
- `packages/shared/src/schemas/common.ts` — `IngestResultSchema` y `ApiErrorSchema`.
- `apps/web/src/lib/supabase/server.ts` — cliente SSR de Supabase.

### Arquitectura Propuesta

```
apps/web/src/app/api/
├── ingest/
│   ├── closures/
│   │   └── route.ts
│   ├── tickets/
│   │   └── route.ts
│   ├── expenses/
│   │   └── route.ts
│   ├── masters/
│   │   └── route.ts
│   └── _lib/
│       ├── auth-agent.ts      # validación X-Agent-Key → company_id
│       └── respond.ts         # helpers JSON de respuesta/error
└── agent/
    └── state/
        └── route.ts
```

### Modelo de Datos

Ver `supabase/migrations/0003_staging.sql` para el esquema completo. Claves naturales usadas en el upsert:
- `stg_closures`: `(company_id, numier_fec_id)`
- `stg_ticket_head`: `(company_id, numier_cab_id)`
- `stg_ticket_lines`: `(company_id, numier_cab_id, line_seq)`
- `stg_expense_head`: `(company_id, numier_gac_id)`
- `stg_expense_lines`: `(company_id, numier_gac_id, line_seq)`
- `stg_customers`: `(company_id, numier_cli_id)`
- `stg_suppliers`: `(company_id, numier_con_id)`

---

## Blueprint (Assembly Line)

### Fase 1: Infraestructura API
**Objetivo**: Cliente de Supabase con service role, helper de autenticación del agente y helpers de respuesta JSON.
**Validación**: `pnpm -r typecheck` pasa; existe `apps/web/src/app/api/_lib/auth-agent.ts`.

### Fase 2: Endpoint `/api/ingest/closures`
**Objetivo**: Recibir cierres de caja y upsertarlos en `stg_closures`.
**Validación**: Test que envía 2 cierres, repite el mismo payload y verifica `inserted=2, updated=0, skipped=0` en ambos envíos.

### Fase 3: Endpoint `/api/ingest/tickets`
**Objetivo**: Recibir cabeceras y líneas de tickets y upsertarlas en `stg_ticket_head` / `stg_ticket_lines`.
**Validación**: Test con payload de la sección 5.1 del diseño; verifica idempotencia y FK lógica por `numier_cab_id`.

### Fase 4: Endpoint `/api/ingest/expenses`
**Objetivo**: Recibir gastos (cabecera + líneas) y persistirlos en `stg_expense_*`.
**Validación**: Test con gasto de ejemplo; verifica idempotencia.

### Fase 5: Endpoint `/api/ingest/masters`
**Objetivo**: Recibir maestros de clientes y proveedores.
**Validación**: Test de upsert idempotente.

### Fase 6: Endpoint `/api/agent/state`
**Objetivo**: Devolver `last_fec_id` para que el agente sepa por dónde continuar.
**Validación**: Test con empresa vacía (`last_fec_id=0`) y con cierres insertados.

### Fase 7: Validación Final
**Objetivo**: Sistema de ingesta funcionando end-to-end.
**Validación**:
- [x] `pnpm -r typecheck` pasa.
- [x] `pnpm -r test` pasa (incluyendo nuevos tests).
- [x] Build de `apps/web` exitoso (`pnpm --filter web build`).
- [x] Simulación manual con `curl`/Playwright de un lote completo.

---

## 🧠 Aprendizajes (Self-Annealing)

### 2026-06-16: Tailwind CSS v3 no acepta `@import 'tailwindcss'`
- **Error**: `next build` falló con `Module not found: Can't resolve 'fs'` proveniente de Tailwind/Jiti en el bundle del cliente.
- **Fix**: Reemplazar `@import 'tailwindcss'` por las directivas clásicas de Tailwind v3:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- **Aplicar en**: Todos los proyectos SaaS Factory con Tailwind CSS 3.4.

### 2026-06-16: Cliente tipado de Supabase es difícil de usar con tablas genéricas
- **Error**: `createServiceRoleClient<Database>()` rechaza operaciones genéricas sobre `keyof Database['public']['Tables']` porque los tipos de insert/update no son asignables a `Record<string, unknown>`.
- **Fix**: Para helpers genéricos de upsert, usar un cliente no tipado (`createClient(url, key)`) y hacer cast explícito `as unknown as Record<string, unknown>[]` en los datos. Los endpoints específicos siguen usando el cliente tipado.
- **Aplicar en**: Helpers genéricos de BD (upsert, bulk delete, etc.).

### 2026-06-16: `pnpm -r test` falla si un workspace no tiene tests
- **Error**: `packages/etl` no tenía archivos de test y `vitest run` salía con código 1, haciendo fallar `pnpm -r test`.
- **Fix**: Añadir un test placeholder mínimo (`src/index.test.ts`) o cambiar el script de test a `vitest run --passWithNoTests`.
- **Aplicar en**: Todo workspace que aún no tenga tests implementados.

---

## Gotchas

- [ ] `SUPABASE_SERVICE_ROLE_KEY` debe estar en `.env.local` y **nunca** exponerse al cliente.
- [ ] La búsqueda de `agent_api_key` debe usar service role para bypassar RLS; el resto de operaciones pueden usar el cliente SSR normal (RLS protege por `company_id`).
- [ ] Los campos `ticket_time` del schema Zod son `string` pero la columna PostgreSQL es `time`; Supabase puede recibir strings ISO.
- [ ] `closed_at` puede ser `null` (cierre abierto); el agente solo enviará cierres con `FEC_FIN` no nulo, pero la API debe soportarlo.
- [ ] Mantener funciones pequeñas (< 50 líneas) y archivos < 500 líneas según reglas del proyecto.

## Anti-Patrones

- NO exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente ni en logs.
- NO usar `any`; usar `unknown` o tipos de Zod.
- NO ignorar errores de Supabase; devolver `500` con código interno mínimo.
- NO inventar payloads propios; reutilizar los schemas de `@numierconta/shared`.

---

*PRP completado. Código implementado y validado.*
