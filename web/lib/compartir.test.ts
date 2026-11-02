import { expect, it, vi } from "vitest";
import { compartir } from "./compartir";

const datos = { title: "Titulo", url: "https://infomate.ar/noticia/tech-1" };
const nombre = (name: string) => Object.assign(new Error(name), { name });

it("con share disponible comparte título y URL, sin copiar", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const copiar = vi.fn();
  expect(await compartir(datos, { share, copiar })).toBe("compartido");
  expect(share).toHaveBeenCalledWith(datos);
  expect(copiar).not.toHaveBeenCalled();
});

it("cancelar el menú nativo no copia ni avisa", async () => {
  const copiar = vi.fn();
  const share = vi.fn().mockRejectedValue(nombre("AbortError"));
  expect(await compartir(datos, { share, copiar })).toBe("cancelado");
  expect(copiar).not.toHaveBeenCalled();
});

it("si share falla por otra razón, copia", async () => {
  const copiar = vi.fn().mockResolvedValue(undefined);
  const share = vi.fn().mockRejectedValue(nombre("NotAllowedError"));
  expect(await compartir(datos, { share, copiar })).toBe("copiado");
  expect(copiar).toHaveBeenCalledWith(datos.url);
});

it("sin share, copia la URL", async () => {
  const copiar = vi.fn().mockResolvedValue(undefined);
  expect(await compartir(datos, { copiar })).toBe("copiado");
  expect(copiar).toHaveBeenCalledWith(datos.url);
});

it("si copiar también falla, informa el error", async () => {
  const copiar = vi.fn().mockRejectedValue(new Error("denegado"));
  expect(await compartir(datos, { copiar })).toBe("error");
  const share = vi.fn().mockRejectedValue(nombre("NotAllowedError"));
  expect(await compartir(datos, { share, copiar })).toBe("error");
});
