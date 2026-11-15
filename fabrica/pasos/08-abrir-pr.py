#!/usr/bin/env python
"""Paso 08 · abrir-pr (codigo). Empuja la rama, abre la PR y comenta el issue.

Es el unico paso que sale fuera, y es el producto de la fabrica: una PR lista para revisar.
No mergea y no toca `develop` ni `main`: solo empuja `factory/<issue>-<slug>`.
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


def run(*args, cwd=None):
    exe = shutil.which(args[0])
    if exe:
        args = (exe, *args[1:])
    p = subprocess.run(list(args), cwd=str(cwd or REPO), capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return p.returncode, (p.stdout or "").strip(), (p.stderr or "").strip()


def fallo(motivo):
    print(f"\nFALLO: {motivo}")
    sys.exit(1)


def nota(texto, tipo="aviso"):
    run(sys.executable, str(FABRICA / "herramientas" / "obs.py"), "nota",
        str(RUN), "08-abrir-pr", texto, "--tipo", tipo)


def main():
    issue = json.loads((RUN / "issue.json").read_text(encoding="utf-8"))
    rama = issue["rama"]
    encabezado = (RUN / "pr-title.txt").read_text(encoding="utf-8").strip()
    cuerpo = (RUN / "pr.md").read_text(encoding="utf-8")

    if not encabezado or "(completar)" in cuerpo:
        fallo("el cuerpo o el titulo de la PR no estan listos (paso 07)")

    codigo, salida, error = run("git", "push", "-u", "origin", rama)
    if codigo != 0:
        fallo(f"no puedo empujar la rama `{rama}`: {error[:300] or salida[:300]}")

    # Si ya existia una PR para esta rama (por un reintento), se actualiza en vez de duplicar.
    codigo, existentes, _ = run("gh", "pr", "list", "--head", rama, "--state", "open",
                                "--json", "number,url")
    previas = json.loads(existentes) if codigo == 0 and existentes else []
    if previas:
        numero_pr, url = previas[0]["number"], previas[0]["url"]
        codigo, _, error = run("gh", "pr", "edit", str(numero_pr), "--title", encabezado,
                               "--body-file", str(RUN / "pr.md"))
        accion = "actualizada"
        if codigo != 0:
            fallo(f"no puedo actualizar la PR #{numero_pr}: {error[:300]}")
    else:
        codigo, salida, error = run("gh", "pr", "create", "--base", BASE, "--head", rama,
                                    "--title", encabezado, "--body-file", str(RUN / "pr.md"))
        if codigo != 0:
            fallo(f"no puedo abrir la PR: {error[:300] or salida[:300]}")
        url = salida.splitlines()[-1].strip()
        m = re.search(r"/pull/(\d+)", url)
        numero_pr = int(m.group(1)) if m else 0
        accion = "abierta"

    comentario = (f"La fábrica ha preparado la PR {url} sobre `{BASE}`.\n\n"
                  f"Radio declarado en el plan. No está mergeada: el merge lo decides tú.")
    codigo, _, error = run("gh", "issue", "comment", str(issue["numero"]), "--body", comentario)
    if codigo != 0:
        nota(f"la PR {url} se abrio pero no pude comentar el issue #{issue['numero']}: {error[:200]}")

    (RUN / "pr.json").write_text(json.dumps(
        {"numero": numero_pr, "url": url, "rama": rama, "accion": accion},
        ensure_ascii=False, indent=2), encoding="utf-8")
    run(sys.executable, str(FABRICA / "herramientas" / "obs.py"), "metrica",
        str(RUN), "08-abrir-pr", "pr", str(numero_pr))
    nota(f"PR {accion}: {url}. El merge espera a la persona.", "espera-ok")

    print(f"PR {accion}: {url}")
    print(f"rama: {rama} -> {BASE}")
    print(f"\nEspera tu OK: revisa y mergea tú ({url}).")


if __name__ == "__main__":
    main()
