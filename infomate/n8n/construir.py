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


def code(nombre, archivo, pos, **extra):
    return nodo(nombre, "n8n-nodes-base.code", 2, pos, {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": codigo(archivo)}, **extra)


# Para bajar páginas de notas: sin estos encabezados algunos sitios no responden (github.io quedaba colgado).
HTML = [{"name": "Accept", "value": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
        {"name": "Accept-Language", "value": "es-AR,es;q=0.9,en;q=0.8"}]


def http(nombre, pos, pausa_ms, encabezados=None):
    return nodo(nombre, "n8n-nodes-base.httpRequest", 4.5, pos, {
        "method": "GET", "url": "={{ $json.url }}", "sendHeaders": True, "specifyHeaders": "keypair",
        "headerParameters": {"parameters": [{"name": "User-Agent", "value": "Mozilla/5.0 (X11; Linux x86_64) infomate/1.0"}]
                             + (encabezados or [{"name": "Accept-Encoding", "value": "gzip, deflate"}])},
        "options": {"timeout": 20000, "batching": {"batch": {"batchSize": 1, "batchInterval": pausa_ms}},
                    "response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}}}},
        # Un corte pasajero (DNS, 406) no hace perder la fuente: reintenta hasta 2 veces, cada 10 s.
        onError="continueRegularOutput", retryOnFail=True, maxTries=3, waitBetweenTries=10000)


def sql(nombre, pos, query, valores, **extra):
    return nodo(nombre, "n8n-nodes-base.postgres", 2.6, pos, {
        "operation": "executeQuery", "query": query, "options": {"queryReplacement": valores} if valores else {}}, PG, **extra)


def con(*cadena):
    c = {}
    for o, d in zip(cadena, cadena[1:]):
        c[o] = {"main": [[{"node": d, "type": "main", "index": 0}]]}
    return c


def diario():
    orden = ["Probar a mano", "Fuentes", "Bajar fuentes", "Fuentes Reddit", "Bajar Reddit", "Parsear",
             "Guardar sin repetidas", "Preseleccionar", "Google a decodificar", "Página Google", "Firma Google",
             "Decodificar Google", "Link real", "Guardar links", "Sin texto", "Bajar nota", "Extraer texto",
             "Guardar texto y elegir", "Limpiar y cerrar"]
    fila2 = 220
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
        sql("Preseleccionar", [1540, 0], "SELECT infomate_preseleccionar($1::text) AS preseleccion",
            "={{ [$('Parsear').first().json.corrida] }}"),
        # Paso 6: link real de las preseleccionadas de Google News (método no oficial, ver firma-google.js).
        sql("Google a decodificar", [0, fila2],
            "SELECT id, categoria, 'https://news.google.com/rss/articles/' || substring(link_google from '/articles/([^?]+)') AS url "
            "FROM noticias WHERE preseleccion IS NOT NULL AND link = link_google ORDER BY categoria, preseleccion",
            None, alwaysOutputData=True),
        http("Página Google", [220, fila2], 1000),
        code("Firma Google", "firma-google.js", [440, fila2], alwaysOutputData=True),
        nodo("Decodificar Google", "n8n-nodes-base.httpRequest", 4.5, [660, fila2], {
            "method": "POST", "url": "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            "sendBody": True, "contentType": "form-urlencoded",
            "bodyParameters": {"parameters": [{"name": "f.req", "value": "={{ $json.freq }}"}]},
            "options": {"timeout": 20000, "batching": {"batch": {"batchSize": 1, "batchInterval": 1000}},
                        "response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}}}},
            onError="continueRegularOutput", retryOnFail=True, maxTries=2, waitBetweenTries=5000),
        code("Link real", "link-google.js", [880, fila2]),
        sql("Guardar links", [1100, fila2], "SELECT infomate_guardar_links($1::jsonb) AS links",
            "={{ [JSON.stringify($json.links)] }}"),
        # Texto de las preseleccionadas que no lo traían en el feed.
        sql("Sin texto", [1320, fila2],
            "SELECT id, categoria, link AS url FROM noticias WHERE preseleccion IS NOT NULL AND contenido IS NULL "
            "AND (link_google IS NULL OR link <> link_google) ORDER BY categoria, preseleccion",
            None, alwaysOutputData=True),
        http("Bajar nota", [1540, fila2], 500, HTML),
        code("Extraer texto", "texto.js", [1760, fila2]),
        sql("Guardar texto y elegir", [1980, fila2], "SELECT infomate_guardar_texto($1::jsonb) AS texto",
            "={{ [JSON.stringify($json.textos)] }}"),
        sql("Limpiar y cerrar", [2200, fila2],
            "SELECT infomate_cerrar($1::text, 'ok', $2::jsonb) AS corrida",
            "={{ [$('Parsear').first().json.corrida, JSON.stringify({ fuentes: $('Parsear').first().json.estado, "
            "ingreso: $('Guardar sin repetidas').first().json.ingreso, preseleccion: $('Preseleccionar').first().json.preseleccion, "
            "google: { decodificados: $('Guardar links').first().json.links, fallas: $('Link real').first().json.fallas }, "
            "texto: $json.texto, sin_texto: $('Extraer texto').first().json.sin_texto })] }}"),
        nodo("Nota", "n8n-nodes-base.stickyNote", 1, [200, -260], {"width": 640, "height": 200, "color": 4, "content":
             "## Infomate · Diario\nRecolecta global, ARG y tech, guarda sin repetidas (hasta 200 nuevas por categoría), "
             "preselecciona 15 por categoría, les busca el link real y el texto, y marca 10 candidatas.\n"
             "Paso 6 del plan: todavía sin IA ni horario. Código en el repo tech-news, carpeta `infomate/`: no editar acá, se pisa al volver a desplegar."}),
    ]
    return {"id": ID_DIARIO, "name": "Infomate · Diario", "active": False, "nodes": nodes, "connections": con(*orden),
            "settings": {"executionOrder": "v1", "timezone": TZ, "callerPolicy": "workflowsFromSameOwner"}}


if __name__ == "__main__":
    print(json.dumps([diario()], ensure_ascii=False))
