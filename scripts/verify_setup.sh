#!/usr/bin/env bash
# scripts/verify_setup.sh
# Verifica que el entorno del estudiante está correctamente configurado.
# Pensado para correrse al inicio de cada módulo nuevo.
#
# USO
#   bash scripts/verify_setup.sh
#
# SALIDA
#   Exit code 0 si TODO está bien.
#   Exit code 1 con un reporte claro si algo falla.

set -u

# Colores (si la terminal los soporta)
if [[ -t 1 ]]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[1;33m'
  BLUE=$'\033[0;34m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; BLUE=""; RESET=""
fi

PASSED=0
FAILED=0
WARNINGS=0
FAILED_CHECKS=()

check() {
  local name="$1"
  local cmd="$2"
  local hint="$3"

  printf "  %-50s " "$name"
  if eval "$cmd" >/dev/null 2>&1; then
    printf "${GREEN}✓ OK${RESET}\n"
    PASSED=$((PASSED + 1))
  else
    printf "${RED}✗ FAIL${RESET}\n"
    FAILED=$((FAILED + 1))
    FAILED_CHECKS+=("$name | hint: $hint")
  fi
}

warn() {
  local name="$1"
  local cmd="$2"
  local hint="$3"

  printf "  %-50s " "$name"
  if eval "$cmd" >/dev/null 2>&1; then
    printf "${GREEN}✓ OK${RESET}\n"
    PASSED=$((PASSED + 1))
  else
    printf "${YELLOW}⚠ NO${RESET}  ${hint}\n"
    WARNINGS=$((WARNINGS + 1))
  fi
}

# Versiones mínimas del curso (cohorte 2026-II, actualizadas el 25-oct-2026
# por el incidente de certificados de eMudhra/emSign).
UV_MIN="0.13.4"

# Compara dos versiones X.Y.Z: devuelve 0 si $1 >= $2.
version_ge() {
  local IFS=.
  local -a a=($1) b=($2)
  local i
  for i in 0 1 2; do
    local x=${a[$i]:-0} y=${b[$i]:-0}
    x=${x%%[!0-9]*}; y=${y%%[!0-9]*}
    if (( 10#${x:-0} > 10#${y:-0} )); then return 0; fi
    if (( 10#${x:-0} < 10#${y:-0} )); then return 1; fi
  done
  return 0
}

# uv instalado y en la versión mínima (las anteriores confían en los
# certificados comprometidos de eMudhra).
uv_ok() {
  command -v uv >/dev/null 2>&1 || return 1
  local v
  v=$(uv --version 2>/dev/null | awk '{print $2}')
  [[ -n "$v" ]] && version_ge "$v" "$UV_MIN"
}

# El Python que usa el proyecto (el que elige uv según .python-version) es 3.14.
python_ok() {
  uv run --frozen python -c 'import sys; assert sys.version_info[:2] == (3, 14)'
}

echo ""
echo "${BLUE}══════════════════════════════════════════════════════════════════${RESET}"
echo "${BLUE}  Diplomado IA — Verificación de entorno${RESET}"
echo "${BLUE}══════════════════════════════════════════════════════════════════${RESET}"
echo ""

# ─── 1. Herramientas del sistema ─────────────────────────────────────────────
echo "${BLUE}1. Herramientas del sistema${RESET}"
check "Git instalado"                                                        "git --version"                                                  "brew install git / apt install git"
check "uv ${UV_MIN} o posterior"                                              "uv_ok"                                                          "Instalar: curl -LsSf https://astral.sh/uv/install.sh | sh · Actualizar: UV_SYSTEM_CERTS=true uv self update"
warn "Docker instalado (opcional para M0-M4)"                                "docker --version"                                               "Docker no es obligatorio. Recomendado para M5"

# ─── 2. Estructura del proyecto ──────────────────────────────────────────────
echo ""
echo "${BLUE}2. Estructura del proyecto${RESET}"
check "Archivo pyproject.toml presente"                                      "test -f pyproject.toml"                                         "¿Se está en la carpeta raíz del repositorio?"
check "Archivo .python-version presente (3.14)"                               "grep -q '^3\.14' .python-version"                              "El .python-version debe decir 3.14: git pull del template"
check ".env existe (copiar .env.example a .env)"                              "test -f .env"                                                   "cp .env.example .env"
check "Carpetas app/, agent/, tests/ presentes"                              "test -d app && test -d agent && test -d tests"                  "Repositorio incompleto: volver a clonarlo"

# ─── 3. Dependencias instaladas ──────────────────────────────────────────────
echo ""
echo "${BLUE}3. Dependencias del proyecto${RESET}"
check "uv.lock presente"                                                     "test -f uv.lock"                                                "uv lock"
check ".venv creado (uv sync corrió al menos una vez)"                       "test -d .venv"                                                  "uv sync --all-groups"
check "FastAPI importable"                                                   "uv run --frozen python -c 'import fastapi'"                              "uv sync --all-groups"
check "Pydantic v2 importable"                                               "uv run --frozen python -c 'import pydantic; assert pydantic.VERSION.startswith(\"2.\")'" "uv sync --all-groups"
check "Python 3.14 en el entorno del proyecto"                               "python_ok"                                                      "uv python install 3.14 y luego uv sync --all-groups"
check "certifi 2026.10.19 o posterior (sin eMudhra)"                         "uv run --frozen python -c 'import certifi, sys; v = tuple(int(p) for p in certifi.__version__.split(\".\")); sys.exit(0 if v >= (2026, 10, 19) else 1)'" "uv sync --all-groups (el uv.lock del template ya trae la versión corregida)"
check "pytest importable"                                                    "uv run --frozen python -c 'import pytest'"                               "uv sync --all-groups"

# ─── 4. Backend arranca ──────────────────────────────────────────────────────
echo ""
echo "${BLUE}4. Backend (FastAPI)${RESET}"
check "app.main importa sin errores"                                         "uv run --frozen python -c 'from app.main import app'"                    "Revisar app/main.py"
check "Health endpoint funciona (in-process)"                                "uv run --frozen python -c 'from fastapi.testclient import TestClient; from app.main import app; r = TestClient(app).get(\"/health\"); assert r.status_code == 200'" "Revisar app/main.py"

# ─── 5. Mock LLM ──────────────────────────────────────────────────────────────
echo ""
echo "${BLUE}5. Mock LLM${RESET}"
check "app.mock_llm importa sin errores"                                     "uv run --frozen python -c 'from app.mock_llm import mock_app'"           "Revisar app/mock_llm.py"
check "Mock LLM responde (in-process)"                                       "uv run --frozen python -c 'from fastapi.testclient import TestClient; from app.mock_llm import mock_app; r = TestClient(mock_app).post(\"/v1/chat/completions\", json={\"model\":\"x\",\"messages\":[{\"role\":\"user\",\"content\":\"hola\"}]}); assert r.status_code == 200'" "Ver docs/MOCK_LLM_GUIDE.md"

# ─── 6. Agente con MockLLMClient ─────────────────────────────────────────────
echo ""
echo "${BLUE}6. Agente (Track B)${RESET}"
check "agent.core importa sin errores"                                       "uv run --frozen python -c 'from agent.core import run_agent'"            "Revisar agent/core.py"
check "MockLLMClient importable"                                             "uv run --frozen python -c 'from tests.mocks.mock_llm import MockLLMClient'" "Falta tests/mocks/mock_llm.py — git pull"
check "Calculator tool funciona"                                             "uv run --frozen python -c 'from agent.tools.calculator import calculate; assert calculate(\"2+2\") == \"4\"'" "Revisar agent/tools/calculator.py"
check "Merchant lookup tool funciona"                                        "uv run --frozen python -c 'from agent.tools.merchant_lookup import lookup_merchant; r = lookup_merchant(\"MCHT-00001\"); assert \"MCHT-00001\" in r'" "Revisar data/merchants_sample.json"

# ─── 7. Harness de calidad ───────────────────────────────────────────────────
echo ""
echo "${BLUE}7. Harness (ruff + mypy + bandit + pytest)${RESET}"
check "ruff disponible"                                                      "uv run --frozen ruff --version"                                          "uv sync --all-groups"
check "mypy disponible"                                                      "uv run --frozen mypy --version"                                          "uv sync --all-groups"
check "bandit disponible"                                                    "uv run --frozen bandit --version"                                        "uv sync --all-groups"
check "pytest pasa todos los tests"                                          "uv run --frozen pytest -q --tb=no"                                       "Ver la salida completa con: uv run --frozen pytest -v"

# ─── 8. Git ───────────────────────────────────────────────────────────────────
echo ""
echo "${BLUE}8. Git${RESET}"
check "git status funciona"                                                  "git status"                                                     "¿La carpeta es un repositorio git? (git clone del repositorio del curso)"
warn "Hay un remote configurado (GitHub)"                                    "git remote -v | grep -q ."                                     "git remote add origin <URL del repositorio>"

# ─── Reporte final ────────────────────────────────────────────────────────────
TOTAL=$((PASSED + FAILED))

echo ""
echo "${BLUE}══════════════════════════════════════════════════════════════════${RESET}"
echo "  ${GREEN}PASSED: ${PASSED}/${TOTAL}${RESET}   ${RED}FAILED: ${FAILED}${RESET}   ${YELLOW}WARNINGS: ${WARNINGS}${RESET}"
echo "${BLUE}══════════════════════════════════════════════════════════════════${RESET}"

if [[ $FAILED -eq 0 ]]; then
  echo ""
  echo "${GREEN}✅ Entorno listo para los Labs.${RESET}"
  echo ""
  exit 0
else
  echo ""
  echo "${RED}❌ Hay checks fallando:${RESET}"
  echo ""
  for c in "${FAILED_CHECKS[@]}"; do
    echo "  • $c"
  done
  echo ""
  echo "Si alguno no se resuelve, consultar ${YELLOW}docs/RUNBOOK_TROUBLESHOOTING.md${RESET}"
  echo "o publicar la consulta en #m0-setup con la salida completa."
  exit 1
fi
