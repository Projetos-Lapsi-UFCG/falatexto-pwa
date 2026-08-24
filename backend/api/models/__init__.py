from pydantic import BaseModel


class MessageOut(BaseModel):
    """Resposta padrão para operações que apenas confirmam uma ação (ex.: remoção)."""

    mensagem: str
    id: str
