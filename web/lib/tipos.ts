/** Orden del turno al armar el mazo. */
export const CATEGORIAS = ["ARG", "Global", "Tech"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const MAX_DESCRIPCION = 500;
export const MAX_CONTENIDO = 2000;

export interface Noticia {
  id: number;
  /** Título original de la fuente, sin traducir. */
  titulo: string;
  /** Resumen en español, hasta MAX_DESCRIPCION caracteres. */
  descripcion: string | null;
  /** Primeros MAX_CONTENIDO caracteres de la nota original. Solo para el detalle. */
  contenido: string | null;
  categoria: Categoria;
  link: string;
  fuente: string;
  /** ISO en UTC. */
  publicada: string;
  /** Solo para ordenar el mazo: no se muestra. */
  puntaje: number;
}

export interface DatosNoticias {
  generado: string;
  noticias: Noticia[];
}

export type Talla = "c" | "m" | "l";

/** Lo que necesita la tarjeta para pintarse: ya resuelto en el servidor. */
export interface TarjetaNoticia {
  id: number;
  /** Categoría + id (`tech-123`): la parte final de la URL pública. */
  identificador: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  talla: Talla;
  categoria: Categoria;
  fuente: string;
  letras: string;
  tono: number;
  fecha: string;
  link: string;
}
