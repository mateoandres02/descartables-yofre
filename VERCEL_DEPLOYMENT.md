# Despliegue en Vercel

El frontend y el backend se despliegan como dos proyectos independientes desde
este mismo repositorio.

## Backend

- **Root Directory:** `backend`
- **URL esperada:** `https://descartables-yofre-backend.vercel.app`
- **Framework Preset:** Other

Configurar estas variables en **Settings > Environment Variables** del proyecto:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`

`FRONTEND_URL` ya está definida en `backend/vercel.json` con el dominio productivo.
No hace falta configurar `PORT`: Vercel lo administra automáticamente.

Después del despliegue, el endpoint de comprobación es:

`https://descartables-yofre-backend.vercel.app/api/health`

## Frontend

- **Root Directory:** `frontend`
- **URL esperada:** `https://descartables-yofre.vercel.app`
- **Framework Preset:** Vite

`VITE_API_URL` ya está definida en `frontend/.env.production` como:

`https://descartables-yofre-backend.vercel.app/api`

La regla `rewrites` permite abrir directamente cualquier ruta de la SPA sin
obtener un error 404.

## Importante

Las variables secretas de Turso y JWT no deben guardarse en el repositorio. Hay
que cargarlas en Vercel para Production y, si se utilizan, Preview y Development.
