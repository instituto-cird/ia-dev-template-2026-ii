"""
tests/test_politica_agente.py · Ejercitario M1, clase 1.

La política de permisos del agente es configuración, no prosa: esta prueba
verifica que los comandos de la lista «nunca sin preguntar» no queden
autoaprobados. Revisa .vscode/settings.json (Copilot en VS Code) y,
si existe, opencode.json (OpenCode 1 o 2).
"""

import json
import re
from pathlib import Path
from typing import Any, cast

import pytest

RAIZ = Path(__file__).resolve().parent.parent
VSCODE = RAIZ / ".vscode" / "settings.json"
OPENCODE = RAIZ / "opencode.json"

# Comandos que nunca deben ejecutarse sin una persona que los apruebe.
# Cada estudiante agrega los de su propia tarea.
NUNCA_SIN_PREGUNTAR = [
    "git push origin main",
    "rm -rf data",
    "uv add requests",
]


def _cargar(ruta: Path) -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(ruta.read_text(encoding="utf-8")))


def _regla_vscode(reglas: dict[str, Any], comando: str) -> bool | None:
    """Devuelve True/False si alguna regla coincide; None si ninguna coincide.

    Una regla False tiene prioridad, como en VS Code.
    """
    coincidencias = []
    for patron, valor in reglas.items():
        if patron.startswith("/") and patron.endswith("/"):
            ok = re.search(patron[1:-1], comando) is not None
        else:
            ok = comando == patron or comando.startswith(patron + " ")
        if ok:
            coincidencias.append(bool(valor))
    if not coincidencias:
        return None
    return all(coincidencias)


def test_existe_alguna_politica() -> None:
    assert VSCODE.exists() or OPENCODE.exists(), (
        "Falta la política del agente: crear .vscode/settings.json u opencode.json"
    )


@pytest.mark.skipif(not VSCODE.exists(), reason="sin .vscode/settings.json")
@pytest.mark.parametrize("comando", NUNCA_SIN_PREGUNTAR)
def test_vscode_no_autoaprueba(comando: str) -> None:
    reglas = _cargar(VSCODE).get("chat.tools.terminal.autoApprove", {})
    assert _regla_vscode(reglas, comando) is not True, (
        f"'{comando}' quedó autoaprobado en {VSCODE.name}"
    )


def _patron_opencode(patron: str, comando: str) -> bool:
    """Comodines de OpenCode: * es cualquier texto y ? un solo carácter.

    En OpenCode 2, un patrón de shell que termina en « *» también
    coincide con el comando sin argumentos («git push *» con «git push»).
    """
    regex = re.escape(patron).replace(r"\*", ".*").replace(r"\?", ".")
    if re.fullmatch(regex, comando):
        return True
    return patron.endswith(" *") and comando == patron[:-2]


def _decision_opencode(conf: dict[str, Any], comando: str) -> str:
    """Devuelve allow, ask o deny para un comando de terminal.

    Lee los dos formatos: OpenCode 2 (lista «permissions», acción «shell»)
    y OpenCode 1 («permission» → «bash»). En los dos gana la última regla
    que coincide; si ninguna coincide, OpenCode pregunta (ask).
    """
    reglas = conf.get("permissions")
    if isinstance(reglas, list):
        decision = "ask"
        for regla in reglas:
            if regla.get("action") != "shell":
                continue
            if _patron_opencode(regla.get("resource", ""), comando):
                decision = regla.get("effect", "ask")
        return decision

    permiso = conf.get("permission", "ask")
    if isinstance(permiso, str):
        return permiso
    bash = permiso.get("bash", permiso.get("*", "ask"))
    if isinstance(bash, str):
        return bash
    decision = "ask"
    for patron, valor in bash.items():
        if _patron_opencode(patron, comando):
            decision = valor
    return decision


@pytest.mark.skipif(not OPENCODE.exists(), reason="sin opencode.json")
@pytest.mark.parametrize("comando", NUNCA_SIN_PREGUNTAR)
def test_opencode_no_permite(comando: str) -> None:
    decision = _decision_opencode(_cargar(OPENCODE), comando)
    assert decision != "allow", f"'{comando}' queda permitido en {OPENCODE.name}"
