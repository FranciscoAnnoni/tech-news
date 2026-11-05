"use client";

import { catchError, type ErrorInfo } from "next/error";
import estilos from "./NoticiaNoDisponible.module.css";

/**
 * Si Blob falla al bajar las noticias, la portada ya mandó el loading y el error llega dentro del stream: sin este
 * boundary, Next lo muestra como "This page couldn't load" (React #441). Reintentar vuelve a pedir solo la portada.
 */
function PortadaNoDisponible(_props: object, { retry }: ErrorInfo) {
  return (
    <main className={estilos.pantalla} role="alert">
      <p className={estilos.marca}>INFOMATE</p>
      <h1>No pudimos traer las noticias</h1>
      <p>Puede ser un problema momentáneo. Probá de nuevo en unos segundos.</p>
      <button type="button" className={estilos.boton} onClick={() => retry()}>
        Reintentar
      </button>
    </main>
  );
}

export const ErrorPortada = catchError(PortadaNoDisponible);
