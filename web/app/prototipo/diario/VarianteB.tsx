// PROTOTIPO — Variante B: "Tabloide Infomate". Una tapa dominante, columna negra "En breve", secciones en pastel.
// Es la que más conserva el estilo actual: amarillo, bordes gruesos, sombras duras, tipografía sans/mono.
import type { CSSProperties } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import { hora, porSeccion, SECCION, SECCIONES, type DatosPortada } from "./comun";
import e from "./VarianteB.module.css";

function Origen({ t }: { t: TarjetaNoticia }) {
  return (
    <div className={e.origen}>
      <span className={e.monograma} style={{ "--tono": t.tono } as CSSProperties}>{t.letras}</span>
      <span className={e.fuente}>{t.fuente}</span>
      <span className={e.categoria}>{t.categoria}</span>
    </div>
  );
}

export function VarianteB({ tarjetas, fecha, edicion }: DatosPortada) {
  const [tapa, ...resto] = tarjetas;
  const breves = resto.slice(0, 6);
  const usadas = new Set([tapa, ...breves].map((t) => t?.id));
  const restantes = tarjetas.filter((t) => !usadas.has(t.id));
  const fuentes = [...new Set(tarjetas.map((t) => t.fuente))];

  return (
    <div className={e.hoja}>
      <header className={e.cabecera}>
        <h1 className={e.nombre}>INFOMATE</h1>
        <div className={e.datos}>
          <span>{fecha}</span>
          <span>EDICIÓN Nº {edicion}</span>
          <span className={e.cuenta}>¡HOY {tarjetas.length} NOTICIAS!</span>
        </div>
      </header>
      <div className={e.cinta}>
        <b>FUENTES DE HOY</b>
        {fuentes.map((f) => <span key={f}>{f}</span>)}
      </div>

      <main className={e.cuerpo}>
        {tapa && (
          <article className={e.tapa}>
            <div className={e.selloTapa}>TAPA</div>
            <Origen t={tapa} />
            <h2 className={e.tituloTapa}>{tapa.titulo}</h2>
            {tapa.descripcion && <p className={e.bajadaTapa}>{tapa.descripcion}</p>}
            <div className={e.pieTapa}>
              <span>{tapa.fecha}</span>
              <a className={e.boton} href={tapa.link} target="_blank" rel="noreferrer">LEER EN {tapa.fuente.toUpperCase()} →</a>
            </div>
          </article>
        )}

        <aside className={e.breves}>
          <h3>EN BREVE</h3>
          <ol>
            {breves.map((t, i) => (
              <li key={t.id}>
                <span className={e.numero}>{i + 1}</span>
                <a href={t.link} target="_blank" rel="noreferrer">
                  <small>{t.categoria} · {t.fuente} · {hora(t.fecha)}</small>
                  {t.titulo}
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </main>

      <section className={e.secciones}>
        {SECCIONES.map((c) => (
          <div key={c} className={e.seccion} data-categoria={c}>
            <h3><span>{SECCION[c]}</span></h3>
            {porSeccion(restantes, c).map((t) => (
              <a key={t.id} className={e.mini} href={t.link} target="_blank" rel="noreferrer">
                <Origen t={t} />
                <strong>{t.titulo}</strong>
                {t.descripcion && <p>{t.descripcion}</p>}
              </a>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
