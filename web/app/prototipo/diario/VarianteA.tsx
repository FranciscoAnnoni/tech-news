// PROTOTIPO — Variante A: "Sábana clásica". Gran cabecera, grilla de columnas con filetes, nota principal a lo ancho.
import type { CSSProperties } from "react";
import type { TarjetaNoticia } from "@/lib/tipos";
import { hora, porSeccion, SECCION, SECCIONES, type DatosPortada } from "./comun";
import e from "./VarianteA.module.css";

function Volanta({ t }: { t: TarjetaNoticia }) {
  return (
    <div className={e.volanta}>
      <span className={e.seccion}>{SECCION[t.categoria]}</span>
      <span className={e.sello} style={{ "--tono": t.tono } as CSSProperties}>{t.letras}</span>
      <span>{t.fuente} · {hora(t.fecha)}</span>
    </div>
  );
}

function Nota({ t, tamano }: { t: TarjetaNoticia; tamano: "principal" | "segunda" | "columna" }) {
  return (
    <article className={`${e.nota} ${e[tamano]}`}>
      <Volanta t={t} />
      <h2 className={e.titulo}>
        <a href={t.link} target="_blank" rel="noreferrer">{t.titulo}</a>
      </h2>
      {t.descripcion && <p className={e.bajada}>{t.descripcion}</p>}
    </article>
  );
}

export function VarianteA({ tarjetas, fecha, edicion }: DatosPortada) {
  const [principal, ...resto] = tarjetas;
  const segundas = resto.slice(0, 2);
  const columnas = resto.slice(2, 6);
  const usadas = new Set([principal, ...segundas, ...columnas].map((t) => t?.id));
  const restantes = tarjetas.filter((t) => !usadas.has(t.id));

  return (
    <div className={e.hoja}>
      <div className={e.pagina}>
        <header className={e.cabecera}>
          <div className={e.franja}>
            <span className={e.capital}>{fecha}</span>
            <span>Edición Nº {edicion} · Buenos Aires</span>
            <span>{tarjetas.length} noticias · Gratis</span>
          </div>
          <h1 className={e.nombre}>Infomate</h1>
          <p className={e.lema}>Lo que pasó hoy en Argentina, el mundo y la tecnología — en pocas líneas.</p>
          <nav className={e.indice}>
            {SECCIONES.map((c) => (
              <span key={c}>{SECCION[c]} <b>{porSeccion(tarjetas, c).length}</b></span>
            ))}
          </nav>
        </header>

        {principal && (
          <section className={e.arriba}>
            <Nota t={principal} tamano="principal" />
            <div className={e.costado}>
              {segundas.map((t) => <Nota key={t.id} t={t} tamano="segunda" />)}
            </div>
          </section>
        )}

        <section className={e.fila}>
          {columnas.map((t) => <Nota key={t.id} t={t} tamano="columna" />)}
        </section>

        {restantes.length > 0 && (
          <section className={e.secciones}>
            {SECCIONES.map((c) => (
              <div key={c} className={e.bloque}>
                <h3 className={e.tituloSeccion}>{SECCION[c]}</h3>
                <ul>
                  {porSeccion(restantes, c).map((t) => (
                    <li key={t.id}>
                      <a href={t.link} target="_blank" rel="noreferrer">{t.titulo}</a>
                      <span>{t.fuente}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <footer className={e.pie}>Infomate · Edición Nº {edicion} · {fecha}</footer>
      </div>
    </div>
  );
}
