# Guía de ejecución del flujo completo NumierConta Gateway

> **Propósito:** Generar datos de prueba en el Gateway y obtener los ficheros TXT listos para importar en ClassicConta 7, sin necesidad de tener Numier TPV instalado.

---

## Requisitos previos

- Proyecto instalado: `pnpm install`
- Variables de entorno configuradas en `apps/web/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Empresa de prueba creada en Supabase con `agent_api_key = test_agent_key_001`

Datos de prueba por defecto:

- **Gateway:** `http://localhost:3000`
- **Agent API Key:** `test_agent_key_001`
- **Usuario panel:** `test@numierconta.com` / `TestPassword123!`
- **Empresa:** `Test Company` (`129afd20-782b-46b7-bffa-6c64e680ed20`)

---

## Paso 1: Arrancar el Gateway

```bash
pnpm --filter web dev
```

Espera a que el servidor esté listo en `http://localhost:3000`.

---

## Paso 2: Ejecutar el simulador de agente

En una **segunda terminal** (sin cerrar la primera):

```bash
pnpm --filter etl simulate-agent
```

El simulador hará lo siguiente:

1. Consulta `/api/agent/state` para saber el último `fec_id`.
2. Envía maestros (clientes y proveedores de prueba).
3. Genera cierres de caja diarios con tickets y gastos.
4. Envía todo a `/api/ingest/*` usando `X-Agent-Key`.
5. Avanza `last_fec_id` automáticamente.

Por defecto genera **7 días**, **5 tickets por día** y **2 gastos por día**.

### Personalizar la simulación

En PowerShell:

```powershell
$env:SIMULATE_DAYS=14
$env:TICKETS_PER_DAY=10
$env:EXPENSES_PER_DAY=3
pnpm --filter etl simulate-agent
```

Variables disponibles:

| Variable | Default | Descripción |
|---|---|---|
| `GATEWAY_URL` | `http://localhost:3000` | URL del Gateway |
| `AGENT_API_KEY` | `test_agent_key_001` | Clave del agente |
| `SIMULATE_DAYS` | `7` | Días a simular |
| `TICKETS_PER_DAY` | `5` | Tickets por día |
| `EXPENSES_PER_DAY` | `2` | Gastos por día |

---

## Paso 3: Ejecutar el ETL desde el panel

1. Abre el navegador en `http://localhost:3000`.
2. Inicia sesión con:
   - **Email:** `test@numierconta.com`
   - **Password:** `TestPassword123!`
3. Ve a **Dashboard** o **Lotes**.
4. Rellena el rango de fechas (opcional).
5. Pulsa **Ejecutar ETL**.

El ETL convertirá los datos del simulador en asientos contables y creará un nuevo lote.

---

## Paso 4: Descargar los ficheros TXT

1. Ve a **Lotes** en el panel.
2. Entra al lote recién generado.
3. Pulsa **Descargar TXT para ClassicConta**.
4. Se descargarán dos ficheros:
   - `SUBCUENTAS.TXT`
   - `DIARIO.TXT`

Verifica que:

- Cada registro de `SUBCUENTAS.TXT` mide **444 caracteres**.
- Cada registro de `DIARIO.TXT` mide **869 caracteres**.
- Ambos están codificados en **Windows-1252**.

---

## Paso 5: Importar en ClassicConta 7

1. Abre **ClassicConta 7**.
2. Usa el **Importador de Asientos**.
3. Carga `DIARIO.TXT`.
4. Si es necesario, importa primero `SUBCUENTAS.TXT` para crear o actualizar subcuentas.
5. Revisa los asientos en ClassicConta y verifica que cuadran.

---

## Solución de problemas comunes

### El simulador dice "No autenticado" o error 401

- Comprueba que el servidor esté corriendo.
- Verifica que `AGENT_API_KEY` coincida con `companies.agent_api_key` en Supabase.

### El ETL no genera asientos

- Asegúrate de que existan datos en las tablas `stg_*` para la empresa activa.
- Verifica que haya un plan de cuentas en `accounts` y reglas en `mapping_rules`.

### Los TXT no se descargan

- Comprueba que el lote tenga entradas en `entries` y `entry_lines`.
- Revisa la consola del navegador para ver el error exacto.

### Cambiar de empresa activa

Usa el selector en la parte superior derecha del panel. Se guarda en cookie.

---

## Comandos rápidos

```bash
# 1. Servidor
pnpm --filter web dev

# 2. Simulador (en otra terminal)
pnpm --filter etl simulate-agent

# 3. Panel web
# Abrir http://localhost:3000 y ejecutar ETL manualmente
```

---

*Última actualización: 2026-06-16*
