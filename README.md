# SIGTA · Gestión y Trazabilidad Alimentaria

> **Sistema Integral de Gestión y Trazabilidad Alimentaria** para **Agrifood Argentina S.A.**
> Proyecto final de Analista de Sistemas · Benítez Agustín · basado en el *Informe Técnico V5*.
> Esta demo cubre el módulo **Gestión de Producción y Trazabilidad Industrial**.

SIGTA reemplaza los formularios en papel y las planillas de Excel de la planta: planifica la producción con las recetas,
controla la calidad de cada lote antes de que salga y permite saber, en segundos, de qué insumos está hecho un producto
y a qué cliente llegó.

## Qué incluye la demo

| Paso | Caso de uso | Pantalla | Lo registra |
|---|---|---|---|
| 1 | CU-P01 Registrar Orden de Producción | Planificar orden | Supervisor de producción |
| 2 | CU-P02 Registrar ejecución y consumo | Elaborar | Supervisor de producción |
| 3 | CU-P03 Registrar control de calidad de lote | Controlar calidad | Técnico de calidad |
| 4 | CU-P04 Registrar ingreso de PT y cierre de OP | Ingresar a depósito | Operario de depósito |
| — | Consulta | Panel · Trazabilidad de lote · Etiquetas GS1-128 | Todos (Gerencia: sólo lectura) |

Además: inicio de sesión con contraseña, permisos por rol, registro de auditoría, bloqueo lógico en la aplicación **y** en la base de datos,
etiquetas logísticas **GS1-128** con código de barras real, modo claro/oscuro, y **aplicación instalable** (PWA) en PC, celular o colectoras.

**Catálogo real:** los 31 productos y las 5 líneas de [agrifood-argentina.com](https://agrifood-argentina.com/productos.php)
(Deshidratados, Frutos secos, Pre elaborados, Pre mezclas y Pastas secas), con su presentación, vida útil, ingredientes, alérgenos,
embalaje y palletizado tal como los publica la empresa, y un enlace a la ficha de cada producto en la web.
Las recetas usan los ingredientes publicados; las proporciones, los códigos internos y los valores de calidad son de ejemplo.

> Los datos y los valores de especificación son **de ejemplo**: no son límites normativos.

## Tecnologías

| Capa | Tecnología | Para qué |
|---|---|---|
| Base de datos | **PostgreSQL 16** | Datos relacionales, transacciones y *triggers* para las reglas críticas |
| Acceso a datos | **Prisma** (ORM + migraciones) | Modelo de datos en `server/prisma/schema.prisma`, cambios versionados |
| Servidor (API REST) | **Node.js + Express + TypeScript** | Casos de uso, permisos y validaciones |
| Validación | **Zod** | Revisa la forma de cada pedido antes de procesarlo |
| Seguridad | **bcrypt + JWT** | Contraseñas cifradas y sesión firmada |
| Pantallas | **React + Vite + TypeScript + Tailwind CSS** | Interfaz web, también usable desde el celular |
| Códigos de barras | **bwip-js** | Etiquetas GS1-128 con IA (01), (17), (3102) y (10) |
| App instalable | **PWA** (manifest + service worker) | Se instala en PC, celular o colectoras y abre como una aplicación |
| Pruebas | **Vitest + Supertest** (API) · **Playwright** (navegador) | 30 pruebas de la API y 10 recorridos completos en el navegador |

La explicación de cada decisión está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Cómo correrla en tu computadora

Necesitás **Node.js 22** (LTS) y **PostgreSQL 16**. La forma más simple de tener PostgreSQL es con **Docker Desktop**.

```bash
git clone https://github.com/Agutzy12/sigta-produccion-demo.git
cd sigta-produccion-demo
npm install
npm run db:up                         # levanta PostgreSQL en Docker (puerto 5432)
cp server/.env.example server/.env    # en Windows: copy server\.env.example server\.env
npm run setup                         # crea las tablas y carga los datos de ejemplo
npm run dev                           # abre las pantallas en http://localhost:5173
```

¿Sin Docker? Instalá PostgreSQL 16 desde https://www.postgresql.org/download/, creá el usuario `sigta` (contraseña `sigta`)
y las bases `sigta` y `sigta_test` (ver `scripts/crear-base-test.sql`), y seguí desde `cp server/.env.example ...`.

### Usuarios de ejemplo

En la pantalla de ingreso hay accesos rápidos. Todos tienen la contraseña **`sigta2026`**.

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| produccion@sigta.demo · Martín Pérez | Supervisor de producción | Planificar órdenes y registrar la elaboración |
| calidad@sigta.demo · Lucía Benítez | Técnico de calidad | Analizar lotes y firmar el dictamen |
| deposito@sigta.demo · Diego Acosta | Operario de depósito | Recibir producto liberado y despachar |
| gerencia@sigta.demo · Valeria Ruiz | Gerencia | Sólo consulta |

Durante la demo podés cambiar de usuario desde tu nombre (arriba a la derecha) o con el botón *Cambiar a…* que aparece en cada paso.
**Datos de ejemplo → Reiniciar la demo** deja todo como al principio. El recorrido completo está en [`docs/GUION_DEMO.md`](docs/GUION_DEMO.md).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor (puerto 3000) y pantallas (puerto 5173) con recarga automática |
| `npm run setup` | Aplica las migraciones y carga los datos de ejemplo |
| `npm run db:seed -w server` | Vuelve a cargar los datos de ejemplo |
| `npm run db:studio -w server` | Abre Prisma Studio para mirar las tablas |
| `npm test` | Pruebas de la API (contra la base `sigta_test`) y control de tipos de las pantallas |
| `npm run build` y luego `npm start` | Versión de producción: un solo servidor en http://localhost:3000 |
| `npm run test:e2e` | Recorre la demo completa en el navegador (necesita `npm run build` antes) |

## Reglas que el sistema hace cumplir

- Un lote recién elaborado queda en **cuarentena**: no se puede recibir en depósito ni despachar.
- Sólo **Calidad** puede liberarlo. Un lote **rechazado** queda bloqueado y su OP pasa a *Rechazada (Scrap)*.
- El **bloqueo lógico** se verifica en dos niveles: en la aplicación (error 423) y en PostgreSQL (*triggers*).
- El protocolo de calidad firmado y el registro de auditoría son **inalterables** (también lo controla la base).
- Planificar una orden **no descuenta stock**: lo reserva. El stock se descuenta al finalizar la elaboración.
- Las partidas se sugieren por **FEFO** (primero vence, primero sale).
- Merma de proceso = (kg de materia prima consumidos − kg netos) / kg consumidos.
- Cada usuario sólo puede ejecutar los casos de uso de su **rol**.

## Estructura

```
server/                API REST (Express + TypeScript)
  prisma/schema.prisma   Modelo de datos
  prisma/migrations/     Tablas y reglas de la base (triggers)
  src/services/          Un servicio por tema: órdenes, calidad, depósito, trazabilidad, GS1...
  src/seed/catalogo.ts   El catálogo de agrifood-argentina.com (productos, insumos y recetas)
  src/rutas.ts           Rutas de la API y matriz de permisos por rol
  src/seed/              Datos de ejemplo
  test/                  Pruebas de la API
api/index.js           Función de Vercel: atiende /api con la misma aplicación Express
client/                Pantallas (React + Vite + Tailwind)
  src/paginas/           Una pantalla por paso del circuito
  src/componentes/       Menú, guía de pasos, etiquetas GS1...
  e2e/                   Pruebas en el navegador (Playwright)
docs/                  Arquitectura, guion de la demo, despliegue y tareas
```

## Publicarla en internet

Se publica en **Vercel** con la base **PostgreSQL en Neon** (`vercel.json` y `api/index.js` ya están preparados).
Los pasos están en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).
