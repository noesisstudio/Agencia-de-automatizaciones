"""
Arranque local — API en puerto 8020 (independiente del chatbot :8000 y FacturAI :8010).

  cd backend && python3 run.py
"""
from __future__ import annotations

import os

import uvicorn

HOST = os.environ.get("EMAIL_COMERCIAL_HOST", "127.0.0.1")
PORT = int(os.environ.get("EMAIL_COMERCIAL_PORT", "8020"))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True,
    )
