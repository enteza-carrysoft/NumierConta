# Checklist de pruebas del Panel Web (PRP-006)

> Fecha: 2026-06-16
> Entorno: `http://localhost:3000`
> Usuario de prueba: `test@numierconta.com` / `TestPassword123!`

---

## 1. Arranque y acceso

- [ ] Ejecutar `pnpm --filter web dev` y esperar a que el servidor esté listo.
- [ ] Abrir `http://localhost:3000` en el navegador.
- [ ] Comprobar redirección a `/login` si no hay sesión.
- [ ] Iniciar sesión con el usuario de prueba.
- [ ] Verificar redirección a `/dashboard` tras login exitoso.

---

## 2. Layout y navegación

- [ ] Se muestra la barra lateral con los enlaces: Dashboard, Empresas, Cuentas, Mapeo, Lotes.
- [ ] El header muestra organización, empresa activa y email del usuario.
- [ ] En resolución móvil, el menú hamburguesa despliega la navegación.
- [ ] Cada enlace de la barra lateral carga su vista sin errores visuales.
- [ ] El enlace de logout cierra la sesión y redirige a `/login`.

---

## 3. Selector de empresa activa

- [ ] Si el usuario tiene más de una empresa, aparece un desplegable en el header.
- [ ] Cambiar de empresa actualiza el contexto del panel.
- [ ] Al recargar la página se conserva la empresa seleccionada.
- [ ] Si solo hay una empresa, se muestra su nombre sin desplegable.

---

## 4. Dashboard

- [ ] Se visualizan 4 tarjetas KPI:
  - Empresas
  - Lotes este mes
  - Asientos este mes
  - Movimiento este mes
- [ ] Los KPIs reflejan datos reales de la empresa activa.
- [ ] El importe de movimiento aparece formateado en euros.
- [ ] Se ve la tarjeta "Generar lotes contables" con botón "Ejecutar ETL".
- [ ] Pulsar "Ejecutar ETL" genera un nuevo lote contable.
- [ ] La tarjeta de accesos rápidos muestra información útil.

---

## 5. Empresas (`/companies`)

- [ ] Lista las empresas vinculadas al usuario.
- [ ] Cada empresa muestra nombre, CIF, dígitos de subcuenta y ejercicio fiscal.
- [ ] Se puede pulsar "Editar" para modificar una empresa.
- [ ] Guardar cambios persiste en la base de datos.
- [ ] El formulario de "Nueva empresa" permite crear una empresa.
- [ ] Tras crear una empresa, aparece en el listado y en el selector de empresa.
- [ ] El campo "Dígitos de subcuenta" valida el rango 6-12.

---

## 6. Cuentas (`/accounts`)

- [ ] Lista el plan contable de la empresa activa.
- [ ] Cada cuenta muestra código, título, clase contable, tipo IVA y %.
- [ ] Se puede pulsar "Editar" para modificar una cuenta.
- [ ] Se pueden cambiar título, NIF, tipo IVA, % IVA, % recargo y clase contable.
- [ ] Guardar cambios persiste y se refleja en el listado.
- [ ] Si la empresa no tiene cuentas, se muestra un mensaje apropiado.

---

## 7. Mapeo de cuentas (`/mapping`)

- [ ] Lista las reglas de mapeo de la empresa activa.
- [ ] Cada regla muestra tipo, clave, cuentas débito/crédito/IVA, prioridad y estado.
- [ ] Se puede crear una nueva regla rellenando el formulario superior.
- [ ] Se puede editar una regla existente.
- [ ] Se puede eliminar una regla existente.
- [ ] El formulario valida campos obligatorios (tipo, clave, débito, crédito).
- [ ] Las cuentas introducidas deben respetar el formato de ClassicConta.

---

## 8. Lotes contables (`/batches`)

- [ ] En la parte superior se ve la tarjeta "Generar lotes contables" con botón "Ejecutar ETL".
- [ ] Lista los lotes generados por el ETL ordenados por fecha descendente.
- [ ] Cada lote muestra período, totales y estado.
- [ ] Se puede entrar al detalle de un lote.
- [ ] El detalle muestra tarjetas de total débito, crédito y diferencia.
- [ ] Se listan los asientos del lote con sus líneas.
- [ ] Cada línea muestra cuenta, concepto, débito y crédito.
- [ ] El botón "Descargar TXT para ClassicConta" genera ambos ficheros.
- [ ] Se descargan `SUBCUENTAS.TXT` y `DIARIO.TXT`.
- [ ] Los ficheros se abren correctamente en un editor de texto.
- [ ] Cada registro de `SUBCUENTAS.TXT` mide 444 caracteres.
- [ ] Cada registro de `DIARIO.TXT` mide 869 caracteres.
- [ ] Los ficheros están codificados en Windows-1252 (pueden contener acentos).

---

## 9. Seguridad y permisos

- [ ] No se muestran datos de empresas a las que el usuario no tiene acceso.
- [ ] Acceder a `/dashboard` sin sesión redirige a `/login`.
- [ ] Un usuario sin onboarding redirige a `/onboarding`.

---

## 10. Validaciones generales

- [ ] No hay errores visibles en la consola del navegador.
- [ ] No hay errores 500/400 inesperados en la pestaña Network.
- [ ] Las acciones de servidor muestran mensajes de éxito/error claros.
- [ ] El build de producción pasa (`pnpm --filter web build`).

---

## Notas de la revisión

_Espacio para que el revisor anote observaciones, bugs o cambios solicitados._

- 
- 
- 
