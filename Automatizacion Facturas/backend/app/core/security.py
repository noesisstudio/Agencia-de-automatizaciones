"""Cifrado de datos sensibles (NIF/CIF)."""

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.secret_key.encode()).digest()
    )
    return Fernet(key)


def encrypt_text(value: str | None) -> str | None:
    """Cifra texto arbitrario (p. ej. JSON con datos personales)."""
    if value is None or value == "":
        return None
    return _fernet().encrypt(value.encode()).decode()


def decrypt_text(encrypted: str | None) -> str | None:
    """Descifra texto cifrado con encrypt_text. Devuelve None si falla."""
    if not encrypted:
        return None
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except Exception:
        return None


def encrypt_nif(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    return _fernet().encrypt(value.strip().upper().encode()).decode()


def decrypt_nif(encrypted: str | None) -> str | None:
    if not encrypted:
        return None
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except Exception:
        return None


def mask_nif(nif: str | None) -> str | None:
    if not nif or len(nif) < 4:
        return nif
    return nif[:2] + "*" * (len(nif) - 4) + nif[-2:]
