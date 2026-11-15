#!/usr/bin/env python
"""Paso 03 · puerta-sql (codigo). Solo actua si el issue toca SQL Server o datos reales.

Si no toca SQL: pasa de largo (exit 0) y lo deja anotado.
Si toca SQL y no existe $FABRICA_RUN/ok-sql: ensena el plan y sale con codigo 2, que el
orquestador interpreta como «espera el OK de la persona».

Aprobar (la persona, despues de leer el plan):
    echo ok > fabrica/runs/<id>/ok-sql
Reanudar:
    ./fabrica.sh --reanudar fabrica/runs/<id>
"""
import json
import os
import subprocess
import sys
from pathlib import Path

FABRICA = Path(__file__).resolve().parent.parent
RUN = Path(os.environ["FABRICA_RUN"]).resolve()


def nota(texto, tipo="aviso"):
    subprocess.run([sys.executable, str(FABRICA / "herramientas" / "obs.py"), "nota",
                    str(RUN), "03-puerta-sql", texto, "--tipo", tipo], capture_output=True)


def main():
    datos = json.loads((RUN / "issue.json").read_text(encoding="utf-8"))
    if not datos["toca_sql"]:
        nota("no toca SQL Server: la puerta no aplica")
        print("no toca SQL Server -> adelante")
        return

    if (RUN / "ok-sql").exists():
        nota("la persona aprobo la puerta-sql")
        print(f"OK de la persona registrado en {RUN / 'ok-sql'} -> adelante")
        return

    plan = (RUN / "plan.md").read_text(encoding="utf-8") if (RUN / "plan.md").exists() else "(no hay plan)"
    print(f"Este issue toca SQL Server ({', '.join(datos['senales_sql'])}).")
    print("La fabrica NO ejecutara SQL: solo escribira codigo y tests. Pero el cambio puede")
    print("afectar a lo que ya funciona contra tu base de datos, asi que para aqui.\n")
    print("--- plan que hay que aprobar " + "-" * 40)
    print(plan)
    print("-" * 70)
    print(f"\nSi lo apruebas:  echo ok > {RUN / 'ok-sql'}")
    print(f"Y sigues con:    ./fabrica.sh --reanudar {RUN}")
    nota("espera OK de la persona: el issue toca SQL Server", "espera-ok")
    sys.exit(2)


if __name__ == "__main__":
    main()
