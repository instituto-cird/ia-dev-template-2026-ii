"""
tests/test_politica_agente.py · Ejercitario M1, clase 1.

La política de permisos del agente es configuración, no prosa: esta prueba
verifica que los comandos de la lista «nunca sin preguntar» no queden
autoaprobados. Revisa .vscode/settings.json (Copilot en VS Code) y,
si existe, opencode.json (OpenCode).
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


@pytest.mark.skipif(not OPENCODE.exists(), reason="sin opencode.json")
@pytest.mark.parametrize("comando", NUNCA_SIN_PREGUNTAR)
def test_opencode_no_permite(comando: str) -> None:
    permiso = _cargar(OPENCODE).get("permission", "ask")
    if isinstance(permiso, str):
        assert permiso != "allow", "permission: \"allow\" aprueba todo"
        return
    bash = permiso.get("bash", permiso.get("*", "ask"))
    if isinstance(bash, str):
        assert bash != "allow", f"bash: \"allow\" aprueba '{comando}'"
        return
    # Gana el último patrón que coincide (documentación de OpenCode).
    decision = "ask"
    for patron, valor in bash.items():
        if re.fullmatch(re.escape(patron).replace(r"\*", ".*"), comando):
            decision = valor
    assert decision != "allow", f"'{comando}' queda permitido en {OPENCODE.name}"
