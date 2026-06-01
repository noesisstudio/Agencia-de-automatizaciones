from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_dir = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_dir)),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_invoice_html(data: dict[str, Any], filename: str) -> str:
    tpl = _env.get_template("factura.html")
    return tpl.render(invoice=data, filename=filename)
