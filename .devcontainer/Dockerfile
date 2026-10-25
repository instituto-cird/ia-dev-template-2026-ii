# Imagen base oficial de devcontainers de Microsoft con Python 3.14 sobre Debian Bookworm.
# Trae preinstalado: git, sudo, common-utils, usuario `vscode` no-root.
FROM mcr.microsoft.com/devcontainers/python:3.14-bookworm

# Instalar uv (Astral) desde la imagen oficial — versión fija para reproducibilidad.
# 0.13.4 = primera versión que ya no confía en la CA comprometida de eMudhra/emSign.
COPY --from=ghcr.io/astral-sh/uv:0.13.4 /uv /uvx /usr/local/bin/

# Asegurar que el usuario `vscode` puede ejecutar uv y uvx.
RUN chmod +x /usr/local/bin/uv /usr/local/bin/uvx

# Dependencias del sistema que algunos paquetes del stack pueden necesitar.
# ca-certificates se instala/actualiza SIEMPRE a la última versión del repo de Debian.
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        graphviz \
        libpq-dev \
        make \
        sqlite3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# pip del Python del sistema: forzar >= 26.2.2 (trae certifi sin la CA comprometida).
# Aunque el diplomado usa uv, alguien va a escribir `pip install` igual.
RUN python -m pip install --no-cache-dir --upgrade "pip>=26.2.2" "certifi>=2026.10.19"

# Configuración por defecto que mejora el comportamiento de uv dentro de Codespaces.
# UV_LINK_MODE=copy evita advertencias cuando el cache vive en otro filesystem.
# UV_COMPILE_BYTECODE=1 reduce el tiempo de arranque después de uv sync.
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Volver al usuario no-root.
USER vscode

# Confirmar versiones durante el build (quedan registradas en los logs).
RUN uv --version && python --version && python -m pip --version
