# SIGTA - Sistema Integral de Gestión y Trazabilidad Alimentaria
> **Proyecto Final / Tesis de Grado**  
> Módulo Principal: **Gestión de Producción y Trazabilidad Industrial (Agrifood Argentina S.A.)**

## Alcance de la Demo
Implementación funcional del ciclo transaccional completo de manufactura alimenticia bajo normativas bromatológicas (CAA):
1. **CU-P01:** Planificación de Orden de Producción y cálculo dinámico de receta.
2. **CU-P02:** Ejecución en planta, imputación de insumos y generación de lote en cuarentena.
3. **CU-P03:** Protocolo bromatológico y dictamen técnico de liberación (R.BPM.01V01).
4. **CU-P04:** Ingreso a depósito con estiba en rack y finalización de orden.
5. **Módulo de Auditoría:** Trazabilidad inversa del producto terminado.

## 🛠️ Stack Tecnológico
- **Backend:** Node.js + Express (TypeScript) / ORM Prisma + SQLite
- **Frontend:** React + Vite + Tailwind CSS
- **Arquitectura:** Monorepo con separación estricta de capas (API REST transaccional).

## Puesta en Marcha Local
```bash
# 1. Clonar e instalar
git clone <(https://github.com/Agutzy12/sigta-produccion-demo.git)>
cd sigta-produccion-demo

# 2. Configurar y levantar Backend
cd server && npm install && npx prisma migrate dev && npm run seed && npm run dev

# 3. Levantar Frontend
cd ../client && npm install && npm run dev
