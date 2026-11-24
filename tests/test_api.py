"""
tests/test_api.py — Endpoints /api que consume el frontend React (web/).

El agente se prueba con el Mock LLM HTTP montado in-process (TestClient),
así los tests no dependen de que el puerto 8001 esté levantado.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import main
from app.llm_client import HttpLLMClient
from app.mock_llm import mock_app

client = TestClient(main.app)


@pytest.fixture
def in_process_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hace que HttpLLMClient hable con el Mock LLM sin red."""
    mock = TestClient(mock_app, base_url="http://mock/v1")

    def _init(self: HttpLLMClient, *args: Any, **kwargs: Any) -> None:
        self.base_url = "http://mock/v1"
        self.http = mock  # type: ignore[assignment]
        from app.llm_client import _Chat

        self.chat = _Chat(self)

    monkeypatch.setattr(HttpLLMClient, "__init__", _init)
    monkeypatch.setattr(HttpLLMClient, "close", lambda self: None)


def test_list_merchants() -> None:
    r = client.get("/api/merchants")
    assert r.status_code == 200
    ids = [m["merchant_id"] for m in r.json()]
    assert "MCHT-00042" in ids


def test_merchant_detail_includes_transactions() -> None:
    r = client.get("/api/merchants/mcht-00042")  # el ID no distingue mayúsculas
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Importadora Rápida Ltda."
    assert [t["transaction_id"] for t in body["transactions"]] == ["TXN-2025-001847"]


def test_merchant_not_found() -> None:
    r = client.get("/api/merchants/MCHT-99999")
    assert r.status_code == 404


def test_transactions_filter_by_status() -> None:
    r = client.get("/api/transactions", params={"status": "flagged"})
    assert r.status_code == 200
    txs = r.json()
    assert len(txs) == 2
    assert all(t["status"] == "flagged" for t in txs)
    assert txs[0]["timestamp"] > txs[1]["timestamp"]  # más reciente primero


def test_agent_tools_lists_registry_and_approval_actions() -> None:
    tools = {t["name"]: t for t in client.get("/api/agent/tools").json()}
    assert not tools["calculate"]["requires_approval"]
    assert tools["charge_customer"]["requires_approval"]


def test_agent_run_rejects_empty_goal() -> None:
    assert client.post("/api/agent/run", json={"goal": ""}).status_code == 422


@pytest.mark.usefixtures("in_process_llm")
def test_agent_run_calculation_finishes_with_answer() -> None:
    r = client.post("/api/agent/run", json={"goal": "¿Cuánto es 1500 * 1.08?"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == "El resultado es 1620."
    assert [s["action"] for s in body["steps"]] == ["calculate", "FINISH"]
    assert body["approved"] is True


@pytest.mark.usefixtures("in_process_llm")
def test_agent_run_merchant_lookup_does_not_loop() -> None:
    r = client.post("/api/agent/run", json={"goal": "¿Cuál es el límite diario de MCHT-00042?"})
    body = r.json()
    assert body["total_steps"] == 2
    assert "USD 50,000" in body["answer"]


def test_agent_run_returns_503_when_llm_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    # Puerto 9 (discard): nada escucha ahí, la conexión se rechaza al instante
    monkeypatch.setenv("OPENAI_BASE_URL", "http://127.0.0.1:9/v1")
    r = client.post("/api/agent/run", json={"goal": "Calcula 2 * 3"})
    assert r.status_code == 503
    assert "LLM" in r.json()["detail"]


def test_status_reports_unreachable_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_BASE_URL", "http://127.0.0.1:9/v1")
    body = client.get("/api/status").json()
    assert body["backend"] == "ok"
    assert body["llm"]["reachable"] is False
