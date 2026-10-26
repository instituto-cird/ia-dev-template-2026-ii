# ia-dev-template

Template oficial del curso **IA Aplicada al Desarrollo de Software**.

Este repositorio es tu entorno de trabajo durante los 5 módulos. No crearás repos nuevos por módulo — cada PR de evaluación agrega capas sobre este mismo repo. Al terminar el diplomado, el historial de commits es tu portafolio profesional.

> 🏦 **Contexto narrativo:** este template es el **sistema nuevo Greenfield** que vas a construir para **LegacyPay** (la empresa ficticia del caso de estudio del curso). Coexiste con el monolito legado de LegacyPay y demuestra el patrón Agent Manager. Los merchants en `data/merchants_sample.json` y las herramientas en `agent/tools/` (como `merchant_lookup.py`) salen del universo LegacyPay. 

---

## Stack

| Componente | Tecnología | Para qué |
|---|---|---|
| API Backend | FastAPI + Pydantic v2 | Endpoints tipados, validación automática, OpenAPI docs |
| Frontend | Streamlit | Prototipado rápido de UI |
| Mock LLM | FastAPI (servidor local) | Simula OpenAI sin usar cuota ni API key real |
| Agente | ReAct pattern | Módulo 4 — Track B |
| Tests | pytest + pytest-asyncio | Suite incremental por módulo |
| Linting | ruff | Estilo + errores comunes |
| Tipos | mypy | Errores de tipo en tiempo de desarrollo |
| Seguridad | bandit | Vulnerabilidades conocidas |
| Dependencias | uv | Gestor moderno, lockfile determinista |
| CI | GitHub Actions | Harness automático en cada PR |
| Contenedores | Docker + docker-compose | Ambiente reproducible |

---

## Requisitos

- **Python 3.14** (`.python-version` la fija; si no está instalada, `uv` la descarga sola)
- **uv 0.13.4 o superior** — instalación: `curl -LsSf https://astral.sh/uv/install.sh | sh` · si ya estaba instalado: `UV_SYSTEM_CERTS=true uv self update` (las versiones anteriores confían en un certificado comprometido y el proyecto no corre con ellas)
- **Git** (y cuenta en GitHub)
- **Docker** (para demo con docker-compose)

> Si eres nuevo en alguna de estas herramientas, lee primero:
> - [docs/nivelacion/00_python_essentials.md](docs/nivelacion/00_python_essentials.md) — Type hints, Pydantic v2, async, pytest
> - [docs/nivelacion/01_fastapi_guide.md](docs/nivelacion/01_fastapi_guide.md) — Endpoints, modelos, errores HTTP, TestClient
> - [docs/nivelacion/02_docker_guide.md](docs/nivelacion/02_docker_guide.md) — Dockerfile, docker-compose, variables de entorno
> - [docs/nivelacion/03_git_github_guide.md](docs/nivelacion/03_git_github_guide.md) — Ramas, commits convencionales, PRs, CI
>
> ¿No sabes cuál necesitas? Haz el Lab 0 y usa
> [docs/nivelacion/04_diagnostico_path.md](docs/nivelacion/04_diagnostico_path.md) como mapa.

---

## Setup rápido (obligatorio)

```bash
# 1. Clona tu repo (te llega una invitación de GitHub por correo)
git clone https://github.com/instituto-cird/ia-dev-<tu-usuario>.git
cd ia-dev-<tu-usuario>

# 2. Copia el .env de ejemplo
cp .env.example .env

# 3. Instala dependencias (incluyendo dev tools)
uv sync --all-groups

# 4. Verifica que todo está listo (22 chequeos automáticos)
bash scripts/verify_setup.sh

# Si el script termina con "✅ Entorno listo": estás listo.
# Si falla algo: leé docs/RUNBOOK_TROUBLESHOOTING.md antes de pedir ayuda.
```

---

## Estructura del proyecto

```
ia-dev-template/
│
├── app/                    # Backend FastAPI (Track A — tu API vive aquí)
│   ├── __init__.py
│   ├── main.py             # FastAPI app, endpoints, modelos Pydantic
│   └── mock_llm.py         # Servidor local que simula la API de OpenAI
│
├── agent/                  # Agente ReAct (Track B — tu agente vive aquí)
│   ├── __init__.py
│   ├── core.py             # Motor del ciclo Reason → Act → Observe
│   └── tools/              # Una herramienta por archivo
│       ├── __init__.py
│       ├── calculator.py   # Ejemplo: evaluación aritmética segura
│       └── merchant_lookup.py  # Ejemplo: consulta de comerciantes LegacyPay
│
├── tests/                  # Suite de tests (se acumula por módulo)
│   ├── __init__.py
│   └── test_sanity.py      # Tests base — NUNCA deben fallar
│
├── frontend/               # UI Streamlit (opcional, M3+)
│   └── app.py
│
├── data/                   # Datos de muestra para ejercicios
│   └── merchants_sample.json  # Comerciantes LegacyPay (5 registros de ejemplo)
│
├── docs/
│   ├── AI_CODE_SMELLS.md   # Guía de auditoría — leer antes de cada PR
│   ├── templates/
│   │   ├── AI_USAGE.md     # PLANTILLA — copia a raíz del repo y completa
│   │   └── DEMO_PLAN.md    # PLANTILLA — copia a raíz del repo y completa
│   └── nivelacion/         # Guías de nivelación técnica
│
├── .github/
│   └── workflows/
│       └── ci.yml          # Pipeline: ruff → mypy → bandit → pytest+coverage
│
├── .env.example            # Variables de entorno (copia a .env y personaliza)
├── .python-version         # Python 3.14 (uv lo lee automáticamente)
├── pyproject.toml          # Dependencias + configuración de herramientas
├── uv.lock                 # Lockfile determinista (commitear siempre)
├── docker-compose.yml      # Backend + Frontend + Mock LLM en contenedores
├── Dockerfile.backend      # Imagen del backend
└── Dockerfile.frontend     # Imagen del frontend
```

---

## Cómo arrancar cada servicio

### Opción A — Local (recomendada para desarrollo)

```bash
# Terminal 1: Backend API
uv run --frozen uvicorn app.main:app --reload --port 8000
# → Documentación interactiva en http://localhost:8000/docs

# Terminal 2: Mock LLM (simula OpenAI)
uv run --frozen uvicorn app.mock_llm:mock_app --port 8001
# → Acepta requests en http://localhost:8001/v1/chat/completions

# Terminal 3: Frontend Streamlit (opcional)
uv run --frozen streamlit run frontend/app.py
# → UI en http://localhost:8501
```

### Opción B — Docker (para prueba de ambiente reproducible)

```bash
# Construye y levanta todo
docker compose up --build

# Servicios disponibles:
# Backend:    http://localhost:8000
# Frontend:   http://localhost:8501
# Mock LLM:   http://localhost:8001
```

---

## Variables de entorno

Copia `.env.example` a `.env` antes de correr el backend:

```bash
cp .env.example .env
```

| Variable | Default | Descripción |
|---|---|---|
| `MOCK_MODE` | `true` | `true` = usa el Mock LLM local, no requiere API key |
| `OPENAI_BASE_URL` | `http://localhost:8001/v1` | URL del LLM (mock o real) |
| `OPENAI_API_KEY` | `sk-mock-key-123` | Solo necesaria si `MOCK_MODE=false` |
| `BACKEND_URL` | `http://localhost:8000` | URL que usa el frontend para conectarse |
| `SECRET_KEY` | `dev-secret-...` | Cambiar en producción |

> `.env` está en `.gitignore`. Nunca lo commitees. Nunca pongas API keys reales en el código.

---

## Comandos del Harness Engineering

Estos son los mismos comandos que corre el CI. Córrelos antes de cada PR:

```bash
# Estilo de código
uv run --frozen ruff check .

# Tipos estáticos
uv run --frozen mypy app/ --ignore-missing-imports

# Vulnerabilidades de seguridad
uv run --frozen bandit -r app/ -ll -q

# Tests + cobertura (debe ser >= 60%)
uv run --frozen pytest -q --cov=app --cov-report=term-missing

# Todo de una vez (equivalente al CI):
uv run --frozen ruff check . && uv run --frozen mypy app/ --ignore-missing-imports && uv run --frozen bandit -r app/ -ll -q && uv run --frozen pytest -q --cov=app --cov-fail-under=60
```

> Si algún comando falla, el CI fallará también. No abras un PR con CI rojo.

---

## 🤖 Política de uso de IA

Este diplomado fomenta el uso de herramientas avanzadas (Cursor, Claude Code, Copilot), pero bajo la política de **"Copiloto, no Piloto Automático"**.

**Modo Manual (M1 y M2):** Desactiva el "auto-apply" de Claude Code/Cursor. Lee cada línea que la IA sugiere antes de aceptarla.

**Mock Mode:** Por defecto, el repo usa un Mock LLM local. Si usas herramientas externas, asegúrate de que tus PRs pasen los tests del repo, no solo los tests que la IA escribe por ti.

**Vibe Coding:** Está prohibido entregar código que funciona "de casualidad". Si en la defensa se te pregunta "¿por qué usaste esta librería?" y la respuesta es "porque Claude lo puso", se considera fallo.

### Flujo de trabajo AI-Native

1. **Ideación (Humano):** Defines el Qué y el Por qué en un Issue de GitHub.

2. **Scaffolding (Agente):** Usas `uv` + IA para generar la estructura base.

3. **Refinamiento (Humano + Linter):** Corres `ruff` y ajustas la arquitectura. Aquí aplicas el filtro de [AI Code Smells](docs/AI_CODE_SMELLS.md).

4. **Tests (Híbrido):** Pides a la IA que genere casos borde ("Edge Cases"), tú validas que la lógica de negocio sea correcta.

5. **Review (Humano):** NADA entra a main sin que lo hayas leído y entendido. Regla: si no puedes explicarlo, no lo commitees.

6. **Prueba (Humano):** El CI debe estar verde. Si no, investigas tú, no la IA. El agente puede sugerir el fix, pero tú decides si tiene sentido.

---

## Tu repositorio — Instrucciones para el estudiante

1. Cuando el estudiante carga su usuario de GitHub en Moodle, el equipo docente crea **su repositorio** a partir de este template y lo invita con permiso de escritura. La invitación llega por correo y vence a los 7 días; si vence, se pide al equipo docente que la reenvíe.
2. Aceptar la invitación y clonar **el repositorio propio** (no el template original):
   ```bash
   git clone https://github.com/instituto-cird/ia-dev-<tu-usuario>.git
   ```
3. La rama `main` está protegida: todo cambio entra por Pull Request y con la CI en verde.
4. La CI corre automáticamente en cada push y en cada PR; el estado se ve en la pestaña **Actions** del repositorio.
5. Todos los entregables del curso se hacen sobre este mismo repositorio.

### Estrategia de ramas recomendada

```
main              ← Código estable. Solo se actualiza via PR con CI verde.
feature/m1-harness    ← Trabajo de M1. PR → main al entregar.
feature/m2-arquitectura
feature/m3-tdd
feature/m4-agent
release/candidate ← Congelación de features. Solo bugfixes. PR final = Demo Day.
```

### Entregables por módulo

| Módulo | PR desde | Criterio mínimo de CI |
|---|---|---|
| M0 Onboarding | cualquier rama | `pytest` pasa |
| M1 Harness | `feature/m1-harness` | `ruff + mypy + bandit + pytest` pasan |
| M2 Arquitectura | `feature/m2-arquitectura` | CI verde + `docs/ADR-001.md` existe |
| M3 TDD | `feature/m3-tdd` | CI verde + cobertura ≥ 60% |
| M4 Agente | `feature/m4-agent` | CI verde + Golden Set ≥ 80% (Track B) |
| M5 RC | `release/candidate` | CI verde + `DEMO_PLAN.md` + `AI_USAGE.md` |

---

## Track A vs Track B

**Track A — API End-to-End:** Construyes una API FastAPI real con Pydantic v2, tests y al menos una feature asistida por IA. El código principal vive en `app/`.

**Track B — Agente/Orquestación:** Implementas un agente ReAct con 3+ herramientas propias, Golden Set con ≥ 80% de casos deterministas pasando, y `ACTIONS_REQUIRING_APPROVAL` definido. El código principal vive en `agent/`.

Ambos tracks comparten los mismos requisitos de CI, `AI_USAGE.md`, `DEMO_PLAN.md` y defensa.

---

## Documentación complementaria

- [docs/VERIFY_SETUP.md](docs/VERIFY_SETUP.md) — cómo usar `scripts/verify_setup.sh`
- [docs/RUNBOOK_TROUBLESHOOTING.md](docs/RUNBOOK_TROUBLESHOOTING.md) — errores frecuentes y sus fixes
- [docs/MOCK_LLM_GUIDE.md](docs/MOCK_LLM_GUIDE.md) — cuándo usar Mock HTTP vs Mock In-Process
- [docs/AI_CODE_SMELLS.md](docs/AI_CODE_SMELLS.md) — los 6 AI Smells del curso + auditoría automática
- [tools/audit_code.py](tools/audit_code.py) — script de auditoría para el Lab 1

## Referencias externas

- [uv — gestor de dependencias](https://docs.astral.sh/uv/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic v2](https://docs.pydantic.dev/latest/)
- [ruff — linter](https://docs.astral.sh/ruff/)
- [mypy — type checker](https://mypy.readthedocs.io/)
- [bandit — security linter](https://bandit.readthedocs.io/)
- [pytest](https://docs.pytest.org/)
- [ReAct pattern (paper)](https://arxiv.org/abs/2210.03629)
