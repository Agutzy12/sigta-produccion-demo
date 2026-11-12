# Arquitectura de SIGTA (demo del módulo de Producción)

## Vista general

```
 Navegador (PC de oficina, notebook o celular)
 ┌──────────────────────────────────────────┐
 │ React + TypeScript + Tailwind            │  Pantallas: Panel, 4 pasos, Trazabilidad
 └───────────────┬──────────────────────────┘
                 │ HTTPS · JSON · token JWT en cada pedido
 ┌───────────────▼──────────────────────────┐
 │ API REST: Express + TypeScript           │
 │  1. ¿Quién es?      → sesión (JWT)       │
 │  2. ¿Puede?         → rol (matriz)       │
 │  3. ¿Está bien?     → Zod                │
 │  4. Caso de uso     → services/*.ts      │  reglas de negocio + transacción
 └───────────────┬──────────────────────────┘
                 │ Prisma (ORM)
 ┌───────────────▼──────────────────────────┐
 │ PostgreSQL                               │  tablas, claves foráneas, CHECK
 │  triggers: bloqueo lógico, protocolo     │  "segunda capa" de seguridad
 │  inalterable, auditoría sólo agregar     │
 └──────────────────────────────────────────┘
```

Es una arquitectura **cliente-servidor en tres capas** (presentación, lógica de negocio y datos) con una **API REST**.
En **Vercel**, las pantallas se sirven como archivos estáticos y la API corre como una función (`api/index.js`) que usa la misma
aplicación Express; la base es PostgreSQL en **Neon**. La interfaz es una **aplicación web instalable (PWA)**: se instala en la PC,
el celular o las colectoras Zebra y abre como una app, sin depender de un navegador abierto.

## Por qué cada tecnología

| Decisión | Motivo | Alternativas consideradas |
|---|---|---|
| **PostgreSQL** | Es el motor propuesto en el informe (sección 10.B). Relacional, con transacciones, *triggers* y roles. Gratuito y disponible como servicio gestionado (Neon, Amazon RDS, Azure). | MySQL (también válido); SQLite (la usaba el prototipo: no sirve para varios usuarios a la vez). |
| **Prisma** | El modelo de datos queda en un archivo legible (`schema.prisma`) y cada cambio es una migración versionada. Genera tipos para TypeScript: si se cambia una columna, el compilador avisa dónde se usa. | SQL a mano (más trabajo y sin tipos); TypeORM / Sequelize. |
| **Express + TypeScript** | Express es el framework web más usado en Node.js. TypeScript detecta errores antes de ejecutar. | NestJS (más estructura, más curva); Java/Spring. |
| **Zod** | Valida cada pedido con mensajes claros en castellano antes de llegar a la lógica. | Validación manual. |
| **bcrypt + JWT** | Contraseñas cifradas con *hash* lento (resistente a fuerza bruta). La sesión es un token firmado que vence a las 10 horas. | Sesiones en servidor. |
| **React + Vite** | Interfaz por componentes reutilizables; Vite compila rápido. | Angular, Vue. |
| **Tailwind CSS** | Los colores de la marca son variables (modo claro/oscuro) y están disponibles como clases. | CSS a mano. |
| **bwip-js** | Dibuja códigos GS1-128 reales en el navegador (sin servicios externos). | — |
| **Vitest, Supertest, Playwright** | Pruebas automáticas de la API contra PostgreSQL real y del recorrido completo en el navegador. | Jest, Cypress. |
| **PWA** (manifest + service worker) | El sistema se instala como aplicación en cualquier dispositivo sin publicarla en tiendas, y se actualiza sola. | App nativa (Android/iOS): dos desarrollos más. |
| **Vercel + Neon** | Publicación automática en cada cambio de GitHub; PostgreSQL gestionado con copias de seguridad. | Render, servidor propio. |

## Modelo de datos

```
categoria (5 líneas de la web) ──< producto
linea ──< producto ──< receta ──< receta_item >── insumo ──< partida_insumo
                │                                   │              │
                └──< orden_produccion ──< op_item >─┘              │
                          │      └──< consumo >────────────────────┘   (trazabilidad hacia atrás)
                          │
                          └── lote_produccion ── control_calidad (1 a 1, inalterable)
                                   ├──< pallet (etiqueta GS1-128)
                                   ├──< stock_pt (ingreso a depósito)
                                   └──< despacho                        (trazabilidad hacia adelante)
 usuario                     auditoria (registro de todo, sólo agregar)
```

Detalle de columnas: `server/prisma/schema.prisma`.

### Catálogo
Cada **presentación** del catálogo de agrifood-argentina.com es un producto (SKU): "Coditos 500 g" o "Nueces 5 kg".
El producto guarda la ficha que publica la web (presentación, vida útil, ingredientes, alérgenos, almacenamiento, embalaje,
palletizado) y el enlace a su página. Las pre mezclas y pre elaborados usan como insumo los deshidratados de la propia planta
(integración vertical). En los deshidratados, la merma de proceso es el agua que se evapora (por ejemplo, 11,5 kg de espinaca fresca
por cada kg deshidratado).

### Estados

- **Orden de producción:** `CREADA → PLANIFICADA → EN_PRODUCCION → EN_CONTROL_CALIDAD → FINALIZADA`,
  o `RECHAZADA_SCRAP` (rechazo de Calidad) o `CANCELADA` (antes de llegar a Calidad).
- **Lote:** `CUARENTENA → APROBADO_LIBERADO` o `RECHAZADO_BLOQUEADO`. Una vez dictaminado no cambia más.

## Seguridad y reglas en dos niveles

1. **Aplicación:** cada ruta declara qué roles la pueden usar (`server/src/rutas.ts`) y cada servicio valida las reglas del negocio.
2. **Base de datos** (`server/prisma/migrations/*_reglas_de_negocio`):
   - `trg_stock_pt_bloqueo` y `trg_despacho_bloqueo`: un lote no liberado no entra a stock ni se despacha (código `SG423`).
   - `trg_control_calidad_inalterable`: el protocolo firmado no se modifica ni se borra (`SG409`).
   - `trg_auditoria_solo_agregar`: el registro de auditoría sólo admite nuevos renglones.
   - `trg_lote_estado_final`: un dictamen firmado no se puede revertir.
   - `CHECK`: saldos de stock y cantidades nunca negativos.

Así, aunque alguien se saltee la aplicación (por ejemplo, con SQL directo), la base rechaza la operación.

**Concurrencia:** las operaciones que mueven stock se ejecutan en una transacción con un bloqueo de la base
(`pg_advisory_xact_lock`): si dos personas finalizan la misma orden a la vez, una se registra y la otra recibe un aviso
(hay una prueba automática para esto).

## GS1-128

Cada pallet recibe una etiqueta con: `(01)` GTIN del artículo, `(17)` vencimiento AAMMDD, `(3102)` peso neto en kg con 2 decimales
y `(10)` número de lote. La búsqueda de trazabilidad acepta el texto que entrega un lector (con paréntesis o en formato "crudo" con `]C1`
y separador GS), así que escanear una etiqueta lleva directo a la ficha del lote. Los GTIN de los productos son **de ejemplo**.

## Pruebas

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| API | Vitest + Supertest (`server/test`) | 30 pruebas: catálogo de la web, sesión y permisos, cálculo de recetas, FEFO, circuito completo, rechazo, bloqueo, triggers, concurrencia, GS1 |
| Navegador | Playwright (`client/e2e`) | 10 recorridos: ingreso, circuito completo con los 3 roles, bloqueo, rechazo, catálogo, app instalable, Gerencia sólo lectura, escaneo GS1, modo oscuro, celular |
