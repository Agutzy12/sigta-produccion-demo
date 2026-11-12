-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PRODUCCION', 'CALIDAD', 'DEPOSITO', 'DIRECCION');

-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('MP', 'ME');

-- CreateEnum
CREATE TYPE "EstadoPartida" AS ENUM ('LIBERADO', 'CUARENTENA', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoOP" AS ENUM ('CREADA', 'PLANIFICADA', 'EN_PRODUCCION', 'EN_CONTROL_CALIDAD', 'FINALIZADA', 'RECHAZADA_SCRAP', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('CUARENTENA', 'APROBADO_LIBERADO', 'RECHAZADO_BLOQUEADO');

-- CreateEnum
CREATE TYPE "Dictamen" AS ENUM ('APROBAR_LIBERAR', 'RECHAZAR_BLOQUEAR');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "iniciales" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "gtin" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "linea_id" INTEGER,
    "presentacion_kg" DOUBLE PRECISION NOT NULL,
    "vida_util_meses" INTEGER NOT NULL,
    "humedad_max" DOUBLE PRECISION NOT NULL,
    "ph_min" DOUBLE PRECISION NOT NULL,
    "ph_max" DOUBLE PRECISION NOT NULL,
    "ufc_max" INTEGER NOT NULL,
    "color_esperado" TEXT NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "unidad" TEXT NOT NULL,
    "critico" BOOLEAN NOT NULL DEFAULT true,
    "stock_minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta" (
    "id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "base_kg" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_item" (
    "receta_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad_base" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "receta_item_pkey" PRIMARY KEY ("receta_id","insumo_id")
);

-- CreateTable
CREATE TABLE "partida_insumo" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "nro_lote" TEXT NOT NULL,
    "proveedor" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "vencimiento" DATE,
    "documento_origen" TEXT,
    "estado" "EstadoPartida" NOT NULL DEFAULT 'LIBERADO',
    "ingreso" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partida_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_produccion" (
    "id" SERIAL NOT NULL,
    "secuencia" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "receta_id" INTEGER NOT NULL,
    "linea_id" INTEGER,
    "cantidad_kg" DOUBLE PRECISION NOT NULL,
    "fecha_proyectada" DATE NOT NULL,
    "hora_prevista" TEXT,
    "estado" "EstadoOP" NOT NULL,
    "pausada" BOOLEAN NOT NULL DEFAULT false,
    "motivo_pausa" TEXT,
    "observaciones" TEXT,
    "creado_por" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL,
    "inicio_real" TIMESTAMPTZ(3),
    "operador" TEXT,
    "fin_elaboracion" TIMESTAMPTZ(3),
    "cierre" TIMESTAMPTZ(3),
    "cantidad_real_kg" DOUBLE PRECISION,
    "bultos" INTEGER,
    "merma_kg" DOUBLE PRECISION,
    "merma_pct" DOUBLE PRECISION,
    "lote_codigo_previsto" TEXT,
    "vencimiento_previsto" DATE,
    "avance" JSONB,

    CONSTRAINT "orden_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "op_item" (
    "op_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad_teorica" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "op_item_pkey" PRIMARY KEY ("op_id","insumo_id")
);

-- CreateTable
CREATE TABLE "consumo" (
    "id" SERIAL NOT NULL,
    "op_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "consumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote_produccion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "op_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad_kg" DOUBLE PRECISION NOT NULL,
    "bultos" INTEGER NOT NULL,
    "vencimiento" DATE NOT NULL,
    "estado" "EstadoLote" NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL,
    "borrador" JSONB,

    CONSTRAINT "lote_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_calidad" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "protocolo" TEXT NOT NULL,
    "formulario" TEXT NOT NULL,
    "humedad" DOUBLE PRECISION NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "aroma" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sabor" TEXT NOT NULL,
    "ufc" INTEGER NOT NULL,
    "dictamen" "Dictamen" NOT NULL,
    "observaciones" TEXT,
    "analista" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "control_calidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_pt" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "comprobante" TEXT NOT NULL,
    "deposito" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "camara" TEXT,
    "bultos" INTEGER NOT NULL,
    "pallets" INTEGER NOT NULL,
    "kg_recibidos" DOUBLE PRECISION NOT NULL,
    "cantidad_kg" DOUBLE PRECISION NOT NULL,
    "bultos_danados" INTEGER NOT NULL DEFAULT 0,
    "merma_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "justificacion" TEXT,
    "recibido_por" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_pt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallet" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "bultos" INTEGER NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despacho" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "cliente" TEXT NOT NULL,
    "cantidad_kg" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "usuario" TEXT NOT NULL,

    CONSTRAINT "despacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "usuario" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "detalle" TEXT,
    "resultado" TEXT,
    "op_id" INTEGER,
    "lote_id" INTEGER,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "producto_gtin_key" ON "producto"("gtin");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_codigo_key" ON "insumo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "receta_codigo_version_key" ON "receta"("codigo", "version");

-- CreateIndex
CREATE INDEX "partida_insumo_insumo_id_estado_idx" ON "partida_insumo"("insumo_id", "estado");

-- CreateIndex
CREATE INDEX "partida_insumo_nro_lote_idx" ON "partida_insumo"("nro_lote");

-- CreateIndex
CREATE UNIQUE INDEX "orden_produccion_secuencia_key" ON "orden_produccion"("secuencia");

-- CreateIndex
CREATE UNIQUE INDEX "orden_produccion_numero_key" ON "orden_produccion"("numero");

-- CreateIndex
CREATE INDEX "orden_produccion_estado_idx" ON "orden_produccion"("estado");

-- CreateIndex
CREATE INDEX "consumo_op_id_idx" ON "consumo"("op_id");

-- CreateIndex
CREATE INDEX "consumo_partida_id_idx" ON "consumo"("partida_id");

-- CreateIndex
CREATE UNIQUE INDEX "lote_produccion_codigo_key" ON "lote_produccion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lote_produccion_op_id_key" ON "lote_produccion"("op_id");

-- CreateIndex
CREATE INDEX "lote_produccion_estado_idx" ON "lote_produccion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "control_calidad_lote_id_key" ON "control_calidad"("lote_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_calidad_protocolo_key" ON "control_calidad"("protocolo");

-- CreateIndex
CREATE INDEX "stock_pt_lote_id_idx" ON "stock_pt"("lote_id");

-- CreateIndex
CREATE UNIQUE INDEX "pallet_codigo_key" ON "pallet"("codigo");

-- CreateIndex
CREATE INDEX "auditoria_op_id_idx" ON "auditoria"("op_id");

-- CreateIndex
CREATE INDEX "auditoria_lote_id_idx" ON "auditoria"("lote_id");

-- CreateIndex
CREATE INDEX "auditoria_accion_idx" ON "auditoria"("accion");

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta" ADD CONSTRAINT "receta_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_item" ADD CONSTRAINT "receta_item_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "receta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_item" ADD CONSTRAINT "receta_item_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida_insumo" ADD CONSTRAINT "partida_insumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "receta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_produccion" ADD CONSTRAINT "orden_produccion_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_item" ADD CONSTRAINT "op_item_op_id_fkey" FOREIGN KEY ("op_id") REFERENCES "orden_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "op_item" ADD CONSTRAINT "op_item_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_op_id_fkey" FOREIGN KEY ("op_id") REFERENCES "orden_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote_produccion" ADD CONSTRAINT "lote_produccion_op_id_fkey" FOREIGN KEY ("op_id") REFERENCES "orden_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote_produccion" ADD CONSTRAINT "lote_produccion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_calidad" ADD CONSTRAINT "control_calidad_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_pt" ADD CONSTRAINT "stock_pt_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallet" ADD CONSTRAINT "pallet_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despacho" ADD CONSTRAINT "despacho_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
