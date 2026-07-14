"""Cliente mínimo del Service Layer de SAP Business One (v9.x / 10.x).

El Service Layer es la API REST oficial de SAP B1. Autenticación por sesión:
POST /Login con CompanyDB + UserName + Password devuelve una cookie B1SESSION
que se envía en las siguientes peticiones.
"""
import os

import requests
import urllib3
from dotenv import load_dotenv


class SapClientError(Exception):
    """Error de comunicación o de negocio devuelto por el Service Layer."""


class SapClient:
    def __init__(self, base_url=None, company_db=None, user=None, password=None, verify_ssl=None):
        load_dotenv()
        self.base_url = (base_url or os.environ["SAP_SL_URL"]).rstrip("/")
        self.company_db = company_db or os.environ["SAP_COMPANY_DB"]
        self.user = user or os.environ["SAP_USER"]
        self.password = password or os.environ["SAP_PASS"]
        if verify_ssl is None:
            verify_ssl = os.environ.get("SAP_VERIFY_SSL", "true").lower() != "false"
        self.session = requests.Session()
        self.session.verify = verify_ssl
        if not verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    def login(self):
        r = self.session.post(f"{self.base_url}/Login", json={
            "CompanyDB": self.company_db,
            "UserName": self.user,
            "Password": self.password,
        }, timeout=30)
        self._check(r, "Login")
        return self

    def logout(self):
        try:
            self.session.post(f"{self.base_url}/Logout", timeout=10)
        except requests.RequestException:
            pass

    def get(self, path, params=None):
        r = self.session.get(f"{self.base_url}/{path}", params=params, timeout=30)
        self._check(r, f"GET {path}")
        return r.json()

    def post(self, path, payload):
        r = self.session.post(f"{self.base_url}/{path}", json=payload, timeout=60)
        self._check(r, f"POST {path}")
        return r.json() if r.text else {}

    @staticmethod
    def _check(r, contexto):
        if r.ok:
            return
        try:
            detalle = r.json().get("error", {}).get("message", {})
            if isinstance(detalle, dict):
                detalle = detalle.get("value", r.text)
        except ValueError:
            detalle = r.text
        raise SapClientError(f"{contexto} -> HTTP {r.status_code}: {detalle}")

    # ---------- Operaciones de negocio ----------

    def buscar_proveedor_por_nif(self, nif):
        """Devuelve el CardCode del proveedor cuyo NIF (FederalTaxID) coincida, o None."""
        data = self.get("BusinessPartners", params={
            "$select": "CardCode,CardName,FederalTaxID",
            "$filter": f"FederalTaxID eq '{nif}' and CardType eq 'cSupplier'",
        })
        resultados = data.get("value", [])
        return resultados[0] if resultados else None

    def crear_borrador_factura_proveedor(self, payload):
        """Crea un borrador (Drafts) de factura de proveedor. El gestor lo revisa
        y contabiliza desde el cliente SAP; nunca se contabiliza directo."""
        payload = dict(payload)
        payload["DocObjectCode"] = "oPurchaseInvoices"
        return self.post("Drafts", payload)
