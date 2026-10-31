import type { CSSProperties } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import estilos from "./Detalle.module.css";

export function Detalle({ tarjeta, alVolver }: { tarjeta: TarjetaNoticia; alVolver: () => void }) {
  return (
    <section className={estilos.detalle} role="dialog" aria-label="Detalle de la nota" data-prueba="detalle">
      <div className={estilos.cuerpo}>
        <p className={estilos.origen}>
          <b style={{ "--tono": tarjeta.tono } as CSSProperties}>{tarjeta.letras}</b> {tarjeta.categoria} · {tarjeta.fuente}
        </p>
        <h1>{tarjeta.titulo}</h1>
        {tarjeta.descripcion && <p className={estilos.descripcion}>{tarjeta.descripcion}</p>}
        <p className={estilos.fecha}>{tarjeta.fecha}</p>
        {tarjeta.contenido && <p className={estilos.contenido} data-prueba="contenido">{tarjeta.contenido}</p>}
        <div className={estilos.acciones}>
          <a className={`${estilos.boton} ${estilos.principal}`} href={tarjeta.link} target="_blank" rel="noopener noreferrer">
            Leer en {tarjeta.fuente}
          </a>
          <button className={estilos.boton} type="button" onClick={alVolver}>
            Volver y seguir
          </button>
        </div>
      </div>
    </section>
  );
}
