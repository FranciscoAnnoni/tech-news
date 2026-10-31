import type { ReactNode } from "react";
import type { Plataforma } from "@/lib/plataforma";
import type { NombreDibujo } from "./DibujosGuia";

export interface PasoGuia {
  dibujo: NombreDibujo;
  texto: ReactNode;
}

export interface ContenidoGuia {
  titulo: string;
  intro: string;
  pasos: PasoGuia[];
  nota: string;
  copiar: boolean;
}

const AVISO_TIENDA =
  "No hay nada para bajar de una tienda: se instala desde el navegador y queda como una app en tu pantalla de inicio.";

// Rótulos revisados en Apple, Google, MDN y web.dev (31/10/2026). Cambian según la versión.
export const CONTENIDO_GUIA: Record<Plataforma, ContenidoGuia> = {
  ios: {
    titulo: "Agregala a tu pantalla de inicio",
    intro: `${AVISO_TIENDA} En iPhone y iPad se hace a mano, en tres pasos.`,
    pasos: [
      {
        dibujo: "iosCompartir",
        texto: (
          <>
            Tocá <b>Compartir</b>, el cuadrado con una flecha hacia arriba. En Chrome está junto a la barra de direcciones.
            En Safari suele estar abajo, o dentro del menú <b>···</b>.
          </>
        ),
      },
      {
        dibujo: "iosLista",
        texto: (
          <>
            Bajá por la lista y tocá <b>Agregar a Inicio</b>. En Chrome puede decir <b>Agregar a la pantalla principal</b>.
            Si no la ves, buscá al final de la lista la opción para editar acciones.
          </>
        ),
      },
      {
        dibujo: "iosConfirmar",
        texto: (
          <>
            Si aparece la opción de abrir como app web, dejala activada. Tocá <b>Agregar</b>.
          </>
        ),
      },
    ],
    nota: "Si tu navegador no ofrece esa opción, abrí esta página en Safari. Los nombres pueden variar según la versión.",
    copiar: false,
  },
  android: {
    titulo: "Instalala en tu celular",
    intro: AVISO_TIENDA,
    pasos: [
      {
        dibujo: "androidMenu",
        texto: (
          <>
            Abrí el menú del navegador. En Chrome es <b>Más</b>, los tres puntos a la derecha de la barra de direcciones.
          </>
        ),
      },
      {
        dibujo: "androidLista",
        texto: (
          <>
            Elegí <b>Instalar y crear acceso directo</b>. Según el navegador y la versión también puede decir{" "}
            <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.
          </>
        ),
      },
      {
        dibujo: "androidConfirmar",
        texto: (
          <>
            Confirmá con <b>Instalar</b> y seguí los pasos en pantalla.
          </>
        ),
      },
    ],
    nota: "En algunos navegadores queda como acceso directo y se abre dentro del navegador.",
    copiar: false,
  },
  escritorio: {
    titulo: "Instalala en la compu o usala en el celular",
    intro: `${AVISO_TIENDA} Está pensada para el celular: lo mejor es abrirla ahí.`,
    pasos: [
      {
        dibujo: "escritorioBarra",
        texto: (
          <>
            En Chrome o Edge, buscá el ícono de <b>instalar</b> en la barra de direcciones.
          </>
        ),
      },
      {
        dibujo: "escritorioMenu",
        texto: (
          <>
            Si no aparece, en Chrome andá a <b>Más</b> › <b>Transmitir, guardar y compartir</b> ›{" "}
            <b>Instalar página como app</b>. En Safari para Mac: <b>Archivo</b> › <b>Agregar al Dock</b>.
          </>
        ),
      },
      {
        dibujo: "escritorioCelular",
        texto: (
          <>
            Para tenerla en el celular, abrí esta misma dirección ahí y tocá <b>Descargar</b>.
          </>
        ),
      },
    ],
    nota: "Firefox para computadora no instala este tipo de apps.",
    copiar: true,
  },
  inapp: {
    titulo: "Primero abrila en tu navegador",
    intro:
      "Desde el navegador interno de esta app no se puede instalar. Abrí la página en Safari o Chrome: desde ahí se instala, sin pasar por ninguna tienda.",
    pasos: [
      {
        dibujo: "inappMenu",
        texto: (
          <>
            Buscá el menú de la app, casi siempre arriba: <b>···</b>, <b>⋮</b> o el ícono de compartir.
          </>
        ),
      },
      {
        dibujo: "inappLista",
        texto: (
          <>
            Elegí la opción para abrir afuera, como <b>Abrir en el navegador</b>, <b>Abrir en Safari</b> o{" "}
            <b>Abrir en Chrome</b>. El texto cambia según la app.
          </>
        ),
      },
      {
        dibujo: "inappPegar",
        texto: (
          <>
            Si no hay esa opción, copiá el enlace y pegalo en Safari o Chrome. Después tocá <b>Descargar</b> otra vez.
          </>
        ),
      },
    ],
    nota: "",
    copiar: true,
  },
};
