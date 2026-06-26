# Analisis de situacion y plan operativo

Fecha: 2026-06-26

## Estado actual

NumierConta Gateway ya tiene implementadas sus piezas principales:

- App web en Next.js con login, onboarding, panel, ETL y exportacion TXT.
- Agente local Windows para leer DBF y enviar staging al backend.
- Paquetes compartidos de esquemas y motor ETL con cobertura de tests.
- Migraciones Supabase y seed contable base.

Verificacion hecha sobre el repositorio actual:

- `pnpm test`: OK
- `pnpm typecheck`: OK
- `pnpm build`: OK

Rutas web compiladas correctamente:

- `/login`, `/signup`, `/onboarding`
- `/dashboard`, `/companies`, `/accounts`, `/mapping`, `/batches`, `/batches/[id]`
- `/api/agent/state`
- `/api/ingest/closures`, `/api/ingest/tickets`, `/api/ingest/expenses`, `/api/ingest/masters`
- `/api/etl/run`
- `/api/batches/[id]/generate-txt`

## Lectura real de la situacion

El proyecto esta tecnicamente avanzado y estable a nivel de codigo, pero todavia no lo daria por completamente operativo en produccion.

Lo que ya esta fuerte:

- La base del dominio esta construida de extremo a extremo.
- La arquitectura monorepo esta clara y consistente.
- El ETL y la generacion de TXT tienen buena señal de calidad por tests y build limpio.
- El panel principal existe y compila sin errores.
- Hay memoria del proyecto y guia previa de ejecucion completa.

Lo que sigue pendiente para considerarlo realmente operativo:

1. Validacion funcional end-to-end con datos reales o simulados contra Supabase.
2. Revisión manual completa del panel en navegador.
3. Validacion final del circuito ClassicConta importando los TXT generados.
4. Cierre del agente Windows en el formato objetivo real del cliente.
5. Ajuste de documentacion externa para que deje de parecer una plantilla genérica.

## Riesgos o huecos detectados

### 1. Falta de validacion funcional completa

Aunque tests, typecheck y build pasan, eso no sustituye una prueba real del flujo:

- signup/login
- onboarding
- ingesta
- ejecucion ETL
- generacion de batch
- descarga de TXT
- importacion en ClassicConta

Sin ese recorrido, el proyecto esta muy cerca de operativo, pero no cerrado.

### 2. README raiz desalineado con el producto real

`README.md` sigue describiendo principalmente SaaS Factory, no NumierConta Gateway como producto final. Eso no rompe la app, pero si afecta handoff, soporte y despliegue.

### 3. Agente x86 todavia no validado como artefacto final

La memoria del proyecto indica que el empaquetado x64 fue probado, pero el objetivo deseado para VFPOLEDB es x86. Eso deja un riesgo operativo real en la parte cliente-local.

### 4. Validacion UI pendiente

Hay checklist previo en memoria, pero en esta revision no se ha ejecutado una pasada manual completa en navegador ni pruebas visuales Playwright.

### 5. Proteccion de rutas mejorable

`proxy.ts` protege varias rutas clave, pero no lista todas las del panel. El layout principal redirige al login si no hay sesion, asi que no parece haber bypass funcional, pero conviene unificar la proteccion para reducir ambigüedad y coste de render innecesario.

## Conclusión

Estado actual: `implementacion principal completada, validacion operativa parcial`.

No estamos en fase de construir desde cero. Estamos en fase de cierre operativo:

- verificar
- ajustar
- documentar
- desplegar
- validar con el software contable real

## Plan recomendado hasta dejarlo completamente operativo

### Fase 1. Auditoria funcional del panel

Objetivo: confirmar que el frontend y las server actions funcionan como usuario final.

Tareas:

1. Levantar la app y recorrer login, signup y onboarding.
2. Verificar selector de empresa, dashboard, cuentas, empresas, mapeo y batches.
3. Confirmar formularios CRUD y mensajes de error.
4. Registrar incidencias concretas y corregirlas una a una.

Resultado esperado:

- panel navegable
- auth consistente
- sin errores visuales ni de flujo principal

### Fase 2. Validacion end-to-end de negocio

Objetivo: probar el flujo real del producto con staging, ETL y exportacion.

Tareas:

1. Ejecutar el simulador de agente contra el backend configurado.
2. Confirmar insercion en tablas `stg_*`.
3. Ejecutar ETL desde panel o endpoint.
4. Revisar batches, entries y entry_lines.
5. Generar y descargar `DIARIO.TXT` y `SUBCUENTAS.TXT`.

Resultado esperado:

- flujo completo Numier -> staging -> ETL -> batch -> TXT funcionando

### Fase 3. Validacion con ClassicConta

Objetivo: cerrar la integracion contable real.

Tareas:

1. Importar los TXT generados en ClassicConta 6/7.
2. Verificar longitud, codificacion, campos y aceptacion por el importador.
3. Ajustar formato si aparece cualquier incompatibilidad real.

Resultado esperado:

- compatibilidad real validada, no solo teórica

### Fase 4. Cierre del agente Windows

Objetivo: dejar el agente listo para el entorno del cliente.

Tareas:

1. Verificar lectura real de DBF con VFPOLEDB en equipo Windows objetivo.
2. Resolver el empaquetado x86 definitivo o fijar una estrategia operativa alternativa.
3. Documentar instalacion, configuracion y soporte del agente.

Resultado esperado:

- ejecutable y procedimiento de instalacion utilizables por cliente o soporte

### Fase 5. Hardening y documentacion final

Objetivo: dejar el sistema mantenible y desplegable.

Tareas:

1. Reescribir `README.md` orientado a NumierConta Gateway.
2. Crear documentacion de despliegue, operacion y soporte.
3. Revisar proteccion de rutas y consistencia de seguridad.
4. Ejecutar una pasada final de tests, build y QA visual.

Resultado esperado:

- proyecto presentable, desplegable y transferible

## Prioridad exacta de los siguientes pasos

Orden recomendado de trabajo desde ahora:

1. Revisión manual del panel.
2. Flujo end-to-end con simulador.
3. Validacion de TXT en ClassicConta.
4. Cierre del agente Windows x86.
5. Limpieza de documentacion y hardening final.

## Mi recomendacion practica

El siguiente paso correcto no es añadir más features. Es ejecutar la fase de validacion operativa y convertir los hallazgos en correcciones pequeñas y concretas.

La forma mas eficiente de avanzar desde aqui es:

1. revisar la app en navegador
2. simular datos
3. ejecutar ETL
4. descargar TXT
5. corregir lo que falle
6. repetir hasta dejar el circuito cerrado

## Regla recordada para futuras respuestas

Desde este punto, cualquier resumen, avance, analisis, mejora o estado similar debe guardarse tambien en `docs/` en un archivo Markdown, ademas de mostrarse en terminal.
