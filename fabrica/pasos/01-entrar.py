#!/usr/bin/env python
"""Paso 01 · entrar (codigo). Valida el issue y lo deja listo para el resto de la fabrica.

Uso:  python pasos/01-entrar.py [NUMERO_DE_ISSUE]
Sin numero: coge el `ready-for-agent` abierto mas antiguo.

Escribe $FABRICA_RUN/issue.json y saca un resumen. Si el issue no es apto, termina con
`FALLO: <motivo>` en la ultima linea (eso para la cadena).
"""
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

FABRICA = Path(__file__).resolve().parent.parent
REPO = Path(os.environ.get("REPO", FABRICA.parent))
RUN = Path(os.environ.get("FABRICA_RUN", "")).resolve() if os.environ.get("FABRICA_RUN") else None

# Un issue toca SQL Server si nombra estos ficheros, terminos o el propio stored procedure.
SENALES_SQL = [
    "sp-builder", "sql-executor", "mssql", "tedious", "sql server", "stored procedure",
    "spnet", "sqlpreview", "set language spanish", "dateformat", "indexeddb", "configstore",
]

# Secciones del cuerpo que pueden contener criterios de aceptacion, en orden de preferencia.
SECCIONES_CRITERIOS = ["acceptance criteria", "criterios de aceptacion", "criterios", "what to build", "que construir"]
SECCIONES_BLOQUEO = ["blocked by", "bloqueado por"]


def sh(*args):
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        raise RuntimeError(f"{' '.join(args)}: {p.stderr.strip()[:300]}")
    return p.stdout


def gh_json(*args):
    return json.loads(sh("gh", *args))


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normaliza(s):
    return sin_tildes(s).lower().strip()


def seccion(cuerpo, titulos):
    """Texto de la seccion cuyo titulo este en `titulos`.

    Si hay varias, gana la primera de `titulos` (orden de preferencia), no la primera del
    documento: un issue puede tener «What to build» antes de «Acceptance criteria».
    """
    encontradas, actual, lineas = {}, None, []
    for linea in cuerpo.splitlines():
        m = re.match(r"^#{1,3}\s+(.+?)\s*$", linea)
        if m:
            if actual and normaliza(actual) not in encontradas:
                encontradas[normaliza(actual)] = "\n".join(lineas).strip()
            actual, lineas = m.group(1), []
        elif actual:
            lineas.append(linea)
    if actual and normaliza(actual) not in encontradas:
        encontradas[normaliza(actual)] = "\n".join(lineas).strip()
    for t in titulos:
        if t in encontradas:
            return encontradas[t]
    return ""


def criterios_de(cuerpo):
    """Checkboxes de la seccion de criterios. Si no hay seccion, los checkboxes del cuerpo entero."""
    texto = seccion(cuerpo, SECCIONES_CRITERIOS) or cuerpo
    return [re.sub(r"^[-*]\s*\[[ xX]\]\s*", "", l).strip()
            for l in texto.splitlines() if re.match(r"^\s*[-*]\s*\[[ xX]\]", l)]


def bloqueos_de(cuerpo):
    texto = seccion(cuerpo, SECCIONES_BLOQUEO)
    return sorted({int(n) for n in re.findall(r"#(\d+)", texto)})


def toca_sql(cuerpo, titulo):
    heno = normaliza(cuerpo + " " + titulo)
    return sorted({s for s in SENALES_SQL if s in heno})


def slug(titulo, maximo=50):
    """Palabras enteras, sin tildes, separadas por guiones, hasta `maximo` caracteres."""
    salida = ""
    for palabra in re.sub(r"[^a-z0-9]+", " ", sin_tildes(titulo).lower()).split():
        if len(salida) + len(palabra) + 1 > maximo:
            if not salida:
                return palabra[:maximo]   # una sola palabra larguisima: se corta
            break
        salida = f"{salida}-{palabra}" if salida else palabra
    return salida


def metrica(clave, valor):
    if RUN:
        subprocess.run([sys.executable, str(FABRICA / "herramientas" / "obs.py"),
                        "metrica", str(RUN), "01-entrar", clave, str(valor)],
                       capture_output=True)


def fallo(motivo):
    print(f"\nFALLO: {motivo}")
    sys.exit(1)


def elegir():
    abiertos = gh_json("issue", "list", "--state", "open", "--label", "ready-for-agent",
                       "--limit", "50", "--json", "number,title")
    if not abiertos:
        fallo("no hay ningun issue abierto con la etiqueta ready-for-agent")
    abiertos.sort(key=lambda i: i["number"])
    print(f"Sin numero: cojo el mas antiguo de la cola -> #{abiertos[0]['number']} {abiertos[0]['title']}")
    return abiertos[0]["number"]


def main():
    if not RUN:
        fallo("falta FABRICA_RUN (lo exporta fabrica.sh o la skill)")
    numero = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else elegir()

    try:
        issue = gh_json("issue", "view", str(numero), "--comments",
                        "--json", "number,title,body,labels,state,comments")
    except RuntimeError as e:
        fallo(f"no puedo leer el issue #{numero} ({e})")

    cuerpo, titulo = issue["body"] or "", issue["title"]
    etiquetas = [l["name"] for l in issue["labels"]]
    criterios = criterios_de(cuerpo)
    bloqueos = bloqueos_de(cuerpo)
    sql = toca_sql(cuerpo, titulo)

    problemas = []
    if issue["state"] != "OPEN":
        problemas.append(f"el issue esta {issue['state'].lower()}, no abierto")
    if "ready-for-agent" not in etiquetas:
        problemas.append("no lleva la etiqueta ready-for-agent (no es materia prima de esta fabrica)")
    if not criterios:
        problemas.append("no tiene criterios de aceptacion; sin eso no hay forma de saber si salio bien")

    pendientes = [n for n in bloqueos
                  if gh_json("issue", "view", str(n), "--json", "state")["state"] != "CLOSED"]
    if pendientes:
        problemas.append("sigue bloqueado por " + ", ".join(f"#{n}" for n in pendientes))

    # No repetir trabajo: solo si una PR abierta lo CIERRA (Closes #N) o su rama es factory/N-.
    abiertas = gh_json("pr", "list", "--state", "open", "--limit", "50",
                       "--json", "number,title,body,headRefName")
    cierra = re.compile(rf"\b(?:closes|close|fixes|fix|resuelve|resolves)\s+#{numero}\b", re.I)
    ya = [p["number"] for p in abiertas
          if cierra.search((p["body"] or "") + " " + p["title"])
          or (p["headRefName"] or "").startswith(f"factory/{numero}-")]
    if ya:
        problemas.append("ya hay una PR abierta que lo cierra: " + ", ".join(f"#{n}" for n in ya))

    rama = f"factory/{numero}-{slug(titulo)}"
    datos = {
        "numero": numero, "titulo": titulo, "estado": issue["state"],
        "etiquetas": etiquetas, "slug": slug(titulo), "rama": rama,
        "criterios": criterios, "bloqueado_por": bloqueos,
        "toca_sql": bool(sql), "senales_sql": sql,
        "comentarios": len(issue["comments"]), "cuerpo": cuerpo,
    }
    (RUN / "issue.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")

    # Linea base del arbol: la persona puede tener trabajo a medias y la fabrica no debe
    # confundirlo con lo que deja sucio el implementador. Lo compara el paso 05.
    (RUN / "baseline-status.txt").write_text(
        subprocess.run(["git", "-C", str(REPO), "status", "--porcelain"], capture_output=True,
                       text=True, encoding="utf-8", errors="replace").stdout, encoding="utf-8")

    metrica("criterios_aceptacion", len(criterios))
    metrica("toca_sql", int(bool(sql)))
    metrica("bloqueado", int(bool(pendientes)))

    print(f"#{numero} · {titulo}")
    print(f"  rama:      {rama}")
    print(f"  criterios: {len(criterios)}")
    for c in criterios:
        print(f"    - {c}")
    print(f"  toca SQL:  {'SI (' + ', '.join(sql) + ')' if sql else 'no'}")

    if problemas:
        fallo("; ".join(problemas) + f" (detalle en {RUN / 'issue.json'})")
    print(f"\nissue aceptado -> {RUN / 'issue.json'}")


def autotest():
    """Autocomprobacion sin red: parsing, slug y deteccion de SQL."""
    cuerpo = """## Parent

#123

## Acceptance criteria

- [ ] Los archivos resultantes respetan el limite de lineas.
- [x] No hay cambio de comportamiento visible.

## Blocked by

- #125
"""
    assert len(criterios_de(cuerpo)) == 2, criterios_de(cuerpo)
    assert bloqueos_de(cuerpo) == [125], bloqueos_de(cuerpo)
    assert seccion(cuerpo, SECCIONES_CRITERIOS).startswith("- [ ] Los archivos"), seccion(cuerpo, SECCIONES_CRITERIOS)
    # «What to build» aparece antes pero no es la seccion de criterios: manda el orden de preferencia.
    assert seccion("## What to build\n\nDescripcion\n\n## Acceptance criteria\n\n- [ ] uno", SECCIONES_CRITERIOS) == "- [ ] uno"
    assert seccion("## Nada\n\n- [ ] x", SECCIONES_CRITERIOS) == ""
    assert criterios_de("## Criterios de aceptación\n\n- [ ] Con tildes") == ["Con tildes"]
    assert criterios_de("sin seccion\n- [ ] suelto") == ["suelto"]
    assert toca_sql("hay que tocar sp-builder.ts", "x") == ["sp-builder"]
    assert toca_sql("refactor de UI", "balance del periodo") == []
    assert slug("Partir el panel de progreso en subcomponentes presentacionales") == "partir-el-panel-de-progreso-en-subcomponentes", slug("Partir el panel de progreso en subcomponentes presentacionales")
    assert slug("ÁÉÍ ó Ú?") == "aei-o-u"
    assert slug("x" * 60) == "x" * 50
    assert slug("") == ""
    print("autotest 01-entrar: OK")


if __name__ == "__main__":
    if "--autotest" in sys.argv:
        autotest()
    else:
        main()
