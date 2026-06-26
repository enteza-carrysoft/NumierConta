# PRP-005: Generador TXT para ClassicConta

> **Estado**: COMPLETADO
> **Fecha**: 2026-06-16
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Implementar el generador de ficheros de ancho fijo `SUBCUENTAS.TXT` y `DIARIO.TXT` según el protocolo AIG de ClassicConta 6/7, codificados en Windows-1252 con terminador CR+LF, listos para descargar e importar.

Además, incluir una **API de configuración de mapeo de cuentas** que permita definir qué cuentas de Numier TPV se asientan en qué cuentas de ClassicConta 7, para que el ETL y el generador TXT trabajen sobre el plan contable correcto de cada empresa.

## Por Qué

| Problema | Solución |
|---|---|
| ClassicConta solo importa ficheros ASCII de ancho fijo. | Generador que convierte asientos y subcuentas del batch al formato exacto. |
| La codificación debe ser Windows-1252, no UTF-8. | Usar `iconv-lite` para convertir cada registro antes de escribir. |
| Las subcuentas deben incluirse si no existen en ClassicConta. | El generador extrae todas las subcuentas referenciadas en los asientos del batch. |
| Los importes usan 2 decimales implícitos sin separador. | Helpers `padNum`, `padStr`, `fmtDate` con padding exacto. |
| Cada cliente tiene su propio plan de cuentas y reglas de mapeo. | API CRUD de `mapping_rules` para vincular cuentas Origen (Numier) → Destino (ClassicConta). |

**Valor de negocio**: El gestor configura una vez el mapeo de cuentas de su negocio y luego descarga los TXT listos para importar en ClassicConta sin introducir asientos a mano.

## Qué

### Criterios de Éxito
- [ ] Helpers de formateo `padNum`, `padStr`, `fmtDate` con tests unitarios.
- [ ] Generador `SUBCUENTAS.TXT` con registros de 444 caracteres.
- [ ] Generador `DIARIO.TXT` con registros de 869 caracteres.
- [ ] Codificación Windows-1252 y terminador CR+LF.
- [ ] Extracción automática de subcuentas referenciadas en los asientos.
- [ ] API CRUD de mapeo de cuentas: `GET/POST/PUT/DELETE /api/mapping-rules` protegida por auth y RLS.
- [ ] Esquema Zod para reglas de mapeo (`source_type`, `source_ref`, `target_account_code`, `company_id`).
- [ ] Endpoint `POST /api/batches/:id/generate-txt` protegido por auth.
- [ ] El endpoint lee `entries` + `entry_lines` + `accounts` del batch y devuelve los dos ficheros (download directo o URLs firmadas).
- [ ] Tests que verifiquen longitud exacta de registros y posiciones de campo para los ejemplos de la sección 7.4 del diseño.
- [ ] Tests del CRUD de mapping-rules.
- [ ] `pnpm -r typecheck` y `pnpm -r test` pasan.
- [ ] `pnpm --filter web build` pasa.

### Comportamiento Esperado

1. Usuario autenticado entra al dashboard y selecciona un batch.
2. Pulsa "Generar TXT".
3. El backend lee las líneas del batch desde Supabase (RLS asegura que solo vea los de su empresa).
4. Genera `SUBCUENTAS.TXT` con las subcuentas referenciadas.
5. Genera `DIARIO.TXT` con los apuntes.
6. Devuelve ambos ficheros para descarga.
7. El usuario los importa en ClassicConta 6/7.

---

## Contexto

### Referencias
- `NumierConta_Gateway_Design.md` secciones 7.1, 7.2, 7.3, 7.4.
- `NumierConta_Gateway_Design.md` sección 3.2 — esquema de `entries`, `entry_lines`, `accounts`, `mapping_rules`.
- `packages/etl/src/` — motor ETL que produce entries y usa `mapping_rules`.
- `supabase/migrations/0002_accounting_config.sql` — esquema de `accounts` y `mapping_rules`.

### Arquitectura Propuesta

```
packages/etl/src/txt/
├── format.ts           # padNum, padStr, fmtDate
├── subcuentas.ts       # generador SUBCUENTAS.TXT
├── diario.ts           # generador DIARIO.TXT
├── generator.ts        # orquestación: entries -> { subcuentas, diario }
└── generator.test.ts   # tests de longitud y contenido

apps/web/src/features/txt-generator/
├── services/
│   └── generate-txt.ts # Server Action o Route Handler
└── components/
    └── (en fase de panel web)

apps/web/src/features/mapping/
├── services/
│   ├── list-rules.ts
│   ├── create-rule.ts
│   ├── update-rule.ts
│   └── delete-rule.ts
└── schemas/
    └── mapping-rule.ts

apps/web/src/app/api/batches/[id]/generate-txt/route.ts
apps/web/src/app/api/mapping-rules/route.ts
apps/web/src/app/api/mapping-rules/[id]/route.ts
```

### Modelo de Datos Relevante

- `batches`: `id`, `company_id`, `status`, `generated_at`
- `entries`: `id`, `batch_id`, `entry_number`, `date`, `description`
- `entry_lines`: `id`, `entry_id`, `account_code`, `concept`, `debit`, `credit`, `vat_type`
- `accounts`: `id`, `company_id`, `code`, `name`, `account_class`, `vat_rate`, `tax_id`, `address`, ...
- `mapping_rules`: `id`, `company_id`, `source_type`, `source_ref`, `target_account_code`, `priority`, `active`

Campos TXT:
- `SUBCUENTAS.TXT`: 444 chars (ver diseño sección 7.1).
- `DIARIO.TXT`: 869 chars (ver diseño sección 7.2).

---

## Blueprint (Assembly Line)

### Fase 0: API de configuración de mapeo de cuentas
**Objetivo**: Permitir crear, listar, editar y eliminar reglas de mapeo (`mapping_rules`) que vinculen cuentas de origen de Numier TPV con cuentas destino de ClassicConta 7.
**Validación**: Tests del CRUD pasan; `GET /api/mapping-rules` devuelve solo reglas de la empresa del usuario.

### Fase 1: Helpers de formateo
**Objetivo**: Implementar y testear `padNum`, `padStr`, `fmtDate`.
**Validación**: Tests unitarios con ejemplos del diseño pasan.

### Fase 2: Generador SUBCUENTAS.TXT
**Objetivo**: Crear registros de 444 caracteres desde cuentas.
**Validación**: Test de longitud exacta y campos clave (Código, Título, NIF, TipoIVA, TPC).

### Fase 3: Generador DIARIO.TXT
**Objetivo**: Crear registros de 869 caracteres desde entries/lines.
**Validación**: Test de longitud exacta y campos clave (Asien, Fecha, Subcta, Concepto, EuroDebe, EuroHaber, TipoFac).

### Fase 4: Orquestación y codificación
**Objetivo**: Combinar generadores, aplicar Windows-1252 con `iconv-lite`, unir con CR+LF.
**Validación**: Buffer decodificado como Windows-1252 coincide con los registros esperados.

### Fase 5: Endpoint API de generación TXT
**Objetivo**: Crear `POST /api/batches/[id]/generate-txt` protegido.
**Validación**: Llamada autenticada genera y devuelve ambos ficheros (multipart o JSON con buffers/base64).

### Fase 6: Validación final
**Objetivo**: Todo compila, testea y buildea.
**Validación**:
- [ ] `pnpm -r typecheck` pasa.
- [ ] `pnpm -r test` pasa.
- [ ] `pnpm --filter web build` pasa.
- [ ] Test reproduce los ejemplos de la sección 7.4 del diseño.

---

## 🧠 Aprendizajes (Self-Annealing)

- **Campos numéricos vs importes**: `Asien` (nº asiento) es entero y requiere `padInt`; `EuroDebe`/`EuroHaber` y porcentajes (`TPC`, `RecEquiv`) usan 2 decimales implícitos y requieren `padNum`.
- **Código de subcuenta en `SUBCUENTAS.TXT`**: el campo `Cod` es de 12 caracteres; el código se rellena primero a `classicconta_digits` con ceros a la izquierda y luego se justifica a la izquierda con espacios hasta 12.
- **`idNif` es un flag 0/1 de 1 dígito**, no un importe; no usar `padNum`.
- **`iconv-lite` con `win1252`** codifica correctamente los TXT; se añadió normalización básica para caracteres no representables.
- **API de mapeo de cuentas**: el schema se ubicó en `@numierconta/shared` y se exportan subpaths desde `packages/shared/package.json` para importaciones limpias.
- **Endpoint TXT**: devuelve base64 de ambos ficheros para facilitar la descarga desde el panel web.

---

## Gotchas

- [ ] Las reglas de mapeo deben estar siempre acotadas a `company_id` (RLS + validación en el servidor).
- [ ] `source_type` puede ser `payment_method`, `vat_rate`, `item_group`, `supplier`, `customer`, etc.
- [ ] Si no hay regla explícita, el ETL debe seguir usando el plan de cuentas por defecto (`accounts`).
- [ ] Windows-1252 no soporta todos los caracteres UTF-8; reemplazar o normalizar caracteres no representables.
- [ ] Importes: 2 decimales implícitos, sin punto/coma; negativos con signo `-` a la izquierda.
- [ ] Numéricos justificados a la derecha con ceros; alfanuméricos a la izquierda con espacios.
- [ ] `SUBCUENTAS.TXT` debe incluir subcuentas de clientes/proveedores nominales y cuentas de IVA con `TipoIVA`/`TPC`.
- [ ] `companies.classicconta_digits` define la longitud del código de subcuenta (relleno con ceros a la izquierda).
- [ ] `DIARIO.TXT`: campo `Rectifica` es `T`/`F`; `TipoFac` es `E` (emitida) / `R` (recibida) / blanco.
- [ ] Fecha en formato `AAAAMMDD`.

## Anti-Patrones

- NO usar UTF-8 directamente.
- NO truncar importes sin redondeo previo.
- NO generar registros de longitud variable.
- NO exponer batches de otra empresa (verificar RLS y auth).

---

*PRP pendiente aprobación. No se ha modificado código.*
