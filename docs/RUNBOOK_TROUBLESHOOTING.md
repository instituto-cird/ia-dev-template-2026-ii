# 🛟 Runbook · Troubleshooting de los Labs

> **Cuándo usar este documento**: leelo cuando tu setup falla, antes de publicar tu pregunta en el canal de soporte. La mayoría de los errores del Lab 0 y el Lab 4 están acá con su fix exacto.

> **Comando mágico**: si no sabés por dónde empezar, corré primero `bash scripts/verify_setup.sh` y pegá la salida en tu pregunta de soporte.

---

## Índice

1. [Setup inicial (Lab 0)](#1-setup-inicial-lab-0)
2. [Backend FastAPI no arranca](#2-backend-fastapi-no-arranca)
3. [Mock LLM y conexión con el agente](#3-mock-llm-y-conexión-con-el-agente)
4. [Tests fallando (Lab 1-4)](#4-tests-fallando-lab-1-4)
5. [Docker y docker-compose](#5-docker-y-docker-compose)
6. [Tu repositorio y CI](#6-tu-repositorio-y-ci)
7. [Cuando todo lo demás falla](#7-cuando-todo-lo-demás-falla)

---

## 1. Setup inicial (Lab 0)

### `command not found: uv`

`uv` no está en tu PATH.

```bash
# Mac/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
# Después: cerrá y reabrí la terminal.

# Windows (PowerShell):
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verificar (tiene que ser 0.13.4 o superior):
uv --version
```

### `Required uv version >=0.13.4 does not match the running version`

El `uv` que se está ejecutando es anterior al incidente de certificados de eMudhra/emSign (oct-2026) y el proyecto se niega a usarlo. Cómo se actualiza depende de **cómo se instaló**:

| Cómo se instaló | Cómo se actualiza |
|---|---|
| Instalador oficial (`install.ps1` o `install.sh`) | `uv self update` (ver comandos abajo) |
| WinGet | `winget upgrade --id=astral-sh.uv -e` |
| Scoop | `scoop update uv` |
| pipx | `pipx upgrade uv` |
| pip (`pip install uv`) | Conviene **desinstalarlo** y usar el instalador oficial (caso siguiente) |
| Homebrew (macOS) | `brew upgrade uv` |

Con el instalador oficial, la actualización usa los certificados del sistema operativo:

```powershell
# Windows (PowerShell)
$env:UV_SYSTEM_CERTS="true"; uv self update
```

```bash
# Git Bash, macOS o Linux
UV_SYSTEM_CERTS=true uv self update
```

Después de actualizar, **cerrar y volver a abrir la terminal** y comprobar con `uv --version` (0.13.4 o superior).

### `Self-update is only available for uv binaries installed via the standalone installation scripts`

Hay **dos copias de uv** instaladas y la terminal encuentra primero la vieja. El caso más común: uv se instaló alguna vez con `pip install uv` (lo indican muchos tutoriales) y después con el instalador oficial. El mensaje de error dice dónde está cada una:

- *The current executable is at …* → la copia que se está usando (la vieja).
- *… was used to install uv to …* → la copia del instalador oficial.

**1. Ver todas las copias.**

```powershell
# Windows (PowerShell o cmd)
where.exe uv
```

```bash
# Git Bash, macOS o Linux
which -a uv
```

Rutas típicas en Windows:

| Ruta | Origen |
|---|---|
| `C:\Users\<usuario>\.local\bin\uv.exe` | Instalador oficial (**la que se conserva**) |
| `C:\Users\<usuario>\AppData\Local\Programs\Python\Python3xx\Scripts\uv.exe` | `pip install uv` con el Python de python.org |
| `C:\Users\<usuario>\AppData\Roaming\Python\Python3xx\Scripts\uv.exe` | `pip install --user uv` |
| `C:\Users\<usuario>\scoop\shims\uv.exe` | Scoop |
| `C:\Users\<usuario>\AppData\Local\Microsoft\WinGet\Links\uv.exe` | WinGet |

En macOS, la copia de pip suele estar en `/Library/Frameworks/Python.framework/Versions/3.x/bin/uv`; en Linux, en `~/.local/lib/python3.x/` o en un entorno virtual.

**2. Quitar la copia de pip.** Usar el Python que aparece en la ruta de la copia vieja (`3xx` = versión):

```powershell
# Windows: el lanzador py lista los Python instalados
py -0p
py -3.13 -m pip uninstall -y uv        # repetir con cada versión que tenga uv
```

```bash
# macOS (Python de python.org)
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m pip uninstall -y uv
```

**3. Actualizar la copia oficial**, cerrar y volver a abrir la terminal, y comprobar que quede una sola:

```powershell
# Windows (PowerShell)
$env:UV_SYSTEM_CERTS="true"; & "$env:USERPROFILE\.local\bin\uv.exe" self update
where.exe uv          # una sola línea: ...\.local\bin\uv.exe
uv --version          # 0.13.4 o superior
```

```bash
# Git Bash, macOS o Linux
UV_SYSTEM_CERTS=true ~/.local/bin/uv self update
hash -r; which -a uv  # una sola línea: .../.local/bin/uv
uv --version
```

Si después del paso 3 la terminal ya no encuentra `uv`, falta `.local\bin` en el PATH:

```powershell
# Windows: agregar al PATH del usuario y abrir una terminal nueva
[Environment]::SetEnvironmentVariable("Path", "$env:USERPROFILE\.local\bin;$([Environment]::GetEnvironmentVariable('Path', 'User'))", "User")
```

```bash
# macOS (zsh)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

**Además, actualizar pip** en el Python de python.org de donde se quitó uv: el pip anterior a 26.2.2 sigue confiando en la autoridad de certificación comprometida (aviso de Python, 20-oct-2026). Con el archivo verificado que publica el aviso:

```powershell
# Windows (cambiar -3.13 por la versión que corresponda)
py -3.13 -m pip install --upgrade "https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70"
py -3.13 -m pip install --upgrade certifi
```

En macOS, el mismo comando con `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m pip` en lugar de `py -3.13 -m pip`.

Fuentes: Astral, *Installing uv* (documentación oficial, consultada el 28-oct-2026), fuente de proveedor; Python Software Foundation, [Information for Python users regarding eMudhra/emSign CA certificate security incident](https://discuss.python.org/t/information-for-python-users-regarding-emudhra-emsign-ca-certificate-security-incident/109576) (20-oct-2026).

### `uv sync` falla con "Python 3.14 not found"

```bash
# Opción 1: que uv descargue Python por vos (recomendado)
uv python install 3.14

# Opción 2: instalá Python 3.14 directamente
# Mac:      brew install python@3.14
# Ubuntu:   sudo apt install python3.14 python3.14-venv
# Windows:  https://www.python.org/downloads/  (marcá "Add to PATH")

# Después:
uv sync --all-groups
```

### `Python version conflict` o `requires-python`

El template requiere Python 3.14. Si hay otra versión instalada, `uv sync` descarga 3.14 automáticamente. Si querés forzar:

```bash
uv python pin 3.14
uv sync --all-groups
```

### ⚠️ Importante: por qué siempre usamos `uv run --frozen`

Todos los comandos del template usan el flag `--frozen`. **No es decorativo, evita un bug real.**

Cuando ejecutás `uv run pytest` (sin `--frozen`), uv compara automáticamente tu `.venv/` con tu `uv.lock` antes de correr. Si detecta cualquier diferencia, **reinstala paquetes**. Esto suena bien — pero algunas instalaciones quedan parciales (les falta el archivo `RECORD`, les falta submódulos), y entonces el siguiente `import` falla con `ModuleNotFoundError`. Probás otro `uv run`, vuelve a reinstalar, vuelve a romperse. Es un círculo.

Con `uv run --frozen pytest`, le decís a uv: *"el venv ya está sincronizado, no toques nada, solo ejecutá el comando".* Ningún reinstall, ningún wheel parcial.

**Cuándo NO usar `--frozen`:**
- Después de modificar `pyproject.toml` (agregar/cambiar/quitar una dependencia). Ahí necesitás `uv sync --all-groups` para que el venv refleje el cambio.
- Justo después de clonar el repo (tampoco hace falta `--frozen` porque vas a hacer `uv sync` primero).

**Regla simple:** después de cualquier `uv sync`, todos los `uv run` posteriores deben tener `--frozen`.

### `pip install` o `python -m venv` no funciona como en tutoriales

El template usa `uv`, no `pip`+`venv`. Los comandos equivalentes:

| Si en un tutorial decía... | En el template usá... |
|----------------------------|----------------------|
| `python -m venv .venv` | (no hace falta — uv lo crea solo) |
| `source .venv/bin/activate` | (opcional — `uv run` lo activa por vos) |
| `pip install -r requirements.txt` | `uv sync --all-groups` |
| `pip install paquete` | `uv add paquete` |
| `python script.py` | `uv run --frozen python script.py` |
| `pytest` | `uv run --frozen pytest` |

### `.env` no se carga / variables no leídas

```bash
# 1. Verificá que .env existe en la raíz del repo (no en una subcarpeta)
ls -la .env

# 2. Si no existe, copialo del template:
cp .env.example .env

# 3. Verificá que el backend lo lee:
uv run --frozen python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('MOCK_MODE'))"
# Debe imprimir: true
```

---

## 2. Backend FastAPI no arranca

### `Address already in use` / `Port 8000 is busy`

Algo está ocupando el puerto.

```bash
# Mac/Linux: buscá qué proceso lo usa
lsof -i :8000
# Después: kill -9 <PID>

# O usá otro puerto:
uv run --frozen uvicorn app.main:app --reload --port 8002

# Windows:
netstat -ano | findstr :8000
taskkill /F /PID <PID>
```

### `ModuleNotFoundError: No module named 'fastapi'`

`uv sync` no corrió o se corrió en otro directorio.

```bash
# Asegurate de estar en la raíz del repo (donde está pyproject.toml)
pwd  # debe terminar en /ia-dev-template
uv sync --all-groups
```

### `ImportError: cannot import name 'X' from 'app.main'`

Versión vieja del template. Hacé `git pull` para traer la versión actualizada de `app/main.py`.

### El backend arranca pero `localhost:8000` no responde

```bash
# Verificá con curl directo:
curl http://localhost:8000/health
# Esperado: {"status":"ok","version":"0.1.0","module":"System"}

# Si curl no funciona, el backend no arrancó realmente. Revisá la salida de uvicorn.
```

### CORS error desde el frontend Streamlit

Si ves "blocked by CORS policy" en la consola, agregá tu origen a `app/main.py`:

```python
_default_origins = [
    "http://localhost:8501",  # Streamlit
    "http://tu-origen-personalizado:PUERTO",  # agregá acá
]
```

O configurá `CORS_ORIGINS` en tu `.env`:

```bash
CORS_ORIGINS=http://localhost:8501,http://localhost:3000
```

---

## 3. Mock LLM y conexión con el agente

### `Connection refused` cuando el agente llama al Mock LLM

El Mock LLM no está corriendo. Tenés que levantarlo en una **segunda terminal**:

```bash
# Terminal 1: backend
uv run --frozen uvicorn app.main:app --reload

# Terminal 2 (nueva): Mock LLM
uv run --frozen uvicorn app.mock_llm:mock_app --port 8001

# Verificá:
curl http://localhost:8001/health
# Esperado: {"status":"ok","service":"mock-llm","version":"0.2.0"}
```

### `JSONDecodeError` cuando el agente parsea la respuesta del LLM

Esto pasaba en el Mock LLM viejo. **Asegurate de tener la versión actualizada de `app/mock_llm.py`**: hacé `git pull` y verificá que la versión es 0.2.0:

```bash
grep 'version="0.2.0"' app/mock_llm.py
```

Si no aparece, traé la versión nueva del template oficial.

### `pydantic ValidationError` cuando paso `tools=...` al cliente

Versión vieja del Mock. Actualizá `app/mock_llm.py` (versión 0.2.0+ acepta `tools` sin error).

### El agente loopea para siempre / nunca termina

Verificá que tu prompt incluye instrucciones claras de cuándo terminar. El system prompt del agente dice:

> "Cuando tengas la respuesta final, usa action='FINISH' y pon la respuesta en action_input={'answer': '...'}."

Si el Mock LLM no devuelve `FINISH`, el agente corre hasta `MAX_STEPS=10` y termina con "alcanzó el límite de pasos". Para forzar FINISH en tus tests, usá `mock_chat_response(action="FINISH", action_input={"answer": "..."})`.

### Quiero usar mi propia API key real en vez del Mock

```bash
# 1. Edita .env:
MOCK_MODE=false
OPENAI_API_KEY=sk-tu-key-real
OPENAI_BASE_URL=https://api.openai.com/v1   # para OpenAI
# O para Anthropic via compatible:
# OPENAI_BASE_URL=https://api.anthropic.com/v1
# O para Ollama local:
# OPENAI_BASE_URL=http://localhost:11434/v1

# 2. Reiniciá el backend
```

---

## 4. Tests fallando (Lab 1-4)

### `pytest: command not found`

```bash
# Tenés que correrlo via uv:
uv run --frozen pytest

# No: pytest (esto busca en el sistema, no en el venv del proyecto)
```

### `ModuleNotFoundError: No module named 'app'` en los tests

Estás corriendo pytest desde una subcarpeta. Volvé a la raíz:

```bash
cd /ruta/a/ia-dev-template
uv run --frozen pytest
```

### Coverage < 60% en CI

El umbral del template es 60% (configurado en `pyproject.toml`). Si tu PR rompe el threshold:

```bash
# Mirá qué líneas no están cubiertas:
uv run --frozen pytest --cov=app --cov-report=term-missing

# Agregá tests específicos para las líneas no cubiertas.
```

### El test del Mock LLM hace `pytest.skip`

Es esperado si el Mock LLM no está corriendo. Para correrlo de verdad:

```bash
# Terminal 1:
uv run --frozen uvicorn app.mock_llm:mock_app --port 8001

# Terminal 2:
uv run --frozen pytest tests/test_sanity.py::test_mock_llm_response_structure -v
```

### `tests/test_agent.py` falla con `ImportError: tests.mocks`

```bash
# 1. Verificá que existe el archivo:
ls tests/mocks/mock_llm.py

# 2. Si no existe, hacé git pull. Si sigue sin estar, copialo del template oficial.
```

### ruff falla en CI pero no localmente

Tu ruff local es viejo. Sincronizá:

```bash
uv sync --all-groups
uv run --frozen ruff check .
```

---

## 5. Docker y docker-compose

### `Cannot connect to the Docker daemon`

Docker Desktop / Podman no está corriendo.

- **Mac/Windows**: abrir Docker Desktop y esperar a que esté "Running"
- **Linux**: `sudo systemctl start docker`

### `docker compose up` falla con "version is obsolete"

Versión vieja del template. Actualizá `docker-compose.yml` (versión nueva no tiene línea `version:`).

### `port is already allocated` en Docker

Algo en tu máquina ya usa los puertos 8000/8001/8501. Cerrá los procesos locales (ver §2) o editá los puertos en `docker-compose.yml`.

### El Mock LLM en Docker no arranca

El servicio `mock-llm` usa la misma imagen que el backend (dependencias del `uv.lock`). Si no arranca, reconstruir sin caché (`docker compose build --no-cache`) y revisar la salida de `docker compose logs mock-llm`.

### Docker no es bloqueante

Si Docker te da problemas y estás antes de M5, **podés ignorarlo**. Los Labs 0-4 corren sin Docker (usá `uv run` directo).

---

## 6. Tu repositorio y CI

### "I don't have access to the repository"

Aceptar la invitación de GitHub que llegó por correo (también aparece en github.com/notifications). Si venció (dura 7 días), pedir al equipo docente que la reenvíe.

### El CI falla y no entiendo el error

```bash
# Corré el mismo pipeline que el CI, localmente:
uv run --frozen ruff check .
uv run --frozen mypy app/ --ignore-missing-imports
uv run --frozen bandit -r app/ -ll -q
uv run --frozen pytest -q --cov=app --cov-fail-under=60
```

Cualquier comando que falle es el que está rompiendo el CI.

### Hice `git push` pero no veo cambios en el CI

```bash
# Verificá que pusheaste a la rama correcta:
git branch  # tu rama actual
git status  # cambios pendientes
git log --oneline -3  # tus últimos commits

# Verificá el remote:
git remote -v
```

### "Branch protection rules" bloquean mi push a main

Es esperado. Trabajá en una rama de feature y abrí PR:

```bash
git checkout -b feat/mi-cambio
# ... hacé tus cambios ...
git add .
git commit -m "feat: descripción del cambio"
git push origin feat/mi-cambio
# Después abrí PR desde GitHub
```

---

## 7. Cuando todo lo demás falla

### Reset total del entorno local

```bash
# 1. Borrá el venv y caches
rm -rf .venv .pytest_cache .ruff_cache .mypy_cache

# 2. Re-clonalo desde GitHub
cd ..
mv ia-dev-template ia-dev-template-broken
git clone <URL de tu fork> ia-dev-template
cd ia-dev-template

# 3. Setup desde cero
cp .env.example .env
uv sync --all-groups
bash scripts/verify_setup.sh
```

### Tu máquina simplemente no aguanta

Pasate a **GitHub Codespaces** (60 horas/mes gratuitas):

1. En tu repo de GitHub: `Code → Codespaces → Create codespace on main`
2. Esperá 1-2 minutos. El `.devcontainer/` automatiza todo el setup.
3. Trabajás desde el navegador o desde VS Code conectado al Codespace.

Ver `.devcontainer/README.md` del template.

### Mensaje de soporte: qué incluir

Cuando publiques en el canal de soporte, incluí:

```
Sistema operativo: [macOS 14 / Ubuntu 22 / Windows 11 + WSL2]
Python: <salida de `python3 --version`>
uv:    <salida de `uv --version`>
Comando que falló: <copialo exacto>
Salida completa del error: <copialo exacto, sin recortar>
Lo que probaste antes de preguntar: <breve>
```

Y al final pegá:

```
Salida de bash scripts/verify_setup.sh:
<copialo exacto>
```

---

*Última actualización: junio 2026 — Cohorte 2026-I.*
*Si encontrás un error nuevo no documentado acá, abrí un Issue en el repo o un comentario en Discord.*
