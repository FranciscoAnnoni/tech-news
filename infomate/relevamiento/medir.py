#!/usr/bin/env python3
"""Relevamiento de Infomate (paso 2): baja las fuentes de hoy y mide volumen, horas y texto.

Uso: python3 -I medir.py            (guarda la foto en datos/ e imprime el resumen)
     python3 -I medir.py datos/x.json  (rehace el resumen de una foto guardada, sin bajar nada)
Solo biblioteca estándar. No toca ninguna base."""
import json, os, re, sys, time, html, unicodedata, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from email.utils import parsedate_to_datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
ART = timezone(timedelta(hours=-3))
UA = "Mozilla/5.0 (X11; Linux x86_64) infomate-relevamiento/1.0"
GN = "https://news.google.com/rss"
R = "https://www.reddit.com/r"

FUENTES = [
    # categoria, nombre, tipo, url
    ("global", "Google News Mundo", "gnews", f"{GN}/headlines/section/topic/WORLD?hl=es-419&gl=AR&ceid=AR:es-419"),
    ("global", "BBC Mundo", "rss", "https://feeds.bbci.co.uk/mundo/rss.xml"),
    ("global", "France 24", "rss", "https://www.france24.com/es/rss"),
    ("global", "DW", "rss", "https://rss.dw.com/xml/rss-sp-all"),
    ("global", "Google News EE.UU.", "gnews", f"{GN}/headlines/section/topic/NATION?hl=es-419&gl=US&ceid=US:es-419"),
    ("global", "La Nación EE.UU.", "rss", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/estados-unidos/"),
    ("global", "El País Europa", "rss", "https://feeds.elpais.com/mrss-s/list/ep/site/elpais.com/section/internacional/subsection/europa"),
    ("global", "Euronews", "rss", "https://es.euronews.com/rss"),
    ("arg", "Google News Argentina", "gnews", f"{GN}/headlines/section/topic/NATION?hl=es-419&gl=AR&ceid=AR:es-419"),
    ("arg", "Infobae Política", "rss", "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/"),
    ("arg", "Infobae Economía", "rss", "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/"),
    ("arg", "La Nación Política", "rss", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/"),
    ("arg", "La Nación Economía", "rss", "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/"),
    ("arg", "Portada Google News Argentina", "portada", f"{GN}?hl=es-419&gl=AR&ceid=AR:es-419"),
    ("global", "Portada Google News EE.UU.", "portada", f"{GN}?hl=es-419&gl=US&ceid=US:es-419"),
    ("tech", "HN", "hn", None),
    ("tech", "Lobsters", "lobsters", "https://lobste.rs/hottest.json"),
    ("tech", "r/technology", "reddit", f"{R}/technology/top/.rss?t=day&limit=25"),
    ("tech", "r/programming", "reddit", f"{R}/programming/top/.rss?t=day&limit=25"),
    ("tech", "r/artificial", "reddit", f"{R}/artificial/top/.rss?t=day&limit=25"),
]


def bajar(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace"), r.geturl()


def limpio(s):
    s = re.sub(r"<!\[CDATA\[([\s\S]*?)\]\]>", r"\1", s or "")
    s = html.unescape(re.sub(r"<[^>]+>", " ", html.unescape(s)))
    return re.sub(r"\s+", " ", s).strip()


def tag(bloque, nombre):
    m = re.search(rf"<{nombre}[^>]*>([\s\S]*?)</{nombre}>", bloque)
    return m.group(1) if m else ""


def fecha(s):
    s = limpio(s)
    if not s:
        return None
    try:
        d = parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()


def parse_rss(xml):
    out = []
    for b in re.findall(r"<item[\s>][\s\S]*?</item>", xml) or re.findall(r"<entry[\s>][\s\S]*?</entry>", xml):
        link = limpio(tag(b, "link")) or (re.search(r'<link[^>]*href="([^"]+)"', b) or [None, None])[1]
        out.append({
            "titulo": limpio(tag(b, "title")),
            "link": link,
            "fecha": fecha(tag(b, "pubDate") or tag(b, "dc:date") or tag(b, "published") or tag(b, "updated")),
            "descripcion": len(limpio(tag(b, "description") or tag(b, "summary"))),
            "texto": len(limpio(tag(b, "content:encoded") or tag(b, "content"))),
            "medio": limpio(tag(b, "source")) or None,
            "relacionados": len(set(re.findall(r"<font[^>]*>([^<]+)</font>", html.unescape(tag(b, "description"))))),
        })
    return out


def parse_hn(txt):
    return [{"titulo": h["title"], "link": h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}",
             "fecha": h["created_at"], "puntos": h.get("points") or 0, "descripcion": 0, "texto": 0, "medio": None}
            for h in json.loads(txt).get("hits", [])]


def parse_lobsters(txt):
    return [{"titulo": s["title"], "link": s.get("url") or s["short_id_url"], "fecha": s["created_at"],
             "puntos": s.get("score") or 0, "descripcion": len(s.get("description_plain") or ""), "texto": 0, "medio": None}
            for s in json.loads(txt)]


def foto():
    hace24 = int(time.time()) - 86400
    datos = {"tomada": datetime.now(ART).isoformat(), "fuentes": []}
    for i, (cat, nombre, tipo, url) in enumerate(FUENTES):
        if tipo == "hn":
            url = f"https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E{hace24}&hitsPerPage=1000"
        if tipo == "reddit" and i and FUENTES[i - 1][2] == "reddit":
            time.sleep(65)
        f = {"categoria": cat, "nombre": nombre, "tipo": tipo, "url": url, "items": [], "error": None}
        try:
            txt, _ = bajar(url)
            f["items"] = parse_hn(txt) if tipo == "hn" else parse_lobsters(txt) if tipo == "lobsters" else parse_rss(txt)
        except Exception as e:  # una fuente caída no corta el relevamiento
            f["error"] = f"{type(e).__name__}: {e}"
        print(f"  {nombre}: {len(f['items'])} ítems {f['error'] or ''}", file=sys.stderr)
        datos["fuentes"].append(f)
    # Muestra: ¿los links de Google News se resuelven al medio con un GET simple?
    gn = [it["link"] for f in datos["fuentes"] if f["tipo"] == "gnews" for it in f["items"]][:5]
    datos["google_news"] = []
    for link in gn:
        try:
            cuerpo, final = bajar(link, timeout=15)
            m = re.search(r'data-n-au="([^"]+)"', cuerpo) or re.search(r'<a[^>]+href="(https?://(?!news\.google)[^"]+)"', cuerpo)
            datos["google_news"].append({"link": link, "final": final, "en_html": m.group(1) if m else None})
        except Exception as e:
            datos["google_news"].append({"link": link, "error": f"{type(e).__name__}: {e}"})
    return datos


def norm(t):
    t = re.sub(r"\s+-\s+[^-]{2,40}$", "", t)  # Google News agrega " - Medio" al final
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", t).split()


def parecidos(a, b):
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return False
    return len(sa & sb) / len(sa | sb) >= 0.5 or SequenceMatcher(None, " ".join(a), " ".join(b)).ratio() >= 0.6


def resumen(datos):
    ahora = datetime.fromisoformat(datos["tomada"])
    edad = lambda it: (ahora - datetime.fromisoformat(it["fecha"])).total_seconds() / 3600 if it["fecha"] else None
    print(f"# Foto tomada {datos['tomada']}\n")
    print("| Categoría | Fuente | Ítems | Últimas 24 h | Ventana (h) | Con descripción | Con texto (300+) | Link Google News |")
    print("|---|---|---|---|---|---|---|---|")
    por_cat = defaultdict(list)
    horas = defaultdict(Counter)
    for f in datos["fuentes"]:
        its = f["items"]
        eds = [e for e in (edad(it) for it in its) if e is not None]
        en24 = [it for it in its if (edad(it) is not None and edad(it) <= 24)]
        if f["tipo"] != "portada":
            for it in en24:
                por_cat[f["categoria"]].append((f["nombre"], it))
        for it in its:
            e = edad(it)
            if e is not None and e <= 48:
                horas[f["categoria"]][datetime.fromisoformat(it["fecha"]).astimezone(ART).hour] += 1
        n = len(its) or 1
        print(f"| {f['categoria']} | {f['nombre']} | {len(its)}{' ERROR ' + f['error'] if f['error'] else ''} | {len(en24)} | "
              f"{round(max(eds)) if eds else '-'} | {sum(1 for it in its if it['descripcion'] >= 50) * 100 // n}% | "
              f"{sum(1 for it in its if it['texto'] >= 300) * 100 // n}% | {sum(1 for it in its if 'news.google.com' in (it['link'] or '')) * 100 // n}% |")

    hn = next(f for f in datos["fuentes"] if f["tipo"] == "hn")["items"]
    print(f"\nHN, historias de las últimas 24 h por puntos: total {len(hn)}, >=10: {sum(1 for h in hn if h['puntos'] >= 10)}, "
          f">=30: {sum(1 for h in hn if h['puntos'] >= 30)}, >=100: {sum(1 for h in hn if h['puntos'] >= 100)}")

    print("\n| Categoría | Ítems en 24 h (sin portadas) | Noticias distintas | Cubiertas por 2+ fuentes | Distintas con texto en el feed |")
    print("|---|---|---|---|---|")
    for cat in ("global", "arg", "tech"):
        grupos = []
        for nombre, it in por_cat[cat]:
            t = norm(it["titulo"])
            g = next((g for g in grupos if parecidos(t, g["t"])), None)
            if g:
                g["fuentes"].add(nombre); g["texto"] |= it["texto"] >= 300
            else:
                grupos.append({"t": t, "fuentes": {nombre}, "texto": it["texto"] >= 300})
        print(f"| {cat} | {len(por_cat[cat])} | {len(grupos)} | {sum(1 for g in grupos if len(g['fuentes']) > 1)} | {sum(1 for g in grupos if g['texto'])} |")

    print("\nGoogle News, medios distintos que trae cada ítem (cobertura), últimas 24 h:\n")
    for f in datos["fuentes"]:
        if f["tipo"] in ("gnews", "portada"):
            c = Counter(it.get("relacionados", 0) for it in f["items"] if edad(it) is not None and edad(it) <= 24)
            print(f"- {f['nombre']}: " + ", ".join(f"{k} medios: {c[k]}" for k in sorted(c)))

    print("\nHora de publicación (Argentina), últimas 48 h:\n")
    print("| Hora | " + " | ".join(("global", "arg", "tech")) + " |")
    print("|---|---|---|---|")
    for h in range(24):
        print(f"| {h:02d} | " + " | ".join(str(horas[c][h]) for c in ("global", "arg", "tech")) + " |")

    print("\nGoogle News, muestra de links:\n")
    for g in datos["google_news"]:
        print(f"- final: {g.get('final', '')[:90]} | en el HTML: {g.get('en_html')} | {g.get('error') or ''}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        datos = json.load(open(sys.argv[1]))
    else:
        datos = foto()
        os.makedirs(os.path.join(AQUI, "datos"), exist_ok=True)
        ruta = os.path.join(AQUI, "datos", datetime.now(ART).strftime("foto-%Y%m%d-%H%M.json"))
        json.dump(datos, open(ruta, "w"), ensure_ascii=False)
        print(f"foto guardada en {ruta}", file=sys.stderr)
    resumen(datos)
