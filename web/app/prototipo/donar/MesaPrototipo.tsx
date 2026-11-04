"use client";

// PROTOTIPO — mesa del Mazo con la tarjeta de donación arriba. Gesto copiado (simplificado) de Tarjeta.tsx.
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Tarjeta } from "@/componentes/Tarjeta";
import estilosMazo from "@/componentes/Mazo.module.css";
import type { TarjetaNoticia } from "@/lib/tipos";
import estilos from "./donar.module.css";

// La donación se mete después de la 6ª noticia para el prototipo (en la real es al azar entre 4ª y 10ª).
const POSICION = 6;
const UMBRAL = 100;

function ContenidoA({ alDonar }: { alDonar: () => void }) {
  return (
    <>
      <div className={estilos.origenA}>
        <span className={estilos.monogramaA}>IM</span>
        <span>Infomate</span>
        <span className={estilos.chipA}>Apoyo</span>
      </div>
      <div className={estilos.cuerpoA}>
        <h2 className={estilos.tituloA}>Si te están sirviendo las noticias, ayudanos a crecer.</h2>
        <p className={estilos.textoA}>
          Infomate es gratis y sin publicidad. Lo hacemos dos personas a pulmón. Con un matecito nos ayudás a pagar los
          servidores y a seguir mejorando la app.
        </p>
      </div>
      <BotonDonar alDonar={alDonar}>Invitanos un matecito</BotonDonar>
    </>
  );
}

function ContenidoB({ alDonar }: { alDonar: () => void }) {
  return (
    <div className={estilos.cartel}>
      <span className={estilos.mate} aria-hidden>🧉</span>
      <h2 className={estilos.tituloB}>
        AYUDANOS
        <br />A SEGUIR.
      </h2>
      <p className={estilos.textoB}>Infomate es gratis. Si te sirve, bancanos con un matecito.</p>
      <BotonDonar alDonar={alDonar} grande>
        DONAR →
      </BotonDonar>
      <p className={estilos.chicoB}>o deslizá a la izquierda para seguir leyendo</p>
    </div>
  );
}

function ContenidoC({ alDonar }: { alDonar: () => void }) {
  return (
    <div className={estilos.carta}>
      <p className={estilos.saludo}>Hola, gracias por leer.</p>
      <p className={estilos.textoC}>
        Armamos Infomate para enterarnos de lo importante sin perder la mañana. Lo mantenemos gratis y sin publicidad,
        pero los servidores y la IA que escribe los resúmenes cuestan.
      </p>
      <p className={estilos.textoC}>Si te está sirviendo, nos ayudás muchísimo con un matecito.</p>
      <p className={estilos.firma}>— Fran y Santi</p>
      <BotonDonar alDonar={alDonar}>Donar en Matecito</BotonDonar>
    </div>
  );
}

function BotonDonar({ alDonar, children, grande }: { alDonar: () => void; children: ReactNode; grande?: boolean }) {
  return (
    <button
      type="button"
      className={grande ? `${estilos.donar} ${estilos.donarGrande}` : estilos.donar}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={alDonar}
    >
      {children}
    </button>
  );
}

export function MesaPrototipo({ variante, tarjetas }: { variante: string; tarjetas: TarjetaNoticia[] }) {
  const [resultado, setResultado] = useState<string | null>(null);
  const [ronda, setRonda] = useState(0);
  const nodo = useRef<HTMLElement>(null);
  const selloDonar = useRef<HTMLDivElement>(null);
  const selloNo = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ id: number; x: number; y: number; modo: "h" | "v" | null } | null>(null);

  const n = tarjetas.length;
  const detras = tarjetas.slice(POSICION, POSICION + 2);

  function resolver(direccion: number, como: string) {
    if (!nodo.current) return;
    nodo.current.style.transition = "transform 240ms ease-in";
    nodo.current.style.transform = `translateX(${direccion * 135}%) rotate(${direccion * 20}deg)`;
    setTimeout(
      () =>
        setResultado(
          direccion > 0
            ? `${como} → se abriría Matecito en otra pestaña y el mazo sigue con la noticia ${POSICION + 1}.`
            : `Descartada → el mazo sigue con la noticia ${POSICION + 1}. Vuelve en 3 días.`,
        ),
      240,
    );
  }

  function reponer() {
    if (!nodo.current) return;
    nodo.current.style.transition = "transform .2s ease-out";
    nodo.current.style.transform = "";
    if (selloDonar.current) selloDonar.current.style.opacity = "0";
    if (selloNo.current) selloNo.current.style.opacity = "0";
  }

  function alMover(e: PointerEvent<HTMLElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId || !nodo.current) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.modo) {
      if (Math.hypot(dx, dy) < 8) return;
      g.modo = Math.abs(dx) > Math.abs(dy) * 1.2 ? "h" : "v";
      if (g.modo === "h") {
        e.currentTarget.setPointerCapture(g.id);
        nodo.current.style.transition = "none";
      }
    }
    if (g.modo !== "h") return;
    const p = String(Math.min(Math.abs(dx) / UMBRAL, 1));
    nodo.current.style.transform = `translateX(${dx}px) rotate(${dx / 16}deg)`;
    if (selloDonar.current) selloDonar.current.style.opacity = dx > 0 ? p : "0";
    if (selloNo.current) selloNo.current.style.opacity = dx < 0 ? p : "0";
  }

  function alSoltar(e: PointerEvent<HTMLElement>) {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    const dx = e.clientX - g.x;
    // Un toque en la tarjeta (fuera del botón) no dona: hay que tocar el botón o deslizar.
    if (g.modo !== "h") return;
    if (Math.abs(dx) >= UMBRAL) resolver(Math.sign(dx), "Deslizó a la derecha");
    else reponer();
  }

  const Contenido = variante === "B" ? ContenidoB : variante === "C" ? ContenidoC : ContenidoA;

  return (
    <div className={estilosMazo.mazo}>
      <header className={estilosMazo.cabecera}>
        <span>INFOMATE</span>
        <button className={estilosMazo.anterior} type="button">← Anterior</button>
        {/* La donación no cuenta: el contador sigue mostrando la última noticia vista. */}
        <span className={estilosMazo.cuenta}>
          {POSICION}/{n}
        </span>
      </header>

      <div className={estilosMazo.mesa}>
        {[...detras].reverse().map((t, k) => (
          <Tarjeta
            key={t.identificador}
            tarjeta={t}
            profundidad={detras.length - k}
            alMarcar={() => {}}
            alTerminar={() => {}}
            contextoCompartir={() => ({ identificador: t.identificador, categoria: t.categoria, fuente: t.fuente, recorrido_id: "", posicion: 0, cantidad_tarjetas: n, superficie: "tarjeta" })}
          />
        ))}
        {!resultado && (
          <article
            key={`${variante}-${ronda}`}
            ref={nodo}
            className={`${estilos.donacion} ${estilos["variante" + variante]}`}
            onPointerDown={(e) => {
              if (!gesto.current) gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, modo: null };
            }}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={() => {
              gesto.current = null;
              reponer();
            }}
          >
            <Contenido alDonar={() => resolver(1, "Tocó el botón")} />
            <div ref={selloDonar} className={`${estilos.sello} ${estilos.selloDonar}`}>DONAR</div>
            <div ref={selloNo} className={`${estilos.sello} ${estilos.selloNo}`}>AHORA NO</div>
          </article>
        )}
        {resultado && (
          <div className={estilos.resultado}>
            <p>{resultado}</p>
            <button type="button" onClick={() => { setResultado(null); setRonda((r) => r + 1); }}>
              Volver a mostrar
            </button>
          </div>
        )}
      </div>

      <footer className={estilosMazo.pista}>
        <span>← AHORA NO</span>
        <span>DONAR →</span>
      </footer>
    </div>
  );
}
