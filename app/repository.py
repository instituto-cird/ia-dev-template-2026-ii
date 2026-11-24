"""
app/repository.py — Acceso de solo lectura a los datos de muestra de LegacyPay.

Fuente: data/merchants_sample.json. En producción esto sería la base de datos.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "merchants_sample.json"


@lru_cache(maxsize=1)
def _load() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return {"merchants": [], "transactions_sample": []}
    with DATA_FILE.open(encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)
    return data


def list_merchants() -> list[dict[str, Any]]:
    return list(_load().get("merchants", []))


def get_merchant(merchant_id: str) -> dict[str, Any] | None:
    wanted = merchant_id.strip().upper()
    return next((m for m in list_merchants() if m["merchant_id"] == wanted), None)


def list_transactions(
    merchant_id: str | None = None, status: str | None = None
) -> list[dict[str, Any]]:
    txs: list[dict[str, Any]] = list(_load().get("transactions_sample", []))
    if merchant_id:
        txs = [t for t in txs if t["merchant_id"] == merchant_id.strip().upper()]
    if status:
        txs = [t for t in txs if t["status"] == status]
    return sorted(txs, key=lambda t: t["timestamp"], reverse=True)
