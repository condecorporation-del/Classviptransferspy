"""Rate limiting global — anti fuerza bruta (login) y anti spam (booking público)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
