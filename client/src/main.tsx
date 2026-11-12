import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './estilos.css';
import { App } from './App';
import { ProveedorSesion } from './contexto/Sesion';
import { ProveedorDialogos } from './contexto/Dialogos';
import { ProveedorTema } from './contexto/Tema';
import { prepararApp } from './lib/instalar';

prepararApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorTema>
        <ProveedorDialogos>
          <ProveedorSesion>
            <App />
          </ProveedorSesion>
        </ProveedorDialogos>
      </ProveedorTema>
    </BrowserRouter>
  </StrictMode>,
);
