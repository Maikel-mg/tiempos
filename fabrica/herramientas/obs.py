#!/usr/bin/env python3
"""obs.py: la telemetría de la fábrica. Solo librería estándar (Python 3.8+).

Cada ejecución vive en runs/<id>/. Todo lo que pasa queda en runs/<id>/eventos.jsonl
(una línea JSON por evento) y la salida de cada paso en runs/<id>/logs/<paso>.log.

  obs.py nuevo [--entrada FICHERO|TEXTO]          crea runs/<fecha>-<id>/ e imprime su ruta
  obs.py paso RUN NOMBRE [--intento N] -- CMD...  ejecuta CMD, guarda su salida, mide tiempo y resultado
  obs.py nota RUN PASO "texto" [--tipo T]         apunta algo (tipo: decision | aviso | espera-ok | leccion)
  obs.py metrica RUN PASO CLAVE VALOR              apunta una cifra (coste_usd, tokens, errores_encontrados…)
  obs.py fin RUN ok|fallo|espera-ok [--motivo M]  cierra la ejecución
  obs.py ver RUN                                   cronología de una ejecución
  obs.py resumen [--runs DIR] [--ultimas N]        salud de la fábrica: qué paso falla, tarda o reintenta más

Los pasos de agente deben llamar a `obs.py nota` por cada decisión que tomen por su cuenta:
es lo que luego lee el informe y lo que permite mejorar la fábrica sin vigilarla.
"""
import argparse
import datetime as dt
import json
import os
import secrets
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from pathlib import Path

RAIZ = Path(os.environ.get("FABRICA_RAIZ", Path(__file__).resolve().parent.parent))
RUNS = RAIZ / "runs"


def ahora():
    return dt.datetime.now().isoformat(timespec="seconds")


def evento(run, **datos):
    run = Path(run)
    run.mkdir(parents=True, exist_ok=True)
    datos = {"t": ahora(), **datos}
    with open(run / "eventos.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(datos, ensure_ascii=False) + "\n")


def leer(run):
    p = Path(run) / "eventos.jsonl"
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]


def cmd_nuevo(a):
    rid = f"{dt.datetime.now():%Y-%m-%d-%H%M}-{secrets.token_hex(2)}"
    run = RUNS / rid
    (run / "logs").mkdir(parents=True)
    entrada = a.entrada or ""
    if entrada and Path(entrada).exists():
        (run / "entrada").mkdir()
        src = Path(entrada)
        destino = run / "entrada" / src.name
        shutil.copytree(src, destino) if src.is_dir() else shutil.copy2(src, destino)
    elif entrada:
        (run / "entrada.txt").write_text(entrada, encoding="utf-8")
    evento(run, tipo="inicio", entrada=entrada)
    print(run)


def cmd_paso(a):
    run, nombre = Path(a.run), a.nombre
    (run / "logs").mkdir(parents=True, exist_ok=True)
    log = run / "logs" / (f"{nombre}.log" if a.intento == 1 else f"{nombre}.intento{a.intento}.log")
    cmd = a.cmd
    if not cmd:
        sys.exit("obs.py paso: falta el comando tras «--»")
    evento(run, tipo="paso-inicio", paso=nombre, intento=a.intento, cmd=" ".join(cmd)[:300])
    t0 = time.time()
    with open(log, "w", encoding="utf-8") as f:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                           env={**os.environ, "FABRICA_RUN": str(run), "FABRICA_PASO": nombre})
        f.write(p.stdout)
    dur = round(time.time() - t0, 1)
    ok = p.returncode == 0
    ultima = next((l for l in reversed(p.stdout.strip().splitlines()) if l.strip()), "")
    evento(run, tipo="paso-fin", paso=nombre, intento=a.intento, ok=ok, codigo=p.returncode,
           segundos=dur, log=str(log.relative_to(run)), **({} if ok else {"motivo": ultima[:300]}))
    sys.stdout.write(p.stdout)
    print(f"[obs] {nombre} · {'OK' if ok else 'FALLO'} · {dur}s · log: {log}", file=sys.stderr)
    sys.exit(p.returncode)


def cmd_nota(a):
    evento(a.run, tipo="nota", paso=a.paso, nota_tipo=a.tipo, texto=a.texto)


def cmd_metrica(a):
    evento(a.run, tipo="metrica", paso=a.paso, clave=a.clave, valor=float(a.valor))


def cmd_fin(a):
    evs = leer(a.run)
    t0 = next((e["t"] for e in evs if e["tipo"] == "inicio"), None)
    seg = (dt.datetime.now() - dt.datetime.fromisoformat(t0)).total_seconds() if t0 else None
    evento(a.run, tipo="fin", resultado=a.resultado, motivo=a.motivo or "",
           segundos=round(seg, 1) if seg is not None else None)


def cmd_ver(a):
    for e in leer(a.run):
        h = e["t"][11:]
        if e["tipo"] == "inicio":
            print(f"{h}  ▶ inicio  {e.get('entrada', '')}")
        elif e["tipo"] == "paso-fin":
            marca = "✓" if e["ok"] else "✗"
            extra = f" (intento {e['intento']})" if e.get("intento", 1) > 1 else ""
            print(f"{h}  {marca} {e['paso']}{extra} · {e['segundos']}s" + ("" if e["ok"] else f" · {e.get('motivo', '')}"))
        elif e["tipo"] == "nota":
            print(f"{h}    · [{e['nota_tipo']}] {e['paso']}: {e['texto']}")
        elif e["tipo"] == "metrica":
            print(f"{h}    # {e['paso']}: {e['clave']} = {e['valor']:g}")
        elif e["tipo"] == "fin":
            print(f"{h}  ■ {e['resultado']} {e.get('motivo', '')} · {e.get('segundos')}s en total")


def cmd_resumen(a):
    runs_dir = Path(a.runs) if a.runs else RUNS
    runs = sorted([r for r in runs_dir.glob("*") if (r / "eventos.jsonl").exists()])[-a.ultimas:]
    if not runs:
        print("Todavía no hay ejecuciones en", runs_dir)
        return
    pasos = defaultdict(lambda: {"n": 0, "fallos": 0, "seg": 0.0, "reint": 0, "motivos": []})
    finales = defaultdict(int)
    notas = defaultdict(int)
    metricas = defaultdict(float)
    for r in runs:
        for e in leer(r):
            if e["tipo"] == "paso-fin":
                p = pasos[e["paso"]]
                p["n"] += 1
                p["seg"] += e.get("segundos") or 0
                if e.get("intento", 1) > 1:
                    p["reint"] += 1
                if not e["ok"]:
                    p["fallos"] += 1
                    p["motivos"].append(f"{r.name}: {e.get('motivo', '')}")
            elif e["tipo"] == "fin":
                finales[e["resultado"]] += 1
            elif e["tipo"] == "nota":
                notas[e["nota_tipo"]] += 1
            elif e["tipo"] == "metrica":
                metricas[e["clave"]] += e["valor"]
    print(f"Últimas {len(runs)} ejecuciones · " + " · ".join(f"{k}: {v}" for k, v in finales.items()))
    print(f"\n{'paso':<24}{'veces':>6}{'fallos':>8}{'reintentos':>12}{'media s':>9}")
    peor = None
    for nombre, p in pasos.items():
        print(f"{nombre:<24}{p['n']:>6}{p['fallos']:>8}{p['reint']:>12}{p['seg'] / p['n']:>9.1f}")
        if p["fallos"] and (peor is None or p["fallos"] > pasos[peor]["fallos"]):
            peor = nombre
    if metricas:
        print("\nMétricas (total · media por ejecución): " + " · ".join(
            f"{k}: {v:g} · {v / len(runs):.3g}" for k, v in metricas.items()))
    if notas:
        print("\nNotas: " + " · ".join(f"{k}: {v}" for k, v in notas.items()))
    if peor:
        print(f"\nLa pieza que más falla: «{peor}». Últimos motivos:")
        for m in pasos[peor]["motivos"][-5:]:
            print("  -", m)
    else:
        print("\nNingún paso ha fallado en estas ejecuciones.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="orden", required=True)
    s = sub.add_parser("nuevo"); s.add_argument("--entrada"); s.set_defaults(f=cmd_nuevo)
    s = sub.add_parser("paso"); s.add_argument("run"); s.add_argument("nombre")
    s.add_argument("--intento", type=int, default=1); s.set_defaults(f=cmd_paso, cmd=[])
    s = sub.add_parser("nota"); s.add_argument("run"); s.add_argument("paso"); s.add_argument("texto")
    s.add_argument("--tipo", default="decision", choices=["decision", "aviso", "espera-ok", "leccion"]); s.set_defaults(f=cmd_nota)
    s = sub.add_parser("metrica"); s.add_argument("run"); s.add_argument("paso"); s.add_argument("clave")
    s.add_argument("valor"); s.set_defaults(f=cmd_metrica)
    s = sub.add_parser("fin"); s.add_argument("run"); s.add_argument("resultado", choices=["ok", "fallo", "espera-ok"])
    s.add_argument("--motivo"); s.set_defaults(f=cmd_fin)
    s = sub.add_parser("ver"); s.add_argument("run"); s.set_defaults(f=cmd_ver)
    s = sub.add_parser("resumen"); s.add_argument("--runs"); s.add_argument("--ultimas", type=int, default=20); s.set_defaults(f=cmd_resumen)
    argv = sys.argv[1:]
    cmd = []
    if "--" in argv:  # todo lo que va tras «--» es el comando del paso
        i = argv.index("--")
        argv, cmd = argv[:i], argv[i + 1:]
    a = ap.parse_args(argv)
    if cmd:
        a.cmd = cmd
    a.f(a)


if __name__ == "__main__":
    main()
