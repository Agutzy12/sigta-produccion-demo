# Sugerencias para el Informe Técnico V5

Cosas detectadas al revisar el informe contra la demo. Ninguna cambia el fondo del trabajo.

## Errores a corregir

1. **Sección 1 · Responsable de la solicitud.** Dice "Nombre y Apellido: Agustin Benitez · Cargo: Director de la empresa",
   pero firma Omar Ali Yapur, que según la sección 6 es la Dirección / Gerencia General. Debería decir
   "Nombre y Apellido: Omar Ali Yapur · Cargo: Director". Vos sos el analista, no quien pide el sistema.
2. **Sección 11 · Quinta fila de la tabla.** Dice "El sistema SIGTA BLOCK bloqueará...": parece un error de tipeo. Sugerencia: "SIGTA bloqueará...".
3. **Sección 1.** "Manifiesta" va con minúscula después de "S.A.".

## Unificar con la demo

4. **Roles (sección 12, módulo de usuarios).** El informe nombra Administrador, Operario, Supervisor y Técnico de Calidad.
   La demo usa: Supervisor de producción, Técnico de calidad, Operario de depósito y Gerencia (sólo consulta).
   Sugerencia: agregar en el informe la tabla de roles de la demo y aclarar que "Administrador" llega con el módulo de usuarios.
5. **Nombre del sistema.** En pantallas y documentos usar "SIGTA · Sistema Integral de Gestión y Trazabilidad Alimentaria"
   y "para Agrifood Argentina S.A." (el sistema es el producto; la empresa, el cliente).

## Sección nueva sugerida: "Arquitectura y tecnologías"

Hoy el informe no nombra el stack. Sugerencia de texto:

> SIGTA se desarrolla como una aplicación web cliente-servidor en tres capas. La base de datos es **PostgreSQL**, accedida con el ORM
> **Prisma**, que versiona el modelo de datos mediante migraciones. La lógica de negocio se expone como una **API REST** construida
> con **Node.js, Express y TypeScript**, con validación de datos (**Zod**), contraseñas cifradas (**bcrypt**) y sesiones firmadas (**JWT**).
> La interfaz se construye con **React, Vite y Tailwind CSS**, adaptable a computadoras y terminales móviles.
> Las reglas críticas de inocuidad (bloqueo de lotes no liberados, inalterabilidad del protocolo de calidad y del registro de auditoría)
> se implementan en dos niveles: en la aplicación y en la propia base de datos mediante *triggers*.
> La solución se despliega en la nube: PostgreSQL gestionado (Neon) y servidor de aplicaciones (Render), con pruebas automáticas
> (Vitest, Supertest y Playwright) que se ejecutan en cada cambio (GitHub Actions).

En la sección 10.B, donde dice "PostgreSQL o MySQL sobre servicios como Amazon RDS o Azure SQL", se puede agregar
"(en esta etapa: PostgreSQL gestionado en Neon)".
