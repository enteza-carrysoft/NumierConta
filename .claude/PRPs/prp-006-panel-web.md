# PRP-006: Panel Web de Administración y Exportación

> **Estado**: EN REVISIÓN
> **Fecha**: 2026-06-16
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Construir el panel web principal donde el usuario gestione sus empresas, cuentas contables, reglas de mapeo Numier → ClassicConta, revise lotes generados y descargue los ficheros TXT listos para importar en ClassicConta.

## Por Qué

| Problema | Solución |
|----------|----------|
| El usuario no puede ver ni gestionar sus datos contables desde el navegador | Un panel protegido con navegación lateral y vistas dedicadas |
| No hay forma de editar el plan contable o las reglas de mapeo sin tocar la base de datos | CRUD de cuentas y mapping_rules desde la UI |
| No hay visibilidad de qué lotes se han generado ni de su estado | Lista de batches con detalle de entradas/líneas |
| Para obtener TXT hay que llamar a la API a mano | Botón de generación y descarga directa desde el panel |

**Valor de negocio**: Reduce el tiempo de cierre contable mensual de horas a minutos y permite a usuarios no técnicos operar el producto.

## Qué

### Criterios de Éxito
- [ ] Usuario logueado ve un layout con navegación lateral y header.
- [ ] Dashboard muestra KPIs: número de empresas, lotes del mes, total de asientos, importe total movido.
- [ ] El usuario puede listar, crear, editar y seleccionar su empresa activa.
- [ ] El usuario puede listar y editar cuentas contables del plan de cuentas.
- [ ] El usuario puede listar, crear, editar y eliminar reglas de mapeo de cuentas.
- [ ] El usuario puede listar lotes contables, ver su detalle y regenerarlos.
- [ ] El usuario puede generar y descargar `SUBCUENTAS.TXT` y `DIARIO.TXT` desde la vista de un lote.
- [ ] Build de producción pasa y la UI se valida con screenshot de Playwright.

### Comportamiento Esperado
1. Usuario inicia sesión y llega al `/dashboard`.
2. Desde la barra lateral accede a Empresas, Cuentas, Mapeo, Lotes.
3. Selecciona una empresa activa; todo el panel filtra por esa empresa.
4. En "Lotes" ve los batches generados por el ETL, entra a uno y descarga los TXT.
5. En "Mapeo" crea/edita reglas para que el ETL asigne cuentas ClassicConta correctamente.

---

## Contexto

### Referencias
- `apps/web/src/app/(main)/layout.tsx` - layout principal protegido actual.
- `apps/web/src/features/auth/` - patrón de Server Actions + `auth-user.ts`.
- `apps/web/src/features/mapping/services/` - CRUD de mapping_rules ya implementado.
- `apps/web/src/app/api/mapping-rules/` - API REST de mapping_rules.
- `apps/web/src/app/api/batches/[id]/generate-txt/route.ts` - endpoint de generación TXT.
- `packages/etl/src/txt/` - generadores de TXT.
- `NumierConta_Gateway_Design.md` sección 4 y 7.

### Arquitectura Propuesta (Feature-First)
```
apps/web/src/
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   ├── services/
│   │   └── hooks/
│   ├── companies/
│   │   ├── components/
│   │   ├── services/
│   │   └── schemas/
│   ├── accounts/
│   │   ├── components/
│   │   └── services/
│   ├── mapping/
│   │   ├── components/
│   │   ├── services/
│   │   └── schemas/
│   └── batches/
│       ├── components/
│       └── services/
├── app/(main)/
│   ├── dashboard/page.tsx
│   ├── companies/page.tsx
│   ├── accounts/page.tsx
│   ├── mapping/page.tsx
│   └── batches/
│       ├── page.tsx
│       └── [id]/page.tsx
└── shared/
    └── components/ui/ (tablas, botones, modales, toasts)
```

### Modelo de Datos
No se crean nuevas tablas. Se usan las existentes:
- `organizations`, `companies`, `user_companies` (tenant + membresía).
- `accounts` (plan contable).
- `mapping_rules` (mapeo Numier → ClassicConta).
- `batches`, `entries`, `entry_lines` (lotes y asientos generados).

Se añadirán funciones de consulta con RLS/SERVICE ROLE según corresponda y Server Actions para mutaciones.

---

## Blueprint (Assembly Line)

### Fase 1: Layout y navegación
**Objetivo**: Tener un shell de panel lateral + header reutilizable.
**Validación**: Playwright screenshot de `/dashboard` muestra navegación y datos del usuario.

### Fase 2: Store de empresa activa
**Objetivo**: Permitir seleccionar una empresa y propagarla a todas las vistas.
**Validación**: Cambiar empresa en el selector actualiza datos de cuentas/lotes sin recargar.

### Fase 3: Dashboard con KPIs
**Objetivo**: Mostrar métricas resumidas del mes en curso.
**Validación**: KPIs reflejan datos reales de Supabase para la empresa activa.

### Fase 4: CRUD de empresas y cuentas
**Objetivo**: Gestionar empresas del tenant y ver/editar plan contable.
**Validación**: Se crea/edita una empresa; se edita una cuenta y persiste en Supabase.

### Fase 5: UI de reglas de mapeo
**Objetivo**: Consumir la API existente de mapping_rules con tabla + formulario.
**Validación**: Crear/editar/eliminar regla desde UI actualiza la base de datos.

### Fase 6: Lista y detalle de lotes + descarga TXT
**Objetivo**: Revisar batches, entradas/líneas y descargar TXT.
**Validación**: Botón "Descargar TXT" genera ambos ficheros y los descarga correctamente.

### Fase 7: Validación Final
**Objetivo**: Sistema funcionando end-to-end.
**Validación**:
- [ ] `pnpm -r typecheck` pasa
- [ ] `pnpm -r test` pasa
- [ ] `pnpm --filter web build` exitoso
- [ ] Playwright screenshot confirma UI del dashboard y del detalle de lote

---

## 🧠 Aprendizajes (Self-Annealing)

> Se actualizará durante la implementación.

---

## Gotchas

- Las Server Actions deben validar inputs con Zod y respetar el tenant (RLS o service role).
- El selector de empresa activa debe persistirse (cookie/localStorage) para evitar perder contexto al refrescar.
- Las tablas grandes (lotes, cuentas) deben paginarse o virtualizarse para no cargar toda la BD.
- La descarga de TXT requiere decodificar base64 y crear blob con tipo `text/plain`.
- Usar `useActionState` para formularios con Server Actions en Next.js 16.

## Anti-Patrones

- NO exponer datos de otras empresas del mismo usuario.
- NO ignorar errores de TypeScript.
- NO hardcodear IDs de empresa en componentes.
- NO crear duplicados de componentes UI si ya existen en `shared/components`.

---

*PRP pendiente aprobación. No se ha modificado código.*
