# Publicar SIGTA en internet (Vercel + Neon)

SIGTA se publica en **Vercel** (que ya usa el repositorio SIGTA-Agrofood) con la base **PostgreSQL en Neon**.
Ambos tienen plan gratuito. Corresponde a la arquitectura en la nube (SaaS) del informe, sección 10.B.

```
Navegador / app instalada ──► Vercel ──┬─ pantallas (client/dist, archivos estáticos)
                                       └─ /api/* → función api/index.js (Express) ──► Neon (PostgreSQL)
```

## 1. Conectar la base de datos (una sola vez)

1. Entrá a https://vercel.com, abrí el proyecto **SIGTA-Agrofood**.
2. Pestaña **Storage** → **Create Database** → elegí **Neon (Serverless Postgres)** → región **São Paulo** (o la más cercana) → **Create**.
3. Cuando pregunte, conectala al proyecto para **Production** y **Preview**.
   Vercel agrega solo las variables `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
4. En **Settings → Environment Variables** agregá:
   - `JWT_SECRET`: una frase larga cualquiera (por ejemplo, 40 letras al azar). Firma las sesiones.
   - `DEMO_MODE`: `true` (muestra los accesos rápidos y las herramientas de datos de ejemplo).
5. Pestaña **Deployments** → en el último despliegue, **⋯ → Redeploy**.

En cada despliegue, Vercel instala, compila, aplica las migraciones pendientes y, si la base está vacía, carga los datos de ejemplo
(`scripts/vercel-build.mjs`). La configuración está en `vercel.json`.

> Si se publica sin base, las pantallas cargan igual y el ingreso muestra "Falta configurar la base de datos".

## 2. Ramas

- **main**: lo que se ve en la dirección principal del proyecto en Vercel (producción).
- **developer**: rama de trabajo. Vercel publica cada push en una dirección de prueba (*preview*).
- **prototipo-html**: la primera versión de la demo (HTML + JavaScript + SQLite), guardada como referencia.

## 3. Instalarla como aplicación

Al abrir la dirección de Vercel desde el celular o la PC aparece **Instalar app** (o, en iPhone, Compartir → Agregar a inicio).
Ver la sección "Usar SIGTA como aplicación" en *¿Cómo funciona SIGTA?*.

## Alternativa: Render

`render.yaml` permite publicar todo como un único servidor en Render (New → Blueprint) usando la misma base de Neon.

## Notas

- Para un uso real (no demo) poner `DEMO_MODE=false`: se ocultan los accesos rápidos y las herramientas de datos de ejemplo.
- Neon guarda el historial de la base y permite restaurarla a un momento anterior (copias de seguridad).
