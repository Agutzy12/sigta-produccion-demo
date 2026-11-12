# Publicar SIGTA en internet

Esquema: **PostgreSQL gestionado en Neon** + **aplicación en Render** (un solo servicio web que entrega API y pantallas).
Ambos tienen planes gratuitos. Corresponde a la arquitectura en la nube (SaaS) propuesta en el informe, sección 10.B.

## 1. Base de datos en Neon
1. Crear una cuenta en https://neon.tech y un proyecto (región São Paulo, la más cercana).
2. Copiar la *connection string* (empieza con `postgresql://...` y termina en `?sslmode=require`).

## 2. Aplicación en Render
1. Crear una cuenta en https://render.com y conectar GitHub.
2. **New → Blueprint** y elegir este repositorio: Render lee `render.yaml`.
3. Cuando lo pida, pegar la connection string de Neon en `DATABASE_URL`.
4. Render instala, compila, aplica las migraciones y arranca. La primera vez carga sola los datos de ejemplo.

`JWT_SECRET` lo genera Render automáticamente. Para un uso real (no demo) poner `DEMO_MODE=false`:
se ocultan los accesos rápidos y las herramientas de datos de ejemplo.

## Notas
- El plan gratuito de Render "duerme" el servicio tras 15 minutos sin uso: el primer ingreso tarda unos 30 segundos.
  Antes de la presentación conviene abrir la página un rato antes.
- Copias de seguridad: Neon guarda el historial de la base y permite restaurarla a un momento anterior.
