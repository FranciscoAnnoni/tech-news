import type { CSSProperties, ReactNode } from "react";
import { hastaUltimaOracion } from "@/lib/texto";
import { CATEGORIAS, type Categoria, type TarjetaNoticia } from "@/lib/tipos";
import estilos from "./Diario.module.css";

const SECCION: Record<Categoria, string> = { ARG: "Argentina", Global: "Mundo", Tech: "Tecnología" };

/** Cuántas notas van arriba junto a la principal y cuántas en la fila de columnas. */
const SEGUNDAS = 2;
const COLUMNAS = 4;

const hora = (fecha: string) => fecha.split(" ")[1] ?? fecha;

function Enlace({ tarjeta, children, className }: { tarjeta: TarjetaNoticia; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={tarjeta.link} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Volanta({ tarjeta }: { tarjeta: TarjetaNoticia }) {
  return (
    <div className={estilos.volanta}>
      <span className={estilos.seccion}>{SECCION[tarjeta.categoria]}</span>
      <span className={estilos.sello} style={{ "--tono": tarjeta.tono } as CSSProperties} aria-hidden="true">
        {tarjeta.letras}
      </span>
      <span>{tarjeta.fuente} · {hora(tarjeta.fecha)}</span>
    </div>
  );
}

function Principal({ tarjeta }: { tarjeta: TarjetaNoticia }) {
  const texto = tarjeta.contenido ? hastaUltimaOracion(tarjeta.contenido) : tarjeta.descripcion;
  return (
    <article className={`${estilos.nota} ${estilos.principal}`}>
      <Volanta tarjeta={tarjeta} />
      <h2 className={estilos.titulo}>
        <Enlace tarjeta={tarjeta}>{tarjeta.titulo}</Enlace>
      </h2>
      {tarjeta.contenido && tarjeta.descripcion && <p className={estilos.copete}>{tarjeta.descripcion}</p>}
      {texto && <p className={estilos.cuerpo}>{texto}</p>}
      <Enlace tarjeta={tarjeta} className={estilos.seguir}>Seguir leyendo en {tarjeta.fuente} →</Enlace>
    </article>
  );
}

function Nota({ tarjeta, tamano }: { tarjeta: TarjetaNoticia; tamano: "segunda" | "columna" }) {
  return (
    <article className={`${estilos.nota} ${estilos[tamano]}`}>
      <Volanta tarjeta={tarjeta} />
      <h3 className={estilos.titulo}>
        <Enlace tarjeta={tarjeta}>{tarjeta.titulo}</Enlace>
      </h3>
      {tarjeta.descripcion && <p className={estilos.bajada}>{tarjeta.descripcion}</p>}
    </article>
  );
}

/**
 * Portada con forma de diario de papel para todo lo que no es un teléfono (ver lib/portada.ts). Usa el mismo orden que el Mazo:
 * la primera tarjeta es la nota principal.
 */
export function Diario({ tarjetas, fecha, numero }: { tarjetas: TarjetaNoticia[]; fecha: string | null; numero: number | null }) {
  const edicion = numero ? `Edición Nº ${numero}` : "Edición de hoy";
  const [principal, ...resto] = tarjetas;
  const segundas = resto.slice(0, SEGUNDAS);
  const columnas = resto.slice(SEGUNDAS, SEGUNDAS + COLUMNAS);
  const restantes = resto.slice(SEGUNDAS + COLUMNAS);
  const secciones = CATEGORIAS.filter((c) => tarjetas.some((t) => t.categoria === c));

  return (
    <div className={estilos.diario}>
      <div className={estilos.hoja}>
        <header className={estilos.cabecera}>
          <div className={estilos.franja}>
            <span className={estilos.fecha}>{fecha}</span>
            <span>{edicion} · Buenos Aires</span>
            <span>{tarjetas.length} noticias</span>
          </div>
          <h1 className={estilos.nombre}>Infomate</h1>
          <p className={estilos.lema}>Lo que pasó hoy en Argentina, el mundo y la tecnología, en pocas líneas.</p>
          <nav className={estilos.indice} aria-label="Secciones">
            {secciones.map((c) => (
              <span key={c}>
                {SECCION[c]} <b>{tarjetas.filter((t) => t.categoria === c).length}</b>
              </span>
            ))}
          </nav>
        </header>

        {principal ? (
          <section className={estilos.arriba}>
            <Principal tarjeta={principal} />
            {segundas.length > 0 && (
              <div className={estilos.costado}>
                {segundas.map((t) => <Nota key={t.identificador} tarjeta={t} tamano="segunda" />)}
              </div>
            )}
          </section>
        ) : (
          <p className={estilos.vacio}>Todavía no hay noticias en esta edición.</p>
        )}

        {columnas.length > 0 && (
          <section className={estilos.fila}>
            {columnas.map((t) => <Nota key={t.identificador} tarjeta={t} tamano="columna" />)}
          </section>
        )}

        {restantes.length > 0 && (
          <section className={estilos.secciones}>
            {CATEGORIAS.map((c) => {
              const notas = restantes.filter((t) => t.categoria === c);
              if (notas.length === 0) return null;
              return (
                <div key={c} className={estilos.bloque}>
                  <h3 className={estilos.tituloSeccion}>{SECCION[c]}</h3>
                  <ul>
                    {notas.map((t) => (
                      <li key={t.identificador}>
                        <Enlace tarjeta={t}>{t.titulo}</Enlace>
                        <span>{t.fuente}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}

        <footer className={estilos.pie}>Infomate · {edicion}{fecha ? ` · ${fecha}` : ""}</footer>
      </div>
    </div>
  );
}
