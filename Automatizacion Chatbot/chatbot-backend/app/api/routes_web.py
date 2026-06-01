from fastapi import APIRouter
from pydantic import BaseModel

from app.services import chat_engine

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    tenant_id: str = "default"
    session_id: str = "web-widget"


@router.post("/chat")
async def web_chat(payload: ChatRequest) -> dict:
    reformular = chat_engine.wants_rephrase(payload.question)
    result = await chat_engine.reply(
        payload.tenant_id,
        payload.session_id,
        payload.question,
        reformular=reformular,
        canal="web",
    )
    return {
        "answer": result.respuesta,
        "ok": result.ok,
        "codigo_error": result.codigo_error,
        "solucion": result.solucion,
    }
