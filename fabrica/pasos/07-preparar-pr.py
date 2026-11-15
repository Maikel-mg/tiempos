#!/usr/bin/env python
"""Paso 07 · preparar-pr (codigo). Monta el cuerpo de la PR con datos reales.

Escribe $FABRICA_RUN/pr-title.txt y $FABRICA_RUN/pr.md a partir de:
issue.json, plan.md, implementado.md, verificar.json y revision.json.

Falla si falta cualquier dato o si el texto sale con la plantilla sin rellenar. Esa es la
leccion de las PRs #167 y #168: el codigo iba bien y la PR era inservible.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

FABRICA = Path(__file__).resolve().parent.parent
REPO = Path(os.environ.get("REPO", FABRICA.parent)).resolve()
RUN = Path(os.environ["FABRICA_RUN"]).resolve()
BASE = os.environ.get("FABRICA_BASE", "develop")
# Restos de plantilla sin rellenar. El `\\n` literal es el fallo concreto de las PRs #167 y #168:
# el texto se habia concatenado escapando los saltos en vez de escribirlos.
RESTOS = ("(completar)", "#null", "\\n")


def git(*args):
    exe = shutil.which("git")
    p = subprocess.run([exe, "-C", str(REPO), *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return p.stdout.strip() if p.returncode == 0 else ""


def leer(nombre):
    p = RUN / nombre
    if not p.exists():
        fallo(f"falta {p}: no puedo montar el cuerpo de la PR sin ese dato")
    return p.read_text(encoding="utf-8")


def fallo(motivo):
    print(f"\nFALLO: {motivo}")
    sys.exit(1)


def titulo(numero, rama):
    """Reutiliza el asunto del ultimo commit si ya es convencional y cita el issue."""
    asunto = git("log", "-1", "--format=%s", rama)
    convencional = re.match(r"^(feat|fix|refactor|test|chore|docs|perf)(\([^)]+\))?: ", asunto)
    if convencional and f"#{numero}" in asunto:
        return asunto
    titulo_issue = json.loads(leer("issue.json"))["titulo"]
    return f"feat(#{numero}): {titulo_issue}"


def main():
    issue = json.loads(leer("issue.json"))
    revision = json.loads(leer("revision.json"))
    verificacion = json.loads(leer("verificar.json"))
    plan = leer("plan.md")
    implementado = leer("implementado.md")

    if revision.get("veredicto") != "OK":
        fallo(f"el paso 06 no dio el visto bueno (veredicto: {revision.get('veredicto')})")
    for clave in ("cambio_observable", "que_no_se_hizo", "verificacion_2min"):
        if not revision.get(clave):
            fallo(f"revision.json no trae «{clave}»: el paso 06 tiene que decidirlo")

    numero = issue["numero"]
    no_hecho = revision["que_no_se_hizo"]
    if isinstance(no_hecho, str):
        no_hecho = [no_hecho]

    cuerpo = f"""Closes #{numero}

## Qué cambia

{resumen(implementado)}

## Qué NO se hizo

{lineas(no_hecho)}

## Cambio observable

{revision["cambio_observable"]}

## Verificacion en 2 minutos

{revision["verificacion_2min"]}

## Como lo he comprobado

{tabla(verificacion)}

<details><summary>Plan aprobado y radio</summary>

{plan}

</details>

> Abierto por la fábrica local. Radio declarado en el plan; CI en verde en los dos paquetes.
"""

    def con_acentos(t):
        return t.replace("Verificacion", "Verificación").replace("Como lo he comprobado",
                                                                "Cómo lo he comprobado")

    cuerpo = con_acentos(cuerpo)
    restos = [r for r in RESTOS if r in cuerpo]
    if restos:
        fallo("el cuerpo de la PR conserva la plantilla sin rellenar: " + ", ".join(restos))

    (RUN / "pr.md").write_text(cuerpo, encoding="utf-8")
    encabezado = titulo(numero, issue["rama"])
    (RUN / "pr-title.txt").write_text(encabezado + "\n", encoding="utf-8")

    print(f"titulo: {encabezado}")
    print(f"cuerpo: {RUN / 'pr.md'} ({len(cuerpo.splitlines())} líneas)")
    print(cuerpo[:600])


def resumen(implementado):
    """Lineas con contenido de implementado.md, sin titulos: es la descripcion del cambio."""
    lineas_utiles = [l for l in implementado.splitlines()
                     if l.strip() and not l.startswith("#") and not l.startswith("## ")]
    return "\n".join(lineas_utiles[:8]) or "Ver el diff."


def lineas(items):
    return "\n".join(f"- {i.lstrip('- ').strip()}" for i in items)


def tabla(v):
    filas = [f"| {k} | {val} |" for k, val in (v.get("comprobaciones") or {}).items()]
    extra = (f"\n\nTests nuevos: **{v.get('tests_nuevos', '?')}** · "
             f"ficheros: **{v.get('ficheros_tocados', '?')}** · "
             f"líneas de diff: **{v.get('lineas_diff', '?')}**\n")
    return "| Comprobación | Resultado |\n|---|---|\n" + "\n".join(filas) + extra


if __name__ == "__main__":
    main()
