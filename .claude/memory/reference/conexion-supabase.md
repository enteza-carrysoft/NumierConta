# Conexión Supabase — Referencia

> Dónde encontrar la configuración de Supabase y el MCP.
> **No se incluyen los valores secretos**; están en los archivos indicados.

## Proyecto Supabase

- **Project ref**: `spwwajariflvqghmxewr`
- **URL**: `https://spwwajariflvqghmxewr.supabase.co`
- **Región**: Central EU (Frankfurt)

## Archivos con credenciales

| Archivo | Contenido |
|---|---|
| `apps/web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `APP_BASE_URL` |
| `.mcp.json` | Configuración del MCP de Supabase (`project-ref` + `SUPABASE_ACCESS_TOKEN`) |
| `apps/web/.env.local.example` | Plantilla de variables de entorno |

## Conexión CLI

```bash
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
npx supabase@latest projects list
npx supabase@latest link --project-ref spwwajariflvqghmxewr
npx supabase@latest db push
npx supabase@latest gen types typescript --linked --schema public > apps/web/src/lib/supabase/database.types.ts
```

## Datos de prueba

- Empresa de prueba: `129afd20-782b-46b7-bffa-6c64e680ed20`
- Agent API Key de prueba: `test_agent_key_001`
- Usuario de prueba: `test@numierconta.com`

---

*Actualizado: 2026-06-16*
