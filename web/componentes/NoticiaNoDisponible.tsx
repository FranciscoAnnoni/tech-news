import Link from "next/link";
import estilos from "./NoticiaNoDisponible.module.css";

export function NoticiaNoDisponible() {
  return (
    <main className={estilos.pantalla} data-prueba="no-disponible">
      <p className={estilos.marca}>INFOMATE</p>
      <h1>Esta noticia ya no está disponible</h1>
      <p>Los links duran 7 días desde la publicación de la noticia.</p>
      <Link className={estilos.boton} href="/">
        Ver las noticias de hoy
      </Link>
    </main>
  );
}
