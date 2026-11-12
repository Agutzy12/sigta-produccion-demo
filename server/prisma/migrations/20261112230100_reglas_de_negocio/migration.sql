-- =====================================================================
-- Reglas de negocio que hace cumplir la propia base de datos.
-- Aunque alguien se saltee la aplicación (por ejemplo, con SQL directo),
-- PostgreSQL rechaza la operación. Es la "segunda capa" del bloqueo lógico.
-- Códigos de error propios: SG423 (bloqueo lógico) y SG409 (registro inalterable).
-- =====================================================================

-- 1) Saldos y cantidades nunca negativos
ALTER TABLE "partida_insumo" ADD CONSTRAINT "partida_saldo_no_negativo" CHECK ("cantidad" >= 0);
ALTER TABLE "stock_pt" ADD CONSTRAINT "stock_pt_saldo_no_negativo" CHECK ("cantidad_kg" >= 0);
ALTER TABLE "orden_produccion" ADD CONSTRAINT "op_cantidad_positiva" CHECK ("cantidad_kg" > 0);
ALTER TABLE "lote_produccion" ADD CONSTRAINT "lote_cantidad_positiva" CHECK ("cantidad_kg" > 0 AND "bultos" >= 0);
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "despacho" ADD CONSTRAINT "despacho_cantidad_positiva" CHECK ("cantidad_kg" > 0);

-- 2) Bloqueo lógico: un lote que no esté APROBADO_LIBERADO no puede entrar a stock ni despacharse
CREATE FUNCTION sigta_bloqueo_logico() RETURNS trigger AS $$
DECLARE
  estado_lote text;
BEGIN
  SELECT "estado"::text INTO estado_lote FROM "lote_produccion" WHERE "id" = NEW."lote_id";
  IF estado_lote IS DISTINCT FROM 'APROBADO_LIBERADO' THEN
    RAISE EXCEPTION 'Bloqueo lógico: el lote no está aprobado y liberado (estado %)', COALESCE(estado_lote, 'inexistente')
      USING ERRCODE = 'SG423';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_pt_bloqueo BEFORE INSERT ON "stock_pt"
  FOR EACH ROW EXECUTE FUNCTION sigta_bloqueo_logico();
CREATE TRIGGER trg_despacho_bloqueo BEFORE INSERT ON "despacho"
  FOR EACH ROW EXECUTE FUNCTION sigta_bloqueo_logico();

-- 3) El protocolo de calidad firmado es inalterable (no se modifica ni se borra)
CREATE FUNCTION sigta_protocolo_inalterable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'El protocolo de calidad firmado no puede eliminarse' USING ERRCODE = 'SG409';
  END IF;
  RAISE EXCEPTION 'El protocolo de calidad firmado es inalterable' USING ERRCODE = 'SG409';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_control_calidad_inalterable BEFORE UPDATE OR DELETE ON "control_calidad"
  FOR EACH ROW EXECUTE FUNCTION sigta_protocolo_inalterable();

-- 4) El registro de auditoría sólo admite agregar renglones
CREATE FUNCTION sigta_auditoria_solo_agregar() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El registro de auditoría no se puede modificar ni borrar' USING ERRCODE = 'SG409';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_solo_agregar BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION sigta_auditoria_solo_agregar();

-- 5) Un lote rechazado no puede volver a liberarse (y un lote dictaminado no vuelve a cuarentena)
CREATE FUNCTION sigta_estado_lote_final() RETURNS trigger AS $$
BEGIN
  IF OLD."estado" <> 'CUARENTENA' AND NEW."estado" <> OLD."estado" THEN
    RAISE EXCEPTION 'El dictamen del lote % ya está firmado y no se puede cambiar', OLD."codigo" USING ERRCODE = 'SG409';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lote_estado_final BEFORE UPDATE OF "estado" ON "lote_produccion"
  FOR EACH ROW EXECUTE FUNCTION sigta_estado_lote_final();
