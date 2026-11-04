"use client";

// PROTOTIPO — barra flotante para cambiar de variante (`?variant=`). No se muestra en producción.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type CSSProperties } from "react";

export function PrototipoSelector({
  variantes,
  actual,
}: {
  variantes: { clave: string; nombre: string }[];
  actual: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const i = Math.max(0, variantes.findIndex((v) => v.clave === actual));

  function ir(paso: number) {
    const siguiente = variantes[(i + paso + variantes.length) % variantes.length];
    router.replace(`${ruta}?variant=${siguiente.clave}`, { scroll: false });
  }

  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      const foco = document.activeElement as HTMLElement | null;
      if (foco && (foco.matches("input, textarea, select") || foco.isContentEditable)) return;
      if (e.key === "ArrowLeft") ir(-1);
      if (e.key === "ArrowRight") ir(1);
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  });

  if (process.env.NODE_ENV === "production") return null;

  const boton: CSSProperties = {
    width: 34, height: 34, border: 0, borderRadius: 999, background: "#333", color: "#fff",
    font: "700 16px ui-monospace, Menlo, monospace", cursor: "pointer",
  };
  return (
    <div
      style={{
        position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 1000,
        display: "flex", alignItems: "center", gap: 10, padding: "6px 8px",
        borderRadius: 999, background: "#0b0bff", color: "#fff",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)", font: "700 13px ui-monospace, Menlo, monospace",
      }}
    >
      <button type="button" style={boton} onClick={() => ir(-1)} aria-label="Variante anterior">←</button>
      <span style={{ minWidth: 190, textAlign: "center" }}>
        PROTOTIPO · {variantes[i].clave} ({variantes[i].nombre})
      </span>
      <button type="button" style={boton} onClick={() => ir(1)} aria-label="Variante siguiente">→</button>
    </div>
  );
}
