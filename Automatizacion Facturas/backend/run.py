"""
Arranque local de FacturAI (API + estáticos en :8010).

En Cursor/VS Code: abre este archivo y pulsa «Ejecutar» / Run (▶), o en terminal:

  cd backend && python3 run.py
"""
from __future__ import annotations

import os
import threading
import time
import webbrowser

import uvicorn

HOST = os.environ.get("FACTURAI_HOST", "127.0.0.1")
PORT = int(os.environ.get("FACTURAI_PORT", "8010"))
OPEN_BROWSER = os.environ.get("FACTURAI_OPEN_BROWSER", "1").lower() not in ("0", "false", "no")


def _open_browser() -> None:
    time.sleep(1.2)
    webbrowser.open(f"http://{HOST}:{PORT}/pagina.html")


if __name__ == "__main__":
    if OPEN_BROWSER:
        threading.Thread(target=_open_browser, daemon=True).start()
    use_reload = os.environ.get("FACTURAI_RELOAD", "1" if OPEN_BROWSER else "0").lower() in (
        "1",
        "true",
        "yes",
    )
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=use_reload,
    )
