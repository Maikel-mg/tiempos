#!/usr/bin/env python
"""Orquestador de la fabrica de issues. Encadena los pasos de PLANO.md.

Uso:
    python fabrica/fabrica.py 128              un issue concreto
    python fabrica/fabrica.py                  el `ready-for-agent` abierto mas antiguo
    python fabrica/fabrica.py --reanudar fabrica/runs/<id>   tras aprobar la puerta-sql

Cada paso pasa por obs.py, que guarda su log, su duracion y su resultado. Si un paso que
comprueba falla, el trabajo vuelve al paso 04 con el motivo, hasta agotar las vueltas.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

FABRICA = Path(__file__).resolve().parent        # fabrica/fabrica.py
REPO = FABRICA.parent
OBS = FABRICA / "herramientas" / "obs.py"
PY = sys.executable
VUELTAS = 2                      # 04 ↔ 05 ↔ 06 compartidas
RUN = None


def obs(*args):
    p = subprocess.run([PY, str(OBS), *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return p.returncode, (p.stdout or "").strip()


def obs_stream(*args):
    """Como obs(), pero sin capturar: el humano ve el paso mientras corre."""
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run([PY, str(OBS), *args], env=env).returncode


def entorno(extra=None):
    env = {**os.environ, "FABRICA_RUN": str(RUN), "REPO": str(REPO),
           "PYTHONIOENCODING": "utf-8"}
    return {**env, **(extra or {})}


def parar(motivo):
    print(f"\n⛔ {motivo}")
    obs("fin", str(RUN), "fallo", "--motivo", motivo)
    print(obs("ver", str(RUN))[1])
    sys.exit(1)


def codigo(nombre, script, *args, espera_ok=False):
    """Ejecuta un paso de codigo dentro de obs.py. Devuelve True si salio bien."""
    print(f"\n── {nombre} " + "─" * (60 - len(nombre)))
    cod = obs_stream("paso", str(RUN), nombre, "--", PY, str(FABRICA / "pasos" / script), *args)
    if cod == 0:
        return True
    # obs.py devuelve el mismo codigo del comando: 2 es la puerta-sql pidiendo el OK.
    if espera_ok and cod == 2:
        print(obs("ver", str(RUN))[1])
        print("\n⏸  La fábrica se para aquí esperando tu OK. Cuando lo des:")
        print(f"    python fabrica/fabrica.py --reanudar {RUN}")
        obs("fin", str(RUN), "espera-ok", "--motivo", "puerta-sql: espera el OK de la persona")
        sys.exit(0)
    return False


def agente(nombre, modelo=""):
    args = [PY, str(FABRICA / "pasos" / "agente.py"), nombre]
    if modelo:
        args.append(modelo)
    print(f"\n── {nombre} (agente) " + "─" * (50 - len(nombre)))
    return obs_stream("paso", str(RUN), nombre, "--", *args) == 0


def main():
    global RUN
    args = sys.argv[1:]

    if args and args[0] == "--reanudar":
        RUN = Path(args[1]).resolve()
        if not (RUN / "ok-sql").exists():
            parar("no existe ok-sql en la ejecución: no hay nada que reanudar")
        print(f"▶ reanudo {RUN.name}")
        saltar_entrada = True
    else:
        entrada = args[0] if args else ""
        cod, run = obs("nuevo", "--entrada", entrada or "cola ready-for-agent")
        RUN = Path(run).resolve()
        saltar_entrada = False

    print(f"▶ run: {RUN}")

    if not saltar_entrada:
        if not codigo("01-entrar", "01-entrar.py", *(args if args and args[0].isdigit() else [])):
            parar("el issue no es apto para la fábrica (ver el log del paso 01)")
        if not agente("02-plan"):
            parar("el paso 02 no pudo planificar: el issue es ambiguo o falta contexto")
        codigo("03-puerta-sql", "03-puerta-sql.py", espera_ok=True)

    vueltas = 0
    while True:
        if not agente("04-implementar"):
            parar("el paso 04 no pudo implementar (ver el log)")
        if codigo("05-verificar", "05-verificar.py") and agente("06-revisar"):
            break
        vueltas += 1
        if vueltas >= VUELTAS:
            parar(f"la revisión sigue devolviendo el trabajo tras {vueltas} vueltas: "
                  f"mira {RUN / 'devuelto.md'}")
        print(f"\n↺ el trabajo vuelve al paso 04 (vuelta {vueltas + 1} de {VUELTAS})\n")

    if not codigo("07-preparar-pr", "07-preparar-pr.py"):
        parar("no pude montar el cuerpo de la PR (paso 07)")
    if not codigo("08-abrir-pr", "08-abrir-pr.py"):
        parar("no pude abrir la PR (paso 08)")

    agente("09-informe")
    obs("fin", str(RUN), "espera-ok", "--motivo", "la PR espera tu merge")
    print(obs("ver", str(RUN))[1])
    try:
        url = json.loads((RUN / "pr.json").read_text(encoding="utf-8"))["url"]
    except Exception:
        url = "(ver runs)"
    print(f"\n✅ PR: {url}")
    print(f"   informe: {RUN / 'informe.md'}")
    print(f"   el merge lo decides tú. Nada más ha salido fuera.")


if __name__ == "__main__":
    main()
