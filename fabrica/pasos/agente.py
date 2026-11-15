#!/usr/bin/env python
"""Lanza UN paso de agente en modo no interactivo con pi.

Uso: python pasos/agente.py <paso> [modelo] [texto extra]

- Las instrucciones del paso estan en pasos/<paso>.md; el agente las sigue.
- Permisos minimos: los pasos que no deben escribir ficheros arrancan sin `edit` ni `write`.
- Guardia: los pasos de solo lectura fallan si han tocado el repo (git status cambia).
- Falla si la ultima linea empieza por FALLO:, o si pi termina con error.

No apunta coste: el plan es una suscripcion (opencode go), asi que el coste marginal de un
paso es 0. Lo que se mide es el tiempo, y eso lo mide obs.py.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

FABRICA = Path(__file__).resolve().parent.parent
REPO = Path(os.environ.get("REPO", FABRICA.parent)).resolve()
RUN = Path(os.environ["FABRICA_RUN"]).resolve()
OBS = FABRICA / "herramientas" / "obs.py"

ESCRIBEN = {"04-implementar"}          # solo el implementador cambia ficheros
TOOLS_LECTURA = "read,bash,grep,find,ls"
TOOLS_ESCRITURA = "read,bash,edit,write,grep,find,ls"


def git_status():
    exe = shutil.which("git")
    p = subprocess.run([exe, "-C", str(REPO), "status", "--porcelain"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return p.stdout


def main():
    if len(sys.argv) < 2:
        sys.exit("Uso: agente.py <paso> [modelo] [extra]")
    paso = sys.argv[1]
    modelo = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("FABRICA_MODELO", "")
    extra = sys.argv[3] if len(sys.argv) > 3 else ""

    instrucciones = FABRICA / "pasos" / f"{paso}.md"
    if not instrucciones.exists():
        sys.exit(f"FALLO: no existe {instrucciones}")

    prompt = (
        f"Eres el paso `{paso}` de esta fabrica de software. "
        f"La fabrica esta en {FABRICA} y esta ejecucion en FABRICA_RUN={RUN} (rutas absolutas).\n"
        f"Lee {FABRICA / 'AGENTS.md'} y sigue {instrucciones} al pie de la letra.\n"
        f"El proyecto sobre el que trabajas esta en {REPO}: cualquier git, con git -C {REPO}. "
        f"Escribe dentro de {RUN} o dentro del repo solo si tu paso lo permite.\n"
        f"Tus decisiones: python {OBS} nota \"{RUN}\" {paso} \"...\"\n"
        f"Si no puedes completar el paso, termina con una ultima linea que empiece por FALLO: y el motivo."
    )
    if extra:
        prompt += f"\n\n{extra}"

    antes = git_status()
    comando = [os.environ.get("FABRICA_PI", "pi"), "--print", "--no-session",
               "--tools", TOOLS_ESCRITURA if paso in ESCRIBEN else TOOLS_LECTURA]
    if modelo:
        comando += ["--model", modelo]
    comando.append(prompt)

    exe = shutil.which(comando[0])
    if not exe:
        sys.exit(f"FALLO: no encuentro el CLI `{comando[0]}` en el PATH")
    comando[0] = exe

    print(f"$ {' '.join(comando[:6])} …")
    p = subprocess.run(comando, cwd=str(REPO), capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    salida = (p.stdout or "") + (("\n" + p.stderr) if p.stderr else "")
    (RUN / f".agente-{paso}.txt").write_text(salida, encoding="utf-8")
    print(salida)

    if paso not in ESCRIBEN and git_status() != antes:
        print("FALLO: este paso no debia tocar el proyecto y git status ha cambiado")
        return 1
    if p.returncode != 0:
        print(f"FALLO: pi termino con codigo {p.returncode}")
        return 1
    ultima = [l for l in salida.splitlines() if l.strip()]
    if ultima and ultima[-1].startswith("FALLO"):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
