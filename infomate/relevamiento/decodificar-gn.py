#!/usr/bin/env python3
"""Prueba del método no oficial para decodificar links de Google News (paso 5).
1) GET a la página del artículo y leer data-n-a-sg y data-n-a-ts. 2) POST a batchexecute con el RPC Fbv4je.
Uso: python3 -I decodificar-gn.py [cantidad]   (toma links del feed de Google News Argentina)"""
import json, re, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) infomate-prueba/1.0"
FEED = "https://news.google.com/rss/headlines/section/topic/NATION?hl=es-419&gl=AR&ceid=AR:es-419"


def pedir(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def decodificar(link):
    gid = re.search(r"/articles/([^?]+)", link).group(1)
    pagina = pedir(f"https://news.google.com/rss/articles/{gid}")
    sg = re.search(r'data-n-a-sg="([^"]+)"', pagina).group(1)
    ts = re.search(r'data-n-a-ts="([^"]+)"', pagina).group(1)
    req = ["Fbv4je", f'["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"{gid}",{ts},"{sg}"]']
    cuerpo = "f.req=" + urllib.parse.quote(json.dumps([[req]]))
    resp = pedir("https://news.google.com/_/DotsSplashUi/data/batchexecute", cuerpo.encode(),
                 {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
    datos = json.loads(resp.split("\n\n", 1)[1])
    return json.loads(datos[0][2])[1]


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    links = re.findall(r"<link>(https://news\.google\.com/rss/articles/[^<]+)</link>", pedir(FEED))[:n]
    ok = 0
    t0 = time.time()
    for l in links:
        try:
            url = decodificar(l)
            ok += url.startswith("http") and "news.google.com" not in url
            print("OK  ", url[:100])
        except Exception as e:
            print("FALLA", type(e).__name__, str(e)[:100])
        time.sleep(1)
    print(f"{ok}/{len(links)} resueltos en {time.time() - t0:.1f} s (con 1 s de pausa entre links)")
