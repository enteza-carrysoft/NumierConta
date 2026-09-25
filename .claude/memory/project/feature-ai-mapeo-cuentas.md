# Feature: IA para Sugerencia Automática de Mapeo de Cuentas

## Estado
- Pendiente de implementación (registrado 2026-09-25)
- Aprobada por el usuario

## Descripción
Agregar IA (Claude) a NumierConta para sugerir automáticamente el mapeo entre cuentas contables del sistema origen (DBF legacy) y las cuentas destino del plan contable del usuario.

## Contexto técnico
- El mapeo manual existe en `/mapping` (página web + tabla Supabase `mapping_rules`)
- El agente DBF extrae `RawMaster` (clientes/proveedores) con códigos de cuenta
- La IA debe analizar el nombre/código de la cuenta origen y sugerir la cuenta destino más probable
- Stack: Next.js API route + `@anthropic-ai/sdk` + claude-opus-4-8

## Próximos pasos
1. Ejecutar PRP para planificar fases (DB + API + UI)
2. Ejecutar bucle-agentico para implementar
