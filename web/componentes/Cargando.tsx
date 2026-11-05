import type { CSSProperties } from "react";
import { CATEGORIAS, type Categoria } from "@/lib/tipos";
import estilos from "./Cargando.module.css";

const TONO: Record<Categoria, string> = {
  ARG: "var(--pastel-arg)",
  Global: "var(--pastel-global)",
  Tech: "var(--pastel-tech)",
};

/**
 * Pantalla de carga de la portada, mientras el servidor baja las noticias: un mazo chico que se mezcla.
 * Solo HTML y CSS, sin estado ni efectos: llega en el primer pedazo del HTML y se ve antes de que cargue el JS.
 * La de arriba es crema con skeleton; las de atrás, lisas en el pastel de cada categoría.
 */
export function Cargando({ numero }: { numero: number | null }) {
  return (
    <div className={estilos.pantalla} role="status">
      <div className={estilos.mazo} aria-hidden="true">
        {CATEGORIAS.map((categoria, i) => (
          <div key={categoria} className={estilos.carta} style={{ "--i": i, "--tono": TONO[categoria] } as CSSProperties}>
            <span className={estilos.origen}>
              <i className={estilos.monograma} />
              <i className={estilos.fuente} />
            </span>
            <span className={estilos.titular} />
            <span className={`${estilos.titular} ${estilos.corta}`} />
            <span className={estilos.renglon} />
            <span className={estilos.renglon} />
            <span className={`${estilos.renglon} ${estilos.corta}`} />
          </div>
        ))}
      </div>
      <p className={estilos.marca}>INFOMATE</p>
      <p className={estilos.edicion}>{numero ? `Edición Nº ${numero}` : "Edición de hoy"}</p>
      <span className={estilos.oculto}>Cargando las noticias…</span>
    </div>
  );
}
