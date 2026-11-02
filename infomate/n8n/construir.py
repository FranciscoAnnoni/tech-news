#!/usr/bin/env python3
"""Arma el workflow `Infomate · Diario` a partir de nodos/*.js y lo imprime como JSON para `n8n import:workflow`.

Uso (desde esta carpeta):
  python3 -I construir.py | ssh skynet 'docker exec -i n8n-n8n-1 sh -c "cat > /tmp/infomate.json && n8n import:workflow --input=/tmp/infomate.json; rm -f /tmp/infomate.json"'
El ID de la credencial Postgres sale de ids.json (no se versiona). Importar con el mismo ID reemplaza el workflow."""
import json, os, uuid

AQUI = os.path.dirname(os.path.abspath(__file__))
IDS = json.load(open(os.path.join(AQUI, "ids.json")))
PG = {"postgres": {"id": IDS["pg_cred"], "name": "Postgres infomate"}}
ID_DIARIO = "infomateDiario01"
TZ = "America/Argentina/Buenos_Aires"


def codigo(nombre):
    return open(os.path.join(AQUI, "nodos", nombre)).read()


def nodo(nombre, tipo, version, pos, params, cred=None, **extra):
    n = {"id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"infomate/{nombre}")), "name": nombre, "type": tipo,
         "typeVersion": version, "position": pos, "parameters": params}
    if cred:
        n["credentials"] = cred
    n.update(extra)
    return n


def code(nombre, archivo, pos):
    return nodo(nombre, "n8n-nodes-base.code", 2, pos, {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": codigo(archivo)})


def http(nombre, pos, pausa_ms):
    return nodo(nombre, "n8n-nodes-base.httpRequest", 4.5, pos, {
        "method": "GET", "url": "={{ $json.url }}", "sendHeaders": True, "specifyHeaders": "keypair",
        "headerParameters": {"parameters": [{"name": "User-Agent", "value": "Mozilla/5.0 (X11; Linux x86_64) infomate/1.0"},
                                            {"name": "Accept-Encoding", "value": "gzip, deflate"}]},
        "options": {"timeout": 20000, "batching": {"batch": {"batchSize": 1, "batchInterval": pausa_ms}},
                    "response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}}}},
        # Un corte pasajero (DNS, 406) no hace perder la fuente: reintenta hasta 2 veces, cada 10 s.
        onError="continueRegularOutput", retryOnFail=True, maxTries=3, waitBetweenTries=10000)


def sql(nombre, pos, query, valores):
    return nodo(nombre, "n8n-nodes-base.postgres", 2.6, pos, {
        "operation": "executeQuery", "query": query, "options": {"queryReplacement": valores}}, PG)


def con(*cadena):
    c = {}
    for o, d in zip(cadena, cadena[1:]):
        c[o] = {"main": [[{"node": d, "type": "main", "index": 0}]]}
    return c


def diario():
    orden = ["Probar a mano", "Fuentes", "Bajar fuentes", "Fuentes Reddit", "Bajar Reddit", "Parsear",
             "Guardar sin repetidas", "Limpiar y cerrar"]
    nodes = [
        nodo("Probar a mano", "n8n-nodes-base.manualTrigger", 1, [0, 0], {}),
        code("Fuentes", "fuentes.js", [220, 0]),
        http("Bajar fuentes", [440, 0], 1500),
        code("Fuentes Reddit", "fuentes-reddit.js", [660, 0]),
        # Reddit corta con 429 si se le pide seguido: 65 s entre pedidos.
        http("Bajar Reddit", [880, 0], 65000),
        code("Parsear", "parsear.js", [1100, 0]),
        sql("Guardar sin repetidas", [1320, 0],
            "SELECT infomate_ingresar($1::jsonb, $2::jsonb, $3::text) AS ingreso",
            "={{ [JSON.stringify($json.items), JSON.stringify($json.portadas), $json.corrida] }}"),
        sql("Limpiar y cerrar", [1540, 0],
            "SELECT infomate_cerrar($1::text, 'ok', $2::jsonb) AS corrida",
            "={{ [$('Parsear').first().json.corrida, JSON.stringify({ fuentes: $('Parsear').first().json.estado, ingreso: $json.ingreso })] }}"),
        nodo("Nota", "n8n-nodes-base.stickyNote", 1, [200, -260], {"width": 640, "height": 200, "color": 4, "content":
             "## Infomate · Diario\nRecolecta global, ARG y tech, y guarda sin repetidas en la base `infomate` (hasta 200 nuevas por categoría).\n"
             "Paso 4 del plan: todavía sin IA ni horario. Código en el repo tech-news, carpeta `infomate/`: no editar acá, se pisa al volver a desplegar."}),
    ]
    return {"id": ID_DIARIO, "name": "Infomate · Diario", "active": False, "nodes": nodes, "connections": con(*orden),
            "settings": {"executionOrder": "v1", "timezone": TZ, "callerPolicy": "workflowsFromSameOwner"}}


if __name__ == "__main__":
    print(json.dumps([diario()], ensure_ascii=False))
