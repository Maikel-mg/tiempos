#!/usr/bin/env python
"""Paso 05 · verificar (codigo). El loop de verdad: lint, tests y radio.

No opina sobre la calidad: eso es el paso 06. Aqui solo se comprueba lo que una maquina
puede comprobar. Si algo falla, escribe $FABRICA_RUN/devuelto.md con los motivos y sale 1,
que devuelve el trabajo al paso 04.
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
RUN = Path(os.environ.get("FABRICA_RUN", ".")).resolve()
BASE = os.environ.get("FABRICA_BASE", "develop")
PROHIBIDOS = ("fabrica/", "cerebro/")
LIMITE_COMPONENTE = 150


def sh(*args, cwd=None):
    """Ejecuta y devuelve (ok, salida). En Windows npm es npm.cmd: se resuelve la ruta real."""
    args = list(args)
    exe = shutil.which(args[0])
    if exe:
        args[0] = exe
    p = subprocess.run(args, cwd=str(cwd or REPO), capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return p.returncode == 0, (p.stdout or "") + (p.stderr or "")


def git(*args):
    ok, salida = sh("git", "-C", str(REPO), *args)
    return salida.strip() if ok else ""


def radio_de(plan):
    """Lista de patrones de la seccion `## Radio` de plan.md."""
    if not plan.exists():
        return []
    dentro, patrones = False, []
    for linea in plan.read_text(encoding="utf-8").splitlines():
        if re.match(r"^##\s+Radio\s*$", linea):
            dentro = True
            continue
        if dentro and re.match(r"^##\s+", linea):
            break
        if dentro:
            m = re.match(r"^\s*[-*]\s+`?([^`\s]+)`?\s*$", linea)
            if m:
                patrones.append(m.group(1).replace("\\", "/"))
    return patrones


def cubierto(fichero, patrones):
    """`carpeta/*` cubre solo los hijos directos, no todo el arbol. Un fichero suelto, el fichero."""
    for p in patrones:
        if p.endswith("/*"):
            carpeta = p[:-2]
            resto = fichero[len(carpeta) + 1:]
            if fichero.startswith(carpeta + "/") and "/" not in resto:
                return True
        elif fichero == p:
            return True
    return False


def ruta(linea_status):
    """Ruta de una linea de `git status --porcelain` (XY + espacio + ruta).

    git() quita el espacio inicial de la primera linea al hacer strip() sobre toda la salida,
    asi que se recorta desde el caracter 2, no desde el 3.
    """
    return linea_status[2:].strip()


def metrica(clave, valor):
    subprocess.run([sys.executable, str(FABRICA / "herramientas" / "obs.py"), "metrica",
                    str(RUN), "05-verificar", clave, str(valor)], capture_output=True)


def devolver(motivos):
    texto = "# Devuelto por el paso 05 (verificar)\n\n" + "\n".join(f"- {m}" for m in motivos)
    texto += "\n\nArregla exactamente esto en el paso 04. No rehagas lo que ya estaba bien.\n"
    (RUN / "devuelto.md").write_text(texto, encoding="utf-8")
    (RUN / "verificar.json").write_text(json.dumps({"ok": False, "motivos": motivos},
                                                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(texto)
    print("FALLO: la verificacion devuelve el trabajo al paso 04")
    sys.exit(1)


def main():
    datos = json.loads((RUN / "issue.json").read_text(encoding="utf-8"))
    plan = RUN / "plan.md"
    patrones = radio_de(plan)
    if not patrones:
        devolver(["`plan.md` no declara `## Radio` (o está vacío): sin radio no se puede verificar nada."])

    rama = datos["rama"]
    actual = git("rev-parse", "--abbrev-ref", "HEAD")
    if actual != rama:
        devolver([f"la rama actual es `{actual}` y debería ser `{rama}`."])

    sucio = [l for l in git("status", "--porcelain").splitlines() if l.strip()]
    base_sucio = set()
    if (RUN / "baseline-status.txt").exists():
        base_sucio = {l.strip() for l in
                      (RUN / "baseline-status.txt").read_text(encoding="utf-8").splitlines()
                      if l.strip()}
    nuevos = [l for l in sucio if l.strip() not in base_sucio]
    if nuevos:
        devolver(["hay cambios sin commitear que no estaban al empezar: " + ", ".join(
            ruta(l) for l in nuevos[:10]) + ". Commitea lo que hayas tocado y deja el resto como estaba."])
    del_radio = [ruta(l) for l in sucio if ruta(l) in radio_de(plan)]
    if del_radio:
        devolver(["ficheros del radio con cambios sin commitear: " + ", ".join(del_radio)])

    base = git("merge-base", BASE, "HEAD") or BASE
    ficheros = [f for f in git("diff", "--name-only", base, "HEAD").splitlines() if f]
    if not ficheros:
        devolver(["la rama no tiene ningún cambio respecto a `develop`."])

    fuera = [f for f in ficheros if not cubierto(f, patrones)]
    prohibidos = [f for f in ficheros if f.startswith(PROHIBIDOS)]
    motivos = []
    if fuera:
        motivos.append("ficheros tocados fuera del radio: " + ", ".join(fuera))
    if prohibidos:
        motivos.append("la fábrica se ha tocado a sí misma: " + ", ".join(prohibidos))

    comprobaciones = [
        ("backend lint", ["npm", "run", "lint"], REPO),
        ("backend build", ["npm", "run", "build:backend"], REPO),
        ("backend tests", ["npm", "test"], REPO),
        ("web-ui lint", ["npm", "run", "lint"], REPO / "web-ui"),
        ("web-ui type-check", ["npm", "run", "type-check"], REPO / "web-ui"),
        ("web-ui tests", ["npm", "run", "test:run"], REPO / "web-ui"),
    ]
    resultados = {}
    for nombre, cmd, cwd in comprobaciones:
        ok, salida = sh(*cmd, cwd=cwd)
        resultados[nombre] = "verde" if ok else "rojo"
        print(f"[{nombre}] {'verde' if ok else 'ROJO'}")
        if not ok:
            cola = "\n".join(salida.strip().splitlines()[-12:])
            motivos.append(f"`{nombre}` en rojo:\n```\n{cola}\n```")

    # Metricas: las cuenta solo este paso.
    diff = git("diff", "--unified=0", base, "HEAD")
    tests_nuevos = len([l for l in diff.splitlines()
                        if l.startswith("+") and re.match(r"\+\s*(it|test)(\.\w+)?\(", l)])
    lineas = sum(int(n) for n in re.findall(r"^[+-](?!\+\+|--)", diff, re.M))
    largos = [f for f in ficheros if f.endswith(".tsx")
              and (REPO / f).exists() and len((REPO / f).read_text(encoding="utf-8").splitlines()) > LIMITE_COMPONENTE]
    metrica("tests_nuevos", tests_nuevos)
    metrica("ficheros_tocados", len(ficheros))
    metrica("lineas_diff", lineas)
    metrica("componentes_largos", len(largos))

    print(f"\nradio: {len(ficheros)} ficheros · tests nuevos: {tests_nuevos} · líneas: {lineas}")
    if largos:
        print("componentes presentacionales de más de 150 líneas (señal, no bloqueo): " + ", ".join(largos))

    if motivos:
        devolver(motivos)

    (RUN / "verificar.json").write_text(json.dumps({
        "ok": True, "rama": rama, "ficheros": ficheros, "tests_nuevos": tests_nuevos,
        "lineas_diff": lineas, "componentes_largos": largos, "comprobaciones": resultados,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nverificado -> {RUN / 'verificar.json'}")



def autotest():
    """Autocomprobacion sin red: radio y matching de globs."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        plan = Path(d) / "plan.md"
        plan.write_text("""# Plan

## Radio
- web-ui/src/features/agenda/components/PeriodProgressPanel.tsx
- `web-ui/src/features/agenda/components/*`
- web-ui/src/lib/balance.ts

## Criterios de aceptación → comprobación
- [ ] uno → test: x
""", encoding="utf-8")
        patrones = radio_de(plan)
    assert patrones == ["web-ui/src/features/agenda/components/PeriodProgressPanel.tsx",
                        "web-ui/src/features/agenda/components/*",
                        "web-ui/src/lib/balance.ts"], patrones
    assert cubierto("web-ui/src/features/agenda/components/PeriodProgressPanel.tsx", patrones)
    assert cubierto("web-ui/src/features/agenda/components/TotalRow.tsx", patrones)
    assert not cubierto("web-ui/src/features/agenda/components/deep/TotalRow.tsx", patrones)
    assert not cubierto("server.ts", patrones)
    assert radio_de(Path("no-existe.md")) == []
    assert ruta(" M AGENTS.md") == "AGENTS.md"
    assert ruta("M AGENTS.md") == "AGENTS.md"          # primera linea, ya sin el espacio inicial
    assert ruta("?? .claude/") == ".claude/"
    assert ruta("AM src/x.ts") == "src/x.ts"
    assert "fabrica/runs/x".startswith(PROHIBIDOS)
    print("autotest 05-verificar: OK")


if __name__ == "__main__":
    if "--autotest" in sys.argv:
        autotest()
    else:
        main()
