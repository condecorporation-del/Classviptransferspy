"""Servicios — Capa de lógica de negocio.

Cada servicio recibe una AsyncSession en __init__ y contiene
la lógica de negocio pura, sin dependencias HTTP.

Los endpoints (Fase 5) consumirán estos servicios vía
dependency injection de FastAPI.
"""
