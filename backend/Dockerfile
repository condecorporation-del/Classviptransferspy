# ─── ClassVIP Transfers — Backend (FastAPI) ───────────────────────────────────
# Imagen de producción para Railway. Multi-stage no es necesario aquí: el peso
# lo dominan las libs de sistema de WeasyPrint, no las dependencias de Python.
FROM python:3.12-slim AS runtime

# No escribir .pyc, salida sin buffer (logs en vivo en Railway), pip sin caché.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ─── Librerías de sistema ─────────────────────────────────────────────────────
# WeasyPrint (generación de PDFs) NO funciona sin Pango/Cairo/GDK-PixBuf. Sin
# estas libs, importar weasyprint o renderizar un PDF revienta en runtime.
# fonts-dejavu-core: fuentes base para que los PDFs no salgan con texto en blanco.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libpangocairo-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        libjpeg62-turbo \
        shared-mime-info \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependencias de Python ───────────────────────────────────────────────────
# Se copia primero solo pyproject.toml para aprovechar la caché de capas de
# Docker: si el código cambia pero las deps no, no se reinstala todo.
COPY pyproject.toml README.md ./
# Instala SOLO las dependencias de producción declaradas en [project.dependencies]
# (sin el grupo [dev]). El "." instala el paquete `app` para que los imports
# absolutos (app.main, app.core...) resuelvan.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
RUN pip install .

# ─── Usuario no-root ──────────────────────────────────────────────────────────
# Correr como root dentro del contenedor es riesgo innecesario: si alguien logra
# ejecución de código, hereda root. Creamos un usuario sin privilegios.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

# Railway inyecta $PORT. El start script corre migraciones y luego uvicorn.
COPY --chown=appuser:appuser start.sh ./start.sh

EXPOSE 8000
CMD ["bash", "start.sh"]
