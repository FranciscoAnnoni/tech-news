#!/usr/bin/env python3
"""Crea o actualiza en n8n el workflow `Tech · Recolector` a partir de nodos/*.js.

Uso:
  export N8N_API_URL=http://<host-de-n8n>:5678/api/v1
  export N8N_API_KEY=<api key de n8n>
  export N8N_PG_CRED_ID=<id de la credencial Postgres de la base noticias en n8n>
  python3 construir.py

Si existe ids.json (no se versiona) con {"recolector": "<id>"}, actualiza ese workflow; si no, crea uno nuevo y guarda el id.
Ojo: un PUT a un workflow publicado lo deja activo al instante."""
import json, os, uuid, urllib.request, urllib.error

AQUI = os.path.dirname(os.path.abspath(__file__))
API = os.environ["N8N_API_URL"].rstrip("/")
H = {"X-N8N-API-KEY": os.environ["N8N_API_KEY"], "Content-Type": "application/json"}
IDS_FILE = os.path.join(AQUI, "ids.json")
IDS = json.load(open(IDS_FILE)) if os.path.exists(IDS_FILE) else {}

PG = {"postgres": {"id": os.environ["N8N_PG_CRED_ID"], "name": "Postgres noticias"}}
TZ = "America/Argentina/Buenos_Aires"


def codigo(nombre):
    return open(os.path.join(AQUI, "nodos", nombre)).read()


def nodo(nombre, tipo, version, pos, params, cred=None, **extra):
    n = {"id": str(uuid.uuid4()), "name": nombre, "type": tipo, "typeVersion": version, "position": pos, "parameters": params}
    if cred: n["credentials"] = cred
    n.update(extra)
    return n


def con(*pares):
    c = {}
    for o, d in pares:
        c.setdefault(o, {}).setdefault("main", [[]])[0].append({"node": d, "type": "main", "index": 0})
    return c


def guardar(clave, nombre, nodes, connections):
    body = {"name": nombre, "nodes": nodes, "connections": connections,
            "settings": {"executionOrder": "v1", "timezone": TZ, "callerPolicy": "workflowsFromSameOwner", "availableInMCP": True}}
    wid = IDS.get(clave)
    url, metodo = (f"{API}/workflows/{wid}", "PUT") if wid else (f"{API}/workflows", "POST")
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(url, data=json.dumps(body).encode(), headers=H, method=metodo)))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{nombre}: {e.code} {e.read().decode()[:600]}")
    IDS[clave] = r["id"]
    json.dump(IDS, open(IDS_FILE, "w"), indent=1)
    print(f"{metodo} OK  {nombre}  {r['id']}")
    return r["id"]


def recolector():
    nodes = [
        nodo("Todos los días 22:00", "n8n-nodes-base.scheduleTrigger", 1.4, [0, 0],
             {"rule": {"interval": [{"field": "days", "daysInterval": 1, "triggerAtHour": 22, "triggerAtMinute": 0}]}}),
        nodo("Probar a mano", "n8n-nodes-base.manualTrigger", 1, [0, 192], {}),
        nodo("Fuentes", "n8n-nodes-base.code", 2, [272, 96], {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": codigo("fuentes.js")}),
        # De a 1 pedido cada 30 s: Reddit corta con 429 si se le pide seguido.
        nodo("Bajar fuentes", "n8n-nodes-base.httpRequest", 4.5, [496, 96], {
            "method": "GET", "url": "={{ $json.url }}", "sendHeaders": True, "specifyHeaders": "keypair",
            "headerParameters": {"parameters": [{"name": "User-Agent", "value": "Mozilla/5.0 (X11; Linux x86_64) skynet-tech/1.0"},
                                                {"name": "Accept-Encoding", "value": "gzip, deflate"}]},
            "options": {"timeout": 20000, "batching": {"batch": {"batchSize": 1, "batchInterval": 30000}},
                        "response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}}}},
             onError="continueRegularOutput"),
        nodo("Parsear y limpiar", "n8n-nodes-base.code", 2, [720, 96], {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": codigo("parsear.js")}),
        nodo("Guardar sin repetidas", "n8n-nodes-base.postgres", 2.7, [944, 96], {
            "operation": "executeQuery",
            "query": "SELECT tech_ingresar($1::jsonb, $2::text) || jsonb_build_object('refrescadas', tech_refrescar($3::jsonb)) AS resultado",
            "options": {"queryReplacement": "={{ [JSON.stringify($json.items), $json.corrida, JSON.stringify($json.refrescar || [])] }}"}}, PG),
        nodo("Resumen", "n8n-nodes-base.set", 3.4, [1168, 96], {"mode": "manual", "includeOtherFields": False, "assignments": {"assignments": [
            {"id": str(uuid.uuid4()), "name": "corrida", "value": "={{ $('Parsear y limpiar').item.json.corrida }}", "type": "string"},
            {"id": str(uuid.uuid4()), "name": "resultado", "value": "={{ $json.resultado }}", "type": "object"},
            {"id": str(uuid.uuid4()), "name": "leidas_por_fuente", "value": "={{ $('Parsear y limpiar').item.json.estado }}", "type": "object"}]}}),
        nodo("Nota", "n8n-nodes-base.stickyNote", 1, [240, -224], {"width": 560, "height": 200, "color": 4, "content":
             "## Noticias Tech · Recolector (sin IA)\n"
             "Todos los días 22:00: Hacker News, Reddit (RSS de r/technology, r/programming, r/artificial) y Lobsters.\n"
             "Entran por día **5 nuevas de HN, 5 de Lobsters y 5 de Reddit (2+2+1)**; lo ya guardado se actualiza y no gasta cupo. "
             "Una fila por hecho (mismo link o título parecido). Lo no elegido se borra a los 30 días.\n"
             "Además vuelve a leer HN (72 h) solo para actualizar puntos y comentarios de lo ya guardado.\n"
             "Tablas `tech_*` en la base `noticias`. Código en el repo tech-news (`sql/` y `n8n/`)."}),
    ]
    connections = con(("Todos los días 22:00", "Fuentes"), ("Probar a mano", "Fuentes"), ("Fuentes", "Bajar fuentes"),
                      ("Bajar fuentes", "Parsear y limpiar"), ("Parsear y limpiar", "Guardar sin repetidas"),
                      ("Guardar sin repetidas", "Resumen"))
    return guardar("recolector", "Tech · Recolector", nodes, connections)


if __name__ == "__main__":
    recolector()
