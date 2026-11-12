# Guion de la demo (unos 10 minutos)

Antes de empezar: `npm run dev` (o la versión publicada) y, si ya probaste cosas, **Datos de ejemplo → Reiniciar la demo**.

## 0. Ingreso (1 min)
Mostrar la pantalla de ingreso: qué es SIGTA, los 4 pasos y el logo de Agrifood como cliente.
Probar una contraseña incorrecta (mensaje genérico). Entrar como **Supervisor de producción**.

## 1. Panel (1 min)
"Tu próxima tarea" según el rol, los 3 indicadores, **Para resolver** (almidón y film bajo el mínimo) y la tabla de órdenes.
Señalar el menú: los pasos están numerados y cada uno muestra cuántas tareas tiene pendientes.
Pasar el mouse por la palabra *cuarentena* para mostrar el glosario.

## 2. Planificar orden · CU-P01 (1 min)
*Nueva orden* → MRC01, 1.000 kg. El cálculo de insumos con la receta y "Sin faltantes".
Escribir 100000: aparecen faltantes y **no deja planificar** (sí guardar borrador, que avisa a Compras). Volver a 1.000 → *Confirmar y planificar*.

## 3. Elaborar · CU-P02 (2 min)
*Iniciar elaboración*: se asigna el lote (L-MRC01-AAAASS-NN). Las partidas sugeridas por **FEFO** y *Dividir consumo*.
*Pausar línea* y *Reanudar*. La merma se calcula sola → *Finalizar y enviar a Calidad*.
**Idea clave:** el lote queda en **cuarentena** y recién ahí se descuenta el stock.

## 4. Bloqueo lógico (1 min)
Cambiar a **Operario de depósito** → *Trazabilidad* del lote → *Registrar despacho de ejemplo* → el sistema **lo bloquea**
y el intento queda en el historial. Contar que la base de datos también lo impide (trigger).

## 5. Controlar calidad · CU-P03 (1 min)
En el paso 3 usar *Cambiar a Técnico de calidad*. *Cargar ejemplo*, ver los contrastes "Conforme".
Poner humedad 19 %: no deja aprobar. Volver a 12,4 → *Firmar protocolo*.

## 6. Ingresar a depósito · CU-P04 (1 min)
*Cambiar a Operario de depósito*. Certificado verificado, pallets (25 + 24 bolsas), ubicación y balance.
*Confirmar ingreso y cerrar OP* → comprobante REC, OP *Finalizada* y las **etiquetas GS1-128** con código de barras.

## 7. Trazabilidad (1 min)
Recorrido en 5 etapas, insumos y proveedores (hacia atrás), historial de auditoría.
*Escanear código* → elegir un pallet: el sistema lee la etiqueta GS1-128 y abre su lote.
Buscar un lote de origen (por ejemplo `MF-261015`) para ver **a qué lotes llegó** esa harina (hacia adelante).

## 8. Rechazo (opcional)
Con otro lote, recuento de 45.000 UFC/g: sólo permite *Rechazar y bloquear*, exige observaciones,
la OP pasa a *Rechazada (Scrap)* y se alerta a jefatura (campanita).

## 9. Gerencia (opcional)
Entrar como **Gerencia**: ve todo con el aviso "Modo de sólo lectura" y los botones deshabilitados.

## Si algo sale mal
**Datos de ejemplo → Reiniciar la demo** deja todo como al principio.
