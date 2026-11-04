// PROTOTIPO — Variante C: "Papel digital". Hoja con textura, una sola columna angosta de lectura,
// encabezados tipo folio por sección y un sumario fijo al costado. Mínimo cromo.
import type { CSSProperties } from "react";
import { hora, porSeccion, SECCION, SECCIONES, type DatosPortada } from "./comun";
import e from "./VarianteC.module.css";

export function VarianteC({ tarjetas, fecha, edicion }: DatosPortada) {
  const orden = SECCIONES.flatMap((c) => porSeccion(tarjetas, c));
  return (
    <div className={e.hoja}>
      <div className={e.marco}>
        <aside className={e.sumario}>
          <div className={e.marca}>Infomate</div>
          <p className={e.meta}>Nº {edicion}<br />{fecha}</p>
          <ol>
            {SECCIONES.map((c, i) => (
              <li key={c}>
                <a href={`#${c}`}>
                  <span>{SECCION[c]}</span>
                  <i />
                  <span>p. {i + 1}</span>
                </a>
              </li>
            ))}
          </ol>
          <p className={e.meta}>{tarjetas.length} noticias · lectura aprox. {Math.ceil(tarjetas.length * 0.7)} min</p>
        </aside>

        <main className={e.columna}>
          <header className={e.cabecera}>
            <span className={e.folioArriba}>Edición Nº {edicion} — {fecha}</span>
            <h1><mark>Infomate</mark></h1>
            <p>Las noticias del día, para leer de un tirón.</p>
          </header>

          {SECCIONES.map((c, i) => (
            <section key={c} id={c} className={e.seccion}>
              <h2 className={e.folio}>
                <span>{i + 1}</span>
                <b>{SECCION[c]}</b>
                <span>p. {i + 1}</span>
              </h2>
              {porSeccion(tarjetas, c).map((t, j) => {
                const numero = orden.indexOf(t) + 1;
                return (
                  <article key={t.id} className={`${e.nota} ${j === 0 ? e.primera : ""}`}>
                    <span className={e.numero}>{String(numero).padStart(2, "0")}</span>
                    <div>
                      <div className={e.volanta}>
                        <span className={e.monograma} style={{ "--tono": t.tono } as CSSProperties}>{t.letras}</span>
                        {t.fuente} · {hora(t.fecha)}
                      </div>
                      <h3 className={e.titulo}>{t.titulo}</h3>
                      {t.descripcion && <p className={e.texto}>{t.descripcion}</p>}
                      <a className={e.seguir} href={t.link} target="_blank" rel="noreferrer">Seguir leyendo en {t.fuente} →</a>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}

          <footer className={e.fin}>— Fin de la edición —</footer>
        </main>
      </div>
    </div>
  );
}
