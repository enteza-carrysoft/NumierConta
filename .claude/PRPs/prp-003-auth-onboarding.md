# PRP-003: Auth + Onboarding

> **Estado**: COMPLETADO
> **Fecha**: 2026-06-16
> **Proyecto**: NumierConta Gateway

---

## Objetivo

Implementar autenticación completa con Supabase Auth (email/password) y un flujo de onboarding que permita a un nuevo usuario crear su organización y primera empresa antes de acceder al dashboard.

## Por Qué

| Problema | Solución |
|---|---|
| Las páginas de login/signup son placeholders sin funcionalidad. | Formularios reales conectados a Supabase Auth. |
| Un usuario sin organización no puede usar la app. | Flujo de onboarding obligatorio tras el registro. |
| Las rutas principales no están protegidas. | Middleware o Server Components redirigen a `/login` si no hay sesión. |
| No hay forma de cerrar sesión. | Botón de logout en el dashboard. |

**Valor de negocio**: Los usuarios pueden entrar, registrarse, configurar su primera empresa y empezar a usar el resto de la aplicación.

## Qué

### Criterios de Éxito
- [ ] Página `/login` con formulario funcional de email/password.
- [ ] Página `/signup` con formulario funcional y validación Zod.
- [ ] Flujo `/onboarding` que crea organización y primera empresa tras signup.
- [ ] Middleware que protege rutas `(main)/*` y redirige a `/login` si no hay sesión.
- [ ] Usuarios autenticados sin organización son redirigidos a `/onboarding`.
- [ ] Logout disponible en el layout principal.
- [ ] `pnpm -r typecheck` y `pnpm -r test` pasan.
- [ ] Build de `apps/web` exitoso.
- [ ] Simulación E2E: signup → onboarding → acceso al dashboard.

### Comportamiento Esperado

1. Usuario visita `/login`, introduce email y password, envía.
2. Si las credenciales son válidas, Supabase crea la sesión y redirige:
   - A `/dashboard` si ya tiene organización.
   - A `/onboarding` si no tiene organización.
3. En `/onboarding`, el usuario introduce nombre de organización y empresa.
4. Al enviar, se crean `organizations`, `companies`, `profiles` y `user_companies`.
5. Se le asigna rol `owner`.
6. Se redirige a `/dashboard`.
7. Si el usuario cierra sesión, vuelve a `/login`.

---

## Contexto

### Referencias
- `NumierConta_Gateway_Design.md` secciones 4.2 (roles), 10.1 (rutas).
- `supabase/migrations/0001_tenancy.sql` — esquema de `organizations`, `companies`, `profiles`, `user_companies`.
- `apps/web/src/app/(auth)/login/page.tsx` — placeholder actual.
- `apps/web/src/app/(auth)/signup/page.tsx` — placeholder actual.
- `apps/web/src/app/(main)/layout.tsx` — layout principal vacío.

### Arquitectura Propuesta

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── layout.tsx          # protección + sidebar/header + logout
│   │   └── dashboard/page.tsx
│   └── onboarding/
│       └── page.tsx
├── features/auth/
│   ├── components/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── logout-button.tsx
│   ├── services/
│   │   ├── login.ts
│   │   ├── signup.ts
│   │   └── logout.ts
│   └── types/
│       └── auth.ts
├── features/onboarding/
│   ├── components/
│   │   └── onboarding-form.tsx
│   └── services/
│       └── create-organization.ts
├── middleware.ts               # protección de rutas
└── lib/supabase/
    ├── client.ts
    └── server.ts
```

### Modelo de Datos

Ver `supabase/migrations/0001_tenancy.sql`. Campos relevantes:
- `organizations.id`, `name`
- `companies.id`, `organization_id`, `name`, `agent_api_key`
- `profiles.id` (FK a auth.users), `organization_id`, `role`
- `user_companies.user_id`, `company_id`

`agent_api_key` debe generarse automáticamente al crear la empresa (UUID o string aleatorio).

---

## Blueprint (Assembly Line)

### Fase 1: Cliente de Supabase SSR robusto + tipos de auth
**Objetivo**: Tener los helpers de auth reutilizables y el layout de auth limpio.
**Validación**: `pnpm --filter web typecheck` pasa; existe `features/auth/services/login.ts`.

### Fase 2: Formulario y página de Login
**Objetivo**: Página `/login` funcional con email/password.
**Validación**: Login con usuario de prueba redirige correctamente.

### Fase 3: Formulario y página de Signup
**Objetivo**: Página `/signup` funcional con validación Zod.
**Validación**: Registro crea usuario en Supabase Auth.

### Fase 4: Onboarding
**Objetivo**: Página `/onboarding` que crea organización, empresa, perfil y vinculación.
**Validación**: Tras signup, el nuevo usuario completa onboarding y accede al dashboard.

### Fase 5: Protección de rutas + Logout
**Objetivo**: Middleware protege `(main)/*` y onboarding redirige si ya está completo. Logout en layout principal.
**Validación**: Usuario no autenticado no puede acceder a `/dashboard`; logout funciona.

### Fase 6: Layout principal básico
**Objetivo**: Sidebar/header mínimo con nombre de empresa/organización y botón de logout.
**Validación**: Dashboard muestra datos del usuario autenticado.

### Fase 7: Validación Final
**Objetivo**: Auth + onboarding funcionando end-to-end.
**Validación**:
- [ ] `pnpm -r typecheck` pasa.
- [ ] `pnpm -r test` pasa.
- [ ] Build de `apps/web` exitoso.
- [ ] Simulación E2E: signup → onboarding → dashboard → logout.

---

## 🧠 Aprendizajes (Self-Annealing)

- **Next.js 16 deprecó `middleware.ts` a favor de `proxy.ts`**: al ejecutar `next dev` con `middleware.ts` el servidor arrojó "Cannot find the middleware module". La migración al nuevo archivo `src/proxy.ts` resolvió el problema.
- **Cookies en `proxy.ts` vs `middleware.ts`**: `request.cookies.set(name, value, options)` no acepta `options` en `NextRequest` del proxy. Solo es necesario aplicar `response.cookies.set(name, value, options)`.
- **`useActionState` requiere firma `(prevState, payload)`**: los Server Actions deben declarar `_prevState` como primer argumento para ser compatibles con `useActionState`.
- **Onboarding requiere service role**: las políticas RLS vigentes no permiten insertar `organizations`, `companies`, `profiles` ni `user_companies` desde un usuario anónimo recién registrado, por lo que el Server Action de onboarding usa `createServiceRoleClient`.
- **La página `/` era un placeholder de SaaS Factory**: se reemplazó por un Server Component que redirige a `/login`, `/onboarding` o `/dashboard` según el estado de autenticación.

---

## Gotchas

- [ ] El middleware de Next.js debe leer cookies correctamente con `@supabase/ssr`.
- [ ] Server Components deben usar `createClient` de `lib/supabase/server.ts` para obtener el usuario.
- [ ] `profiles` debe crearse explícitamente tras el signup (Supabase Auth no lo hace automáticamente).
- [ ] `agent_api_key` de la empresa debe ser único y generarse en el servidor.
- [ ] No exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente; usar Server Actions para crear organización/empresa.
- [ ] Mantener funciones pequeñas (< 50 líneas) y archivos < 500 líneas.

## Anti-Patrones

- NO usar `any`.
- NO exponer secrets en el cliente.
- NO permitir que un usuario vea/édite datos de otra empresa (RLS ya protege, pero verificar).
- NO hardcodear roles; usar los definidos en el diseño (`owner`, `admin`, `accountant`, `viewer`).

---

*PRP pendiente aprobación. No se ha modificado código.*
