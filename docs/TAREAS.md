# Tareas del proyecto SIGTA

## Hechas en la demo (versión React + PostgreSQL)

- [x] Base PostgreSQL con Prisma: modelo de datos y migraciones versionadas
- [x] Reglas en la base: triggers de bloqueo lógico, protocolo inalterable, auditoría sólo agregar, dictamen final y CHECK de saldos
- [x] API REST en Express + TypeScript con validación Zod
- [x] Inicio de sesión real (bcrypt + JWT) y permisos por rol
- [x] CU-P01 a CU-P04 completos, panel y trazabilidad bidireccional
- [x] Etiquetas GS1-128 (armado, código de barras y lectura simulada del escáner)
- [x] Marca nueva: SIGTA como producto, "para Agrifood Argentina" como cliente
- [x] Interfaz más intuitiva: menú numerado por pasos con pendientes, guía "qué hago y qué sigue", tarea sugerida por rol,
      cambio de rol con un clic en la demo, glosario al pasar el mouse y página "¿Cómo funciona SIGTA?"
- [x] Modo claro / oscuro y versión para celular
- [x] 28 pruebas de la API y 8 recorridos en el navegador (Playwright)
- [x] Integración continua (GitHub Actions) y despliegue en Vercel + Neon
- [x] Catálogo real de agrifood-argentina.com: 5 líneas, 31 productos con su ficha, insumos y recetas
- [x] Aplicación instalable (PWA) en PC, celular y colectoras

## Para seguir

- [ ] Conectar la base Neon en Vercel (ver `docs/DESPLIEGUE.md`)
- [ ] Validar con Producción las proporciones de las recetas y con Calidad las especificaciones
- [ ] Dividir en repositorios `SIGTA-Agrofood-Back` (carpeta `server/`) y `SIGTA-Agrofood-Front` (carpeta `client/`)
- [ ] Reemplazar los valores de especificación de ejemplo por los reales de Calidad
- [ ] Revisar con Agrifood los códigos (OP, lote, protocolo, pallet), vidas útiles y GTIN reales
- [ ] Administración de usuarios (alta, baja, cambio de contraseña)
- [ ] Módulo Compras (remitos, aprobación de partidas de insumo con R.BPM.01V01)
- [ ] Módulo Stock e inventarios (multi-depósito, recuento cíclico a ciegas, ajustes autorizados)
- [ ] Módulo Ventas y despacho (pedidos, remitos, hoja de ruta, facturación electrónica)
- [ ] Reportes y exportación a PDF
- [ ] Lector de códigos de barras real (colectoras Zebra TC21)
- [ ] Capturas y diagramas del sistema para el informe final
