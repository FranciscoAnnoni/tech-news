"use client";

// PROTOTIPO — tirar cuando se elijan las variantes. Vive solo en la rama prototype/donacion-variantes.
// Pregunta: ¿cómo mostramos el pedido de aporte de $2.000? Cinco variantes para la tarjeta del Mazo (teléfono) y cinco
// para el recuadro del Diario (web), sobre la portada real. Se eligen con `?variant=1..5` y la barra de abajo.
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { MONTO_SUGERIDO, URL_MERCADO_PAGO } from "@/lib/donacion";
import p from "./PrototipoDonacion.module.css";

export const VARIANTES_MAZO = ["Ticket", "Números", "Carta", "Mate", "Pregunta"];
export const VARIANTES_DIARIO = ["Clasificado", "Faja", "Editorial", "Cupón", "Esquina"];

/** "1".."5" o null (sin variante: lo que está en producción). */
export function useVariante(): number | null {
  const v = Number(useSearchParams().get("variant"));
  return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
}

type Acciones = {
  /** Props del link a Mercado Pago (href, onClick, tabIndex) que ya maneja la tarjeta real. */
  aportar: (texto: ReactNode, clase: string) => ReactNode;
  /** Botón de seguir leyendo / cerrar. */
  ahoraNo: (texto: ReactNode, clase: string) => ReactNode;
};

/* ---------------------------------------------------------------- Mazo (teléfono) */

export function claseMazo(v: number): string {
  return [p.mTicket, p.mNumeros, p.mCarta, p.mMate, p.mPregunta][v - 1];
}

export function CuerpoMazo({ v, aportar, ahoraNo }: { v: number } & Acciones) {
  if (v === 1) return (
    <div className={p.ticket}>
      <p className={p.ticketCabeza}>INFOMATE<br />TICKET DE APOYO</p>
      <p className={p.ticketRaya}>- - - - - - - - - - - - - - - - - - -</p>
      <ul className={p.ticketItems}>
        <li><span>Noticias del día</span><span>15</span></li>
        <li><span>Resúmenes cortos</span><span>✓</span></li>
        <li><span>Servidores del mes</span><span>✓</span></li>
        <li><span>Un mate para el equipo</span><span>✓</span></li>
      </ul>
      <p className={p.ticketRaya}>- - - - - - - - - - - - - - - - - - -</p>
      <p className={p.ticketTotal}><span>TOTAL</span><span>{MONTO_SUGERIDO}</span></p>
      <div className={p.acciones}>
        {aportar("Pagar con Mercado Pago", p.botonTinta)}
        {ahoraNo("Ahora no", p.linkChico)}
      </div>
      <p className={p.ticketGracias}>¡GRACIAS POR LEER!</p>
    </div>
  );
  if (v === 2) return (
    <div className={p.numeros}>
      <p className={p.etiquetaClara}>INFOMATE EN NÚMEROS</p>
      <dl className={p.grillaNumeros}>
        <div><dt>15</dt><dd>noticias por día</dd></div>
        <div><dt>2</dt><dd>personas haciéndolo</dd></div>
        <div><dt>3</dt><dd>secciones: país, mundo y tecnología</dd></div>
        <div><dt>{MONTO_SUGERIDO}</dt><dd>tu aporte para que sigamos</dd></div>
      </dl>
      <div className={p.acciones}>
        {aportar(`Aportar ${MONTO_SUGERIDO}`, p.botonAmarillo)}
        {ahoraNo("Ahora no", p.linkClaro)}
      </div>
    </div>
  );
  if (v === 3) return (
    <div className={p.carta}>
      <p className={p.cartaSaludo}>Hola,</p>
      <p className={p.cartaTexto}>
        hacemos Infomate a pulmón para que puedas enterarte de lo importante del día en pocos minutos.
      </p>
      <p className={p.cartaTexto}>
        Si te está sirviendo, con {MONTO_SUGERIDO} por Mercado Pago nos ayudás a pagar los servidores y a seguir.
      </p>
      <p className={p.cartaFirma}>Fran y Santi</p>
      <div className={p.acciones}>
        {aportar(`Bancar con ${MONTO_SUGERIDO} →`, p.botonTinta)}
        {ahoraNo("Seguir leyendo", p.linkChico)}
      </div>
    </div>
  );
  if (v === 4) return (
    <div className={p.mate}>
      <span className={p.mateIcono} aria-hidden="true">🧉</span>
      <h2 className={p.mateTitulo}>¿Nos invitás un mate?</h2>
      <p className={p.mateTexto}>{MONTO_SUGERIDO} por Mercado Pago. Con eso pagamos los servidores.</p>
      <div className={p.acciones}>
        {aportar(`Invitar un mate · ${MONTO_SUGERIDO}`, p.botonTinta)}
        {ahoraNo("Hoy no", p.linkChico)}
      </div>
    </div>
  );
  return (
    <div className={p.pregunta}>
      <p className={p.etiquetaOscura}>UNA PREGUNTA</p>
      <h2 className={p.preguntaTitulo}>¿Te está sirviendo Infomate?</h2>
      <p className={p.preguntaTexto}>Lo hacemos dos personas. Si te sirve, podés bancarnos con {MONTO_SUGERIDO}.</p>
      <div className={p.preguntaBotones}>
        {aportar(<>Sí, quiero aportar<br /><b>{MONTO_SUGERIDO}</b></>, p.opcionSi)}
        {ahoraNo(<>Ahora no,<br /><b>seguir leyendo</b></>, p.opcionNo)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Diario (web) */

const LINK_VISIBLE = URL_MERCADO_PAGO.replace(/^https:\/\//, "");

export function AvisoDiarioPrototipo({ v, aportar, ahoraNo }: { v: number } & Acciones) {
  const cerrar = ahoraNo("✕", p.cerrar);
  if (v === 1) return (
    <aside className={p.clasificado} aria-label="Apoyá a Infomate">
      {cerrar}
      <p className={p.clasificadoRubro}>Avisos clasificados · Apoyo</p>
      <p className={p.clasificadoTexto}>
        <b>INFOMATE</b> busca lectores que banquen. Dos personas, a pulmón, quince noticias por día. Aporte sugerido{" "}
        <b>{MONTO_SUGERIDO}</b>. Por Mercado Pago: {aportar(LINK_VISIBLE, p.clasificadoLink)}
      </p>
    </aside>
  );
  if (v === 2) return (
    <aside className={p.faja} aria-label="Apoyá a Infomate">
      <span className={p.fajaTexto}>Infomate se hace a pulmón · Si te sirve, bancanos con {MONTO_SUGERIDO}</span>
      {aportar("Aportar →", p.fajaBoton)}
      {ahoraNo("✕", p.fajaCerrar)}
    </aside>
  );
  if (v === 3) return (
    <aside className={p.editorial} aria-label="Apoyá a Infomate">
      {cerrar}
      <p className={p.editorialSeccion}>Carta de los editores</p>
      <h2 className={p.editorialTitulo}>Por qué te pedimos {MONTO_SUGERIDO}</h2>
      <div className={p.editorialColumnas}>
        <p>
          Infomate nació para que puedas leer lo importante del día en pocos minutos: Argentina, el mundo y la tecnología,
          en tarjetas cortas y sin vueltas. Lo hacemos dos personas, a pulmón, todos los días.
        </p>
        <p>
          Mantenerlo tiene costos: servidores, el resumen de cada nota y el tiempo que le dedicamos. Si te sirve, un aporte
          de {MONTO_SUGERIDO} por Mercado Pago nos ayuda a seguir. Gracias por leernos.
        </p>
      </div>
      <div className={p.editorialPie}>
        <span className={p.editorialFirma}>— Fran y Santi</span>
        {aportar(`Aportar ${MONTO_SUGERIDO} con Mercado Pago →`, p.botonTintaDiario)}
      </div>
    </aside>
  );
  if (v === 4) return (
    <aside className={p.cupon} aria-label="Apoyá a Infomate">
      <span className={p.cuponTijera} aria-hidden="true">✂</span>
      {cerrar}
      <div className={p.cuponVale}>
        <b>{MONTO_SUGERIDO}</b>
        <span>de apoyo</span>
      </div>
      <div className={p.cuponTexto}>
        <p className={p.cuponTitulo}>Recortá y bancá a Infomate</p>
        <p>Dos personas, a pulmón, todos los días. Tu aporte paga los servidores.</p>
      </div>
      {aportar("APOYAR", `${p.botonTintaDiario} ${p.cuponLink}`)}
    </aside>
  );
  return (
    <aside className={p.esquina} aria-label="Apoyá a Infomate">
      {cerrar}
      <p className={p.esquinaTitulo}>🧉 ¿Te sirve Infomate?</p>
      <p className={p.esquinaTexto}>Bancanos con {MONTO_SUGERIDO} por Mercado Pago. Lo hacemos dos personas a pulmón.</p>
      {aportar(`Aportar ${MONTO_SUGERIDO} →`, p.botonTintaDiario)}
    </aside>
  );
}
