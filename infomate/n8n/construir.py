#!/usr/bin/env python3
"""Arma el workflow `Infomate · Diario` a partir de nodos/*.js y lo imprime como JSON para `n8n import:workflow`.

Uso (desde esta carpeta):
  python3 -I construir.py | ssh skynet 'docker exec -i n8n-n8n-1 sh -c "cat > /tmp/infomate.json && n8n import:workflow --input=/tmp/infomate.json; rm -f /tmp/infomate.json"'
El ID de la credencial Postgres sale de ids.json (no se versiona). Importar con el mismo ID reemplaza el workflow."""
import json, os, uuid

AQUI = os.path.dirname(os.path.abspath(__file__))
IDS = json.load(open(os.path.join(AQUI, "ids.json")))
PG = {"postgres": {"id": IDS["pg_cred"], "name": "Postgres infomate"}}
# Credencial nativa de OpenRouter (tipo openRouterApi); el nodo HTTP Request la usa como predefinedCredentialType.
OR = {"openRouterApi": {"id": IDS["or_cred"], "name": "infomate"}}
TG = {"telegramApi": {"id": IDS["tg_cred"], "name": "Telegram account"}}
ID_DIARIO = "infomateDiario01"
ID_ERROR = "infomateError001"
PROMPTS = os.path.join(AQUI, "..", "prompts")
SECCION = {"global": "Internacional", "arg": "Argentina", "tech": "Tecnología"}
AHORA_AR = "(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')"
TZ = "America/Argentina/Buenos_Aires"


def codigo(nombre):
    return open(os.path.join(AQUI, "nodos", nombre)).read()


def prompts():
    """Prompt de sistema de cada juez: la base con su sección y su criterio."""
    base = open(os.path.join(PROMPTS, "juez-base.md")).read()
    return {c: base.replace("{SECCION}", s).replace("{CRITERIO}", open(os.path.join(PROMPTS, f"juez-{c}.md")).read().strip())
            for c, s in SECCION.items()}


def juez(nombre, pos):
    """POST a OpenRouter con el pedido que armó juez.js. 5 en paralelo; si falla la conexión reintenta."""
    return nodo(nombre, "n8n-nodes-base.httpRequest", 4.5, pos, {
        "method": "POST", "url": "https://openrouter.ai/api/v1/chat/completions",
        "authentication": "predefinedCredentialType", "nodeCredentialType": "openRouterApi",
        "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.body) }}",
        "options": {"timeout": 120000, "batching": {"batch": {"batchSize": 5, "batchInterval": 0}}}},
        OR, onError="continueRegularOutput", retryOnFail=True, maxTries=2, waitBetweenTries=5000)


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
             "Guardar texto y elegir", "A juzgar", "Pedidos al juez", "Juez", "Validar", "Reintentos", "Juez, reintento",
             "Validar reintento", "Guardar juicio", "Armar edición", "Limpiar y cerrar", "Revisar edición"]
    fila2, fila3 = 220, 440
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
        # Paso 8: el juez. Una prioritaria sin texto va con el copete del feed.
        sql("A juzgar", [0, fila3],
            "SELECT id, categoria, titulo_original, fuente, coalesce(contenido, descripcion_fuente) AS texto, "
            "to_char(fecha_publicacion AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha "
            "FROM noticias WHERE candidata AND preseleccion IS NOT NULL AND juzgada IS NULL ORDER BY categoria, preseleccion",
            None, alwaysOutputData=True),
        nodo("Pedidos al juez", "n8n-nodes-base.code", 2, [220, fila3], {"mode": "runOnceForAllItems", "language": "javaScript",
             "jsCode": codigo("juez.js").replace("/*PROMPTS*/{}", json.dumps(prompts(), ensure_ascii=False))}, alwaysOutputData=True),
        juez("Juez", [440, fila3]),
        code("Validar", "validar.js", [660, fila3]),
        nodo("Reintentos", "n8n-nodes-base.code", 2, [880, fila3], {"mode": "runOnceForAllItems", "language": "javaScript",
             "jsCode": "return ($input.first().json.malas || []).map((m) => ({ json: m }));"}, alwaysOutputData=True),
        juez("Juez, reintento", [1100, fila3]),
        nodo("Validar reintento", "n8n-nodes-base.code", 2, [1320, fila3], {"mode": "runOnceForAllItems", "language": "javaScript",
             "jsCode": codigo("validar.js").replace("const ORIGEN = 'Pedidos al juez';", "const ORIGEN = 'Reintentos';")}),
        sql("Guardar juicio", [1540, fila3], "SELECT infomate_juzgar($1::jsonb) AS juzgadas", "={{ [JSON.stringify($json.juicios)] }}"),
        sql("Armar edición", [1760, fila3], f"SELECT infomate_armar_edicion({AHORA_AR}::date) AS edicion", None),
        sql("Limpiar y cerrar", [1980, fila3],
            "SELECT infomate_cerrar($1::text, 'ok', $2::jsonb) AS corrida",
            "={{ [$('Parsear').first().json.corrida, JSON.stringify({ fuentes: $('Parsear').first().json.estado, "
            "ingreso: $('Guardar sin repetidas').first().json.ingreso, preseleccion: $('Preseleccionar').first().json.preseleccion, "
            "google: { decodificados: $('Guardar links').first().json.links, fallas: $('Link real').first().json.fallas }, "
            "texto: $('Guardar texto y elegir').first().json.texto, sin_texto: $('Extraer texto').first().json.sin_texto, "
            "juez: { juzgadas: $('Guardar juicio').first().json.juzgadas, fallidas: $('Validar reintento').first().json.fallidas, "
            "costo_usd: $('Validar reintento').first().json.costo }, edicion: $json.edicion })] }}"),
        # Si la edición no llegó a 15 (juez caído, key sin saldo, día flojo), falla a propósito para que llegue el aviso por Telegram.
        nodo("Revisar edición", "n8n-nodes-base.code", 2, [2200, fila3], {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode":
             "const e = $('Armar edición').first().json.edicion;\n"
             "const total = Object.values(e).reduce((a, b) => a + Number(b), 0);\n"
             "if (total < 15) throw new Error(`Edición incompleta (${total} de 15): ${JSON.stringify(e)}. "
             "Juez: ${$('Validar reintento').first().json.fallidas} fallidas.`);\n"
             "return $input.all();"}),
        nodo("Nota", "n8n-nodes-base.stickyNote", 1, [200, -260], {"width": 640, "height": 200, "color": 4, "content":
             "## Infomate · Diario\nRecolecta global, ARG y tech, guarda sin repetidas (hasta 200 nuevas por categoría), "
             "preselecciona 15 por categoría, les busca el link real y el texto, marca 10 candidatas, las juzga con IA "
             "(OpenRouter) y deja las 5 mejores de cada categoría en `diaria`.\n"
             "Si falla, avisa por Telegram (Infomate · Error). Código en el repo tech-news, carpeta `infomate/`: no editar acá, se pisa al volver a desplegar."}),
    ]
    return {"id": ID_DIARIO, "name": "Infomate · Diario", "active": False, "nodes": nodes, "connections": con(*orden),
            "settings": {"executionOrder": "v1", "timezone": TZ, "callerPolicy": "workflowsFromSameOwner", "errorWorkflow": ID_ERROR}}


def error():
    """Workflow de error de Infomate · Diario: avisa por Telegram qué nodo falló y por qué. No hace falta activarlo."""
    texto = ("=Infomate · Diario falló\nNodo: {{ $json.execution.lastNodeExecuted }}\n"
             "Error: {{ $json.execution.error.message }}\n{{ $json.execution.url }}")
    nodes = [
        nodo("Error", "n8n-nodes-base.errorTrigger", 1, [0, 0], {}),
        nodo("Avisar por Telegram", "n8n-nodes-base.telegram", 1.2, [220, 0], {
            "chatId": IDS["tg_chat"], "text": texto,
            "additionalFields": {"appendAttribution": False, "disable_web_page_preview": True}}, TG,
            webhookId=str(uuid.uuid5(uuid.NAMESPACE_URL, "infomate/telegram-error"))),
    ]
    return {"id": ID_ERROR, "name": "Infomate · Error", "active": False, "nodes": nodes, "connections": con("Error", "Avisar por Telegram"),
            "settings": {"executionOrder": "v1", "timezone": TZ}}


if __name__ == "__main__":
    print(json.dumps([diario(), error()], ensure_ascii=False))
