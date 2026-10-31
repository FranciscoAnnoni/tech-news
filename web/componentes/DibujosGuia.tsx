import type { ReactNode } from "react";
import estilos from "./Guia.module.css";

// Dibujos orientativos: no copian ninguna versión exacta. Lienzo cuadrado para que crezcan con el espacio libre.

function Pantalla({ x = 2, w = 236 }: { x?: number; w?: number }) {
  return <rect x={x} y={2} width={w} height={236} rx={14} fill="#fff" stroke="#111" strokeWidth={2.5} />;
}

function Lineas({ x, y, w, n = 3 }: { x: number; y: number; w: number; n?: number }) {
  return Array.from({ length: n }, (_, i) => (
    <rect key={i} x={x} y={y + i * 15} width={i === n - 1 ? w * 0.6 : w} height={7} rx={3.5} fill="#d9d9d9" />
  ));
}

function Texto({ x, y, fuerte, children }: { x: number; y: number; fuerte?: boolean; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={13} fill="#111" fontWeight={fuerte ? 700 : 400}>
      {children}
    </text>
  );
}

function Foco({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect className={estilos.foco} x={x} y={y} width={w} height={h} rx={9} fill="none" stroke="#d61f4f" strokeWidth={3} />;
}

function Compartir({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="#111" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x + 3} ${y + 7}h-3v11h14v-11h-3`} />
      <path d={`M${x + 7} ${y + 12}V${y}M${x + 3} ${y + 4}l4-4 4 4`} />
    </g>
  );
}

function Barra({ x, y, w }: { x: number; y: number; w: number }) {
  return <rect x={x} y={y} width={w} height={24} rx={12} fill="#efefef" />;
}

function Fila({ y, marcada, children }: { y: number; marcada?: boolean; children: ReactNode }) {
  return (
    <>
      <Texto x={22} y={y} fuerte={marcada}>{children}</Texto>
      <line x1={14} y1={y + 16} x2={226} y2={y + 16} stroke="#e3e3e3" />
      {marcada && <Foco x={12} y={y - 20} w={216} h={31} />}
    </>
  );
}

function TresPuntos({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#111">
      <circle cx={x} cy={y} r={2.2} />
      <circle cx={x} cy={y + 8} r={2.2} />
      <circle cx={x} cy={y + 16} r={2.2} />
    </g>
  );
}

const DIBUJOS = {
  iosCompartir: {
    etiqueta: "Botón Compartir en Safari, abajo, y en Chrome, junto a la barra de direcciones",
    dibujo: (
      <>
        <Pantalla w={114} />
        <Texto x={42} y={26} fuerte>Safari</Texto>
        <Lineas x={14} y={42} w={90} />
        <Barra x={12} y={166} w={94} />
        <Compartir x={52} y={198} />
        <Foco x={44} y={192} w={30} h={30} />
        <Pantalla x={124} w={114} />
        <Texto x={161} y={26} fuerte>Chrome</Texto>
        <Barra x={132} y={36} w={68} />
        <Compartir x={208} y={38} />
        <Foco x={200} y={33} w={30} h={30} />
        <Lineas x={136} y={78} w={90} />
      </>
    ),
  },
  iosLista: {
    etiqueta: "Lista de Compartir con la opción Agregar a Inicio",
    dibujo: (
      <>
        <Pantalla />
        <Fila y={44}>Copiar</Fila>
        <Fila y={92}>Agregar a favoritos</Fila>
        <Fila y={140} marcada>Agregar a Inicio</Fila>
        <Fila y={188}>Buscar en la página</Fila>
      </>
    ),
  },
  iosConfirmar: {
    etiqueta: "Pantalla de confirmación con el botón Agregar",
    dibujo: (
      <>
        <Pantalla />
        <Texto x={18} y={34}>Cancelar</Texto>
        <Texto x={170} y={34} fuerte>Agregar</Texto>
        <Foco x={160} y={15} w={68} h={29} />
        <rect x={28} y={76} width={64} height={64} rx={13} fill="#f4c93c" stroke="#111" strokeWidth={2} />
        <Texto x={106} y={102} fuerte>Mazo</Texto>
        <Texto x={106} y={122}>Va a la pantalla</Texto>
        <Texto x={106} y={140}>de inicio</Texto>
      </>
    ),
  },
  androidMenu: {
    etiqueta: "Menú de tres puntos a la derecha de la barra de direcciones",
    dibujo: (
      <>
        <Pantalla />
        <Barra x={14} y={20} w={174} />
        <TresPuntos x={212} y={24} />
        <Foco x={196} y={16} w={32} h={33} />
        <Lineas x={22} y={78} w={196} n={5} />
      </>
    ),
  },
  androidLista: {
    etiqueta: "Menú del navegador con la opción para instalar",
    dibujo: (
      <>
        <Pantalla />
        <Fila y={44}>Nueva pestaña</Fila>
        <Fila y={92}>Historial</Fila>
        <Fila y={140} marcada>Instalar y crear acceso directo</Fila>
        <Fila y={188}>Configuración</Fila>
      </>
    ),
  },
  androidConfirmar: {
    etiqueta: "Diálogo de confirmación con el botón Instalar",
    dibujo: (
      <>
        <Pantalla />
        <rect x={22} y={56} width={196} height={128} rx={12} fill="#f6f6f6" stroke="#111" strokeWidth={1.5} />
        <Texto x={38} y={86} fuerte>Instalar app</Texto>
        <Texto x={38} y={110}>Mazo</Texto>
        <Texto x={88} y={160}>Cancelar</Texto>
        <Texto x={156} y={160} fuerte>Instalar</Texto>
        <Foco x={146} y={141} w={64} h={29} />
      </>
    ),
  },
  escritorioBarra: {
    etiqueta: "Ícono de instalar en la barra de direcciones de la computadora",
    dibujo: (
      <>
        <Pantalla />
        <circle cx={18} cy={32} r={4} fill="#d9d9d9" />
        <circle cx={31} cy={32} r={4} fill="#d9d9d9" />
        <Barra x={42} y={20} w={186} />
        <path d="M208 25v12m-5-4 5 5 5-5" fill="none" stroke="#111" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Foco x={192} y={16} w={32} h={32} />
        <Lineas x={22} y={78} w={196} n={5} />
      </>
    ),
  },
  escritorioMenu: {
    etiqueta: "Menú con Transmitir, guardar y compartir e Instalar página como app",
    dibujo: (
      <>
        <Pantalla />
        <Fila y={44}>Transmitir, guardar y compartir ›</Fila>
        <Fila y={92} marcada>Instalar página como app…</Fila>
        <Lineas x={22} y={136} w={196} n={4} />
      </>
    ),
  },
  escritorioCelular: {
    etiqueta: "Celular con el mazo abierto",
    dibujo: (
      <>
        <rect x={62} y={2} width={116} height={236} rx={16} fill="#fff" stroke="#111" strokeWidth={2.5} />
        <rect x={78} y={32} width={84} height={154} fill="#f4c93c" stroke="#111" strokeWidth={2} />
        <Lineas x={88} y={56} w={64} />
      </>
    ),
  },
  inappMenu: {
    etiqueta: "Menú de la app, arriba de todo",
    dibujo: (
      <>
        <Pantalla />
        <Texto x={18} y={36}>✕</Texto>
        <Texto x={82} y={36}>Página web</Texto>
        <g fill="#111">
          <circle cx={198} cy={32} r={2.2} />
          <circle cx={207} cy={32} r={2.2} />
          <circle cx={216} cy={32} r={2.2} />
        </g>
        <Foco x={186} y={16} w={42} h={32} />
        <Lineas x={22} y={78} w={196} n={5} />
      </>
    ),
  },
  inappLista: {
    etiqueta: "Opción para abrir en el navegador",
    dibujo: (
      <>
        <Pantalla />
        <Fila y={44}>Copiar enlace</Fila>
        <Fila y={92} marcada>Abrir en el navegador</Fila>
        <Fila y={140}>Compartir</Fila>
        <Lineas x={22} y={182} w={196} n={2} />
      </>
    ),
  },
  inappPegar: {
    etiqueta: "Barra de direcciones de Safari o Chrome",
    dibujo: (
      <>
        <Pantalla />
        <Barra x={14} y={20} w={212} />
        <Texto x={28} y={37}>Pegá el enlace acá</Texto>
        <Foco x={10} y={15} w={220} h={34} />
        <Lineas x={22} y={78} w={196} n={5} />
      </>
    ),
  },
} satisfies Record<string, { etiqueta: string; dibujo: ReactNode }>;

export type NombreDibujo = keyof typeof DIBUJOS;

export function DibujoGuia({ nombre }: { nombre: NombreDibujo }) {
  const { etiqueta, dibujo } = DIBUJOS[nombre];
  return (
    <svg className={estilos.dibujo} viewBox="0 0 240 240" role="img" aria-label={etiqueta}>
      {dibujo}
    </svg>
  );
}
