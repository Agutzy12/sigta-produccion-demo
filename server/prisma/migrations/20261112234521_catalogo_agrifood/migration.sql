-- AlterTable
ALTER TABLE "linea" ADD COLUMN     "proceso" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "producto" ADD COLUMN     "alergenos" TEXT,
ADD COLUMN     "almacenamiento" TEXT,
ADD COLUMN     "categoria_id" INTEGER,
ADD COLUMN     "embalaje" TEXT,
ADD COLUMN     "ingredientes" TEXT,
ADD COLUMN     "presentacion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "raciones" INTEGER,
ADD COLUMN     "unidades_por_caja" INTEGER,
ADD COLUMN     "unidades_por_pallet" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "url_web" TEXT;

-- CreateTable
CREATE TABLE "categoria" (
    "id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "url_web" TEXT,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_codigo_key" ON "categoria"("codigo");

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Palletizado y presentación siempre positivos
ALTER TABLE "producto" ADD CONSTRAINT "producto_presentacion_positiva" CHECK ("presentacion_kg" > 0 AND "unidades_por_pallet" > 0);
