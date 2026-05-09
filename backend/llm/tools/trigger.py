from __future__ import annotations

import re


_ACTION_RE = re.compile(
    r"\b("
    r"crie|criar|adicione|adicionar|agende|agendar|marque|marcar|"
    r"lembrete|evento|compromisso|reuni[aã]o|tarefa|"
    r"nota|notas|"
    r"atualize|atualizar|edite|editar|mude|alterar|"
    r"remova|remover|delete|deletar|exclua|excluir"
    r")\b",
    re.IGNORECASE,
)


def should_use_tools(last_user_message: str) -> bool:
    """Retorna True quando há um 'trigger' de ação em calendário/notas."""
    text = (last_user_message or "").strip()
    if not text:
        return False
    return _ACTION_RE.search(text) is not None

