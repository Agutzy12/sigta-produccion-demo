/** Botón "Instalar app" (sólo aparece cuando el navegador permite instalar SIGTA) y la explicación para cada dispositivo. */
import { useEffect, useState } from 'react';
import { useDialogos } from '../contexto/Dialogos';
import { alCambiarInstalable, esIphone, instalar, sePuedeInstalar, yaInstalada } from '../lib/instalar';
import { Icono } from './Icono';

export function BotonInstalar() {
  const { aviso } = useDialogos();
  const [disponible, setDisponible] = useState(sePuedeInstalar());
  useEffect(() => alCambiarInstalable(() => setDisponible(sePuedeInstalar())), []);
  if (!disponible) return null;
  return (
    <button className="chip-demo" style={{ background: 'var(--verde-suave)', color: 'var(--verde)' }} title="Instalar SIGTA como aplicación"
      onClick={async () => { if (await instalar()) aviso('SIGTA quedó instalada como aplicación', 'ok'); }}>
      <Icono n="descargar" tam={14} /> Instalar app
    </button>
  );
}

export function ComoInstalar() {
  const [disponible, setDisponible] = useState(sePuedeInstalar());
  useEffect(() => alCambiarInstalable(() => setDisponible(sePuedeInstalar())), []);
  return (
    <section className="tarjeta">
      <h2>Usar SIGTA como aplicación</h2>
      <p style={{ marginTop: 10, color: 'var(--texto-2)', maxWidth: 900 }}>
        SIGTA es una aplicación web instalable (PWA): se instala en la PC, el celular o las colectoras de depósito, abre en su propia ventana
        con su ícono, sin barra del navegador, y se actualiza sola. Los datos siempre se leen del servidor.
      </p>
      {yaInstalada() ? <div className="aviso verde" style={{ marginTop: 14 }}><Icono n="checkCirculo" /><div><b>Ya la estás usando como aplicación</b></div></div>
        : disponible ? <button className="btn primario" style={{ marginTop: 14 }} onClick={() => instalar()}><Icono n="descargar" /> Instalar SIGTA</button>
          : (
            <ul className="lista-pronto" style={{ marginTop: 12 }}>
              {esIphone() ? <li><b>iPhone o iPad:</b> en Safari, tocá <b>Compartir</b> y después <b>Agregar a inicio</b>.</li> : <>
                <li><b>PC (Chrome o Edge):</b> en la barra de direcciones, tocá el ícono de <b>Instalar</b> (una pantalla con una flecha).</li>
                <li><b>Android (Chrome):</b> menú <b>⋮</b> → <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.</li>
                <li><b>iPhone o iPad:</b> en Safari, <b>Compartir</b> → <b>Agregar a inicio</b>.</li>
              </>}
            </ul>
          )}
    </section>
  );
}
