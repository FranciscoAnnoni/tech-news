import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarNoticia, obtenerNoticias } from "./noticias";
import { tarjetasDelMazo } from "./mazo";

const datos = JSON.parse(await readFile(new URL("../datos/noticias.json", import.meta.url), "utf8"));
const storeId = "store_Ejemplo";
const url = "https://ejemplo.public.blob.vercel-storage.com/infomate/hoy.json";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("links de una edición diaria", () => {
  const id = "9ffaffdf-5fca-46ad-8c3d-28f5f1075808";
  // Publicada antes del día de la edición: no hay que buscar el archivo del 01/11.
  const feed = [{ ...datos.noticias[0], id, categoria: "tech", fecha_publicacion: "2026-11-01T10:00:00Z" }];
  const link = `2026-11-02-tech-${id}`;
  const archivo = url.replace("hoy.json", "2026-11-02.json");

  it("conserva la fecha del feed en el link y lo resuelve tras reemplazar hoy.json", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    const fetch = vi.fn().mockImplementation(async (ruta) => {
      if (ruta === archivo) return Response.json(feed);
      return Response.json(feed, { headers: { "last-modified": "Mon, 02 Nov 2026 18:56:58 GMT" } });
    });
    vi.stubGlobal("fetch", fetch);
    const tarjetas = tarjetasDelMazo(await obtenerNoticias());
    expect(tarjetas[0].identificador).toBe(link);
    // Desde ahora hoy.json ya no contiene la noticia, pero el archivo fechado sí.
    fetch.mockImplementation(async (ruta) => Response.json(ruta === archivo ? feed : []));
    const resultado = await buscarNoticia(link, new Date("2026-11-03T12:00:00Z"));
    expect(resultado.disponible).toBe(true);
    if (resultado.disponible) expect(tarjetasDelMazo([resultado.noticia])[0].identificador).toBe(link);
    expect(fetch).toHaveBeenLastCalledWith(archivo, { cache: "no-store" });
  });

  it("mantiene la vigencia de 7 días desde la publicación", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(feed)));
    expect((await buscarNoticia(link, new Date("2026-11-08T10:00:00Z"))).disponible).toBe(true);
    expect(await buscarNoticia(link, new Date("2026-11-08T10:00:00.001Z"))).toEqual({ disponible: false });
  });

  it("muestra no disponible si el archivo diario ya no existe", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect(await buscarNoticia(link, new Date("2026-11-03T12:00:00Z"))).toEqual({ disponible: false });
  });

  it.each(["2026-02-30-tech-1", "2026-13-01-tech-1", "../../tech-1", "2026-11-02-tech-no-es-id"])("no consulta Blob para un link inválido: %s", async (identificador) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await buscarNoticia(identificador, new Date())).toEqual({ disponible: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("usa el día de Buenos Aires cuando la subida es después de medianoche UTC", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(feed, {
      headers: { "last-modified": "Tue, 03 Nov 2026 01:00:00 GMT" },
    })));
    expect(tarjetasDelMazo(await obtenerNoticias())[0].identificador).toBe(link);
  });
});

describe("obtenerNoticias", () => {
  it("interpreta DD/MM/YYYY HH:mm en hora argentina para calcular la vigencia", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const feed = [{ ...datos.noticias[0], categoria: "arg", fecha_publicacion: "02/11/2026 03:16" }];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(feed)));
    const [noticia] = await obtenerNoticias();
    expect(noticia.publicada).toBe("2026-11-02T03:16:00-03:00");
    expect((await buscarNoticia(`arg-${noticia.id}`, new Date("2026-11-02T12:00:00Z"))).disponible).toBe(true);
    expect((await buscarNoticia(`arg-${noticia.id}`, new Date("2026-11-09T06:16:00.001Z"))).disponible).toBe(false);
  });

  it("adapta el feed real y resuelve los links con UUID", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const id = "9ffaffdf-5fca-46ad-8c3d-28f5f1075808";
    const feed = ["arg", "global", "tech"].map((categoria) => ({
      ...datos.noticias[0], id, categoria,
      fecha_publicacion: "2026-11-02T10:00:00+00:00",
    }));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(Response.json(feed))));
    const noticias = await obtenerNoticias();
    expect(noticias.map((n) => n.categoria)).toEqual(["ARG", "Global", "Tech"]);
    expect(noticias[2].id).toBe(id);
    expect(noticias[2].publicada).toBe(feed[2].fecha_publicacion);
    expect(await buscarNoticia(`tech-${id}`, new Date("2026-11-02T12:00:00Z")))
      .toEqual({ disponible: true, noticia: noticias[2] });
  });

  it("lee el archivo local sin store configurado", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await obtenerNoticias()).toEqual(datos.noticias);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lee el Blob público sin enviar el token y sin caché de Next", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubEnv("INFOMATE_READ_WRITE_TOKEN", "token-de-prueba");
    const fetch = vi.fn().mockResolvedValue(Response.json(datos));
    vi.stubGlobal("fetch", fetch);
    expect(await obtenerNoticias()).toEqual(datos.noticias);
    expect(fetch).toHaveBeenCalledWith(url, { cache: "no-store" });
  });

  it("usa la misma fuente remota para los links compartidos", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const noticia = { ...datos.noticias.find((n: { categoria: string }) => n.categoria === "Tech"), id: 99999, publicada: "2026-11-02T10:00:00Z" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ generado: "2026-11-02T10:00:00Z", noticias: [noticia] })));
    expect(await buscarNoticia("tech-99999", new Date("2026-11-02T12:00:00Z"))).toEqual({ disponible: true, noticia });
  });

  it("reporta errores HTTP sin sustituirlos por las noticias de ejemplo", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(obtenerNoticias()).rejects.toThrow("HTTP 503");
  });

  it("propaga errores de conexión", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Sin conexión")));
    await expect(obtenerNoticias()).rejects.toThrow("Sin conexión");
  });

  it.each([
    null,
    { noticias: [] },
    { generado: "2026-11-02T10:00:00Z", noticias: {} },
    { ...datos, noticias: [{ ...datos.noticias[0], categoria: "Otra" }] },
    { ...datos, noticias: [{ ...datos.noticias[0], publicada: "ayer" }] },
    { ...datos, noticias: [{ ...datos.noticias[0], titulo: null }] },
    { ...datos, noticias: [{ ...datos.noticias[0], puntaje: "10" }] },
    { ...datos, noticias: [{ ...datos.noticias[0], contenido: 42 }] },
  ])("rechaza datos incompatibles (caso %#)", async (invalido) => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(invalido)));
    await expect(obtenerNoticias()).rejects.toThrow("Formato de noticias inválido");
  });

  it("acepta un feed vacío", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ generado: "2026-11-02T10:00:00Z", noticias: [] })));
    expect(await obtenerNoticias()).toEqual([]);
  });
});

describe("fallas momentáneas de Blob", () => {
  const feed = [{ ...datos.noticias[0], categoria: "tech", fecha_publicacion: "2026-11-01T10:00:00Z" }];

  it.each([403, 500, 503])("reintenta una vez si Blob responde %i", async (estado) => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: estado }))
      .mockResolvedValueOnce(Response.json(feed));
    vi.stubGlobal("fetch", fetch);
    expect(await obtenerNoticias()).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(url, { cache: "no-store" });
  });

  it("reintenta si falla la red", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(Response.json(feed));
    vi.stubGlobal("fetch", fetch);
    expect(await obtenerNoticias()).toHaveLength(1);
  });

  it("si falla dos veces, tira el error con el estado", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const fetch = vi.fn().mockImplementation(async () => new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    await expect(obtenerNoticias()).rejects.toThrow("HTTP 403");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("no reintenta un 404 de una edición", async () => {
    vi.stubEnv("INFOMATE_STORE_ID", storeId);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    expect(await buscarNoticia(`2026-11-02-tech-${datos.noticias[0].id}`, new Date("2026-11-03T12:00:00Z"))).toEqual({ disponible: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
