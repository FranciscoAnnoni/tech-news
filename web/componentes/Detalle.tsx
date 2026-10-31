import type { CSSProperties, ReactNode } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import estilos from "./Detalle.module.css";

/**
 * "capa": sobre el Mazo, con animación y rol de diálogo.
 * "pagina": la página pública de una Noticia, sin nada que cerrar.
 */
export type VarianteDetalle = "capa" | "pagina";

/**
 * `cierre` es la acción que sale del Detalle: "Volver y seguir" en el Mazo,
 * "Ver las noticias de hoy" en la página pública. Sin lógica propia: quien lo usa la aporta.
 * `compartir` es el hueco del ícono de compartir, al lado de "Leer en {fuente}".
 */
export function Detalle({
  tarjeta,
  variante,
  cierre,
  compartir,
}: {
  tarjeta: TarjetaNoticia;
  variante: VarianteDetalle;
  cierre: ReactNode;
  compartir?: ReactNode;
}) {
  const esCapa = variante === "capa";
  const Raiz = esCapa ? "section" : "article";
  return (
    <Raiz
      className={`${estilos.detalle} ${esCapa ? estilos.capa : ""}`}
      {...(esCapa ? { role: "dialog", "aria-label": "Detalle de la nota" } : {})}
      data-prueba="detalle"
    >
      <div className={estilos.cuerpo}>
        {!esCapa && <p className={estilos.marca}>INFOMATE</p>}
        <p className={estilos.origen}>
          <b style={{ "--tono": tarjeta.tono } as CSSProperties}>{tarjeta.letras}</b> {tarjeta.categoria} · {tarjeta.fuente}
        </p>
        <h1>{tarjeta.titulo}</h1>
        {tarjeta.descripcion && <p className={estilos.descripcion}>{tarjeta.descripcion}</p>}
        <p className={estilos.fecha}>{tarjeta.fecha}</p>
        {tarjeta.contenido && <p className={estilos.contenido} data-prueba="contenido">{tarjeta.contenido}</p>}
        <div className={estilos.acciones}>
          <div className={estilos.fila}>
            <a className={`${estilos.boton} ${estilos.principal}`} href={tarjeta.link} target="_blank" rel="noopener noreferrer">
              Leer en {tarjeta.fuente}
            </a>
            {compartir}
          </div>
          {cierre}
        </div>
      </div>
    </Raiz>
  );
}
