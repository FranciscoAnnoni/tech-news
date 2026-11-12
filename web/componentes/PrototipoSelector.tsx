"use client";

// PROTOTIPO — barra flotante para cambiar de variante (`?variant=1..5`). La página no la monta en producción.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { seVeElDiario, suscribirDiario } from "@/lib/visibilidad";
import { VARIANTES_DIARIO, VARIANTES_MAZO } from "./PrototipoDonacion";

export function PrototipoSelector() {
  const ruta = usePathname();
  const parametros = useSearchParams();
  const diario = useSyncExternalStore(suscribirDiario, seVeElDiario, () => false);
  const nombres = diario ? VARIANTES_DIARIO : VARIANTES_MAZO;
  const actual = Number(parametros.get("variant"));
  const i = Number.isInteger(actual) && actual >= 1 && actual <= 5 ? actual - 1 : -1;

  function ir(paso: number) {
    const siguiente = i === -1 ? (paso > 0 ? 0 : 4) : (i + paso + 5) % 5;
    const nuevos = new URLSearchParams(parametros.toString());
    nuevos.set("variant", String(siguiente + 1));
    // Forzar el pedido en cada cambio: si ya se cerró, vuelve a aparecer al recargar.
    if (!nuevos.has("donacion")) nuevos.set("donacion", "1");
    window.location.assign(`${ruta}?${nuevos.toString()}`);
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

  const boton: CSSProperties = {
    width: 34, height: 34, border: 0, borderRadius: 999, background: "#333", color: "#fff",
    font: "700 16px ui-monospace, Menlo, monospace", cursor: "pointer",
  };
  return (
    <div
      style={{
        position: "fixed", left: "50%", bottom: 14, transform: "translateX(-50%)", zIndex: 1000,
        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
        borderRadius: 999, background: "#0b0bff", color: "#fff", whiteSpace: "nowrap",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)", font: "700 12px ui-monospace, Menlo, monospace",
      }}
    >
      <button type="button" style={boton} onClick={() => ir(-1)} aria-label="Variante anterior">←</button>
      <span style={{ minWidth: 170, textAlign: "center" }}>
        {diario ? "WEB" : "TELÉFONO"} · {i === -1 ? "actual" : `${i + 1} ${nombres[i]}`}
      </span>
      <button type="button" style={boton} onClick={() => ir(1)} aria-label="Variante siguiente">→</button>
    </div>
  );
}
