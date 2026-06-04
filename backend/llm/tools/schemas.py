from __future__ import annotations

from typing import Any, Literal

ToolName = Literal[
    "calendar_list_events",
    "calendar_create_event",
    "calendar_list_friend_events",
    "calendar_create_friend_event",
    "calendar_update_event",
    "calendar_delete_event",
    "notes_list_notes",
    "notes_create_note",
    "notes_update_note",
    "notes_share_note",
    "notes_delete_note",
    "friends_list_friends",
    "contacts_list_contacts",
    "contacts_create_contact",
    "contacts_update_contact",
    "contacts_delete_contact",
    "web_browse_page",
    "agents_list_agents",
    "agents_create_agent",
    "agents_add_instruction",
    "agents_authorize_agent",
]


def tools_schema() -> list[dict[str, Any]]:
    """JSON Schema para OpenAI Chat Completions tool-calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "calendar_list_events",
                "description": "Lista eventos do calendário do usuário em um intervalo. Prefira ISO 8601 com timezone (ex.: 2026-05-09T09:00:00-03:00). Se from/to não forem informados, usa a semana atual (seg-dom).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "from_iso": {"type": ["string", "null"], "description": "Início do intervalo em ISO 8601 (inclua timezone/offset quando possível)."},
                        "to_iso": {"type": ["string", "null"], "description": "Fim do intervalo em ISO 8601 (inclua timezone/offset quando possível)."},
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_create_event",
                "description": "Cria um ou vários eventos no calendário. Sem recurrence = um único evento. Com recurrence = série (limite máximo 100 ocorrências e 730 dias após o primeiro início; informe count e/ou until_iso). Use ISO 8601 com timezone.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "starts_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "ends_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "event_type": {"type": "string", "enum": ["meeting", "task", "personal"]},
                        "color": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "status": {"type": "string"},
                        "guests": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": ["string", "null"]},
                                },
                                "required": ["name"],
                                "additionalProperties": False,
                            },
                        },
                        "recurrence": {
                            "type": ["object", "null"],
                            "description": "Opcional. frequency: daily | weekly | monthly | yearly; interval (padrão 1); informe count (total de ocorrências) e/ou until_iso (último início permitido).",
                            "properties": {
                                "frequency": {
                                    "type": "string",
                                    "enum": ["daily", "weekly", "monthly", "yearly"],
                                },
                                "interval": {"type": "integer", "minimum": 1},
                                "count": {"type": ["integer", "null"], "minimum": 1},
                                "until_iso": {"type": ["string", "null"]},
                            },
                            "required": ["frequency"],
                            "additionalProperties": False,
                        },
                    },
                    "required": ["title", "starts_at", "ends_at", "event_type"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_list_friend_events",
                "description": "Lista eventos da agenda de um amigo, quando a permissão do amigo permite consulta. Use friends_list_friends para resolver o amigo por nome/nickname antes, se necessário.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "friend_user_id": {"type": ["string", "null"], "description": "ID interno do amigo retornado por friends_list_friends."},
                        "friend_name": {"type": ["string", "null"], "description": "Nome ou nickname do amigo, quando o ID não estiver disponível."},
                        "from_iso": {"type": ["string", "null"], "description": "Início do intervalo em ISO 8601."},
                        "to_iso": {"type": ["string", "null"], "description": "Fim do intervalo em ISO 8601."},
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_create_friend_event",
                "description": "Cria ou solicita aprovação para criar um evento na agenda de um amigo. Se o amigo permitir criação direta, o evento é criado; caso contrário, gera pedido de aprovação.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "friend_user_id": {"type": ["string", "null"], "description": "ID interno do amigo retornado por friends_list_friends."},
                        "friend_name": {"type": ["string", "null"], "description": "Nome ou nickname do amigo, quando o ID não estiver disponível."},
                        "title": {"type": "string"},
                        "starts_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "ends_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "event_type": {"type": "string", "enum": ["meeting", "task", "personal"]},
                        "color": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "status": {"type": "string"},
                        "guests": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": ["string", "null"]},
                                },
                                "required": ["name"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["title", "starts_at", "ends_at", "event_type"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_update_event",
                "description": "Atualiza campos de um evento existente.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string"},
                        "title": {"type": ["string", "null"]},
                        "starts_at": {"type": ["string", "null"], "description": "ISO 8601 (inclua timezone/offset quando possível)."},
                        "ends_at": {"type": ["string", "null"], "description": "ISO 8601 (inclua timezone/offset quando possível)."},
                        "event_type": {
                            "oneOf": [
                                {"type": "string", "enum": ["meeting", "task", "personal"]},
                                {"type": "null"},
                            ]
                        },
                        "color": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "status": {"type": ["string", "null"]},
                        "guests": {
                            "type": ["array", "null"],
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": ["string", "null"]},
                                },
                                "required": ["name"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["event_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_delete_event",
                "description": "Exclui um evento do calendário do usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {"event_id": {"type": "string"}},
                    "required": ["event_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_list_notes",
                "description": "Lista notas do usuário. Se q for informado, busca em título, conteúdo e tags.",
                "parameters": {
                    "type": "object",
                    "properties": {"q": {"type": ["string", "null"]}},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_create_note",
                "description": "Cria uma nota.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "content": {"type": "string"},
                        "is_pinned": {"type": "boolean"},
                        "is_locked": {"type": "boolean"},
                        "tags": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["title", "content"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_update_note",
                "description": "Atualiza campos de uma nota existente.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "note_id": {"type": "string"},
                        "title": {"type": ["string", "null"]},
                        "content": {"type": ["string", "null"]},
                        "is_pinned": {"type": ["boolean", "null"]},
                        "is_locked": {"type": ["boolean", "null"]},
                        "tags": {"type": ["array", "null"], "items": {"type": "string"}},
                    },
                    "required": ["note_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_delete_note",
                "description": "Exclui uma nota do usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {"note_id": {"type": "string"}},
                    "required": ["note_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_share_note",
                "description": "Compartilha uma nota existente com um amigo usuário da Kiki, criando convite de colaboração. Use notes_list_notes e friends_list_friends para resolver nota e amigo quando necessário.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "note_id": {"type": ["string", "null"], "description": "ID interno da nota retornado por notes_list_notes."},
                        "note_title": {"type": ["string", "null"], "description": "Título ou trecho do título da nota, quando o ID não estiver disponível."},
                        "friend_user_id": {"type": ["string", "null"], "description": "ID interno do amigo retornado por friends_list_friends."},
                        "friend_name": {"type": ["string", "null"], "description": "Nome ou nickname do amigo, quando o ID não estiver disponível."},
                        "role": {"type": "string", "enum": ["editor", "viewer"], "description": "editor pode editar; viewer só visualiza."},
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "friends_list_friends",
                "description": "Lista amigos aceitos do usuário, incluindo nome, nickname, e-mail, ID interno e permissões de agenda. Use antes de consultar agenda de amigo, criar evento na agenda de amigo ou compartilhar nota por nome.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "contacts_list_contacts",
                "description": "Lista os contatos do usuário (nome e e-mail). Use para encontrar um contato existente antes de criar/atualizar/excluir, ou ao adicionar convidados a um evento do calendário.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "contacts_create_contact",
                "description": "Cria um contato (nome + e-mail) para o usuário. O e-mail deve ser único por usuário; em caso de duplicidade, o sistema retorna erro de e-mail já cadastrado.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Nome do contato. Não pode ser vazio."},
                        "email": {"type": "string", "description": "E-mail válido do contato."},
                    },
                    "required": ["name", "email"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "contacts_update_contact",
                "description": "Atualiza nome e/ou e-mail de um contato existente. Use o contact_id retornado por contacts_list_contacts.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "contact_id": {"type": "string"},
                        "name": {"type": ["string", "null"]},
                        "email": {"type": ["string", "null"]},
                    },
                    "required": ["contact_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "contacts_delete_contact",
                "description": "Exclui um contato do usuário. Confirme com o usuário antes de chamar.",
                "parameters": {
                    "type": "object",
                    "properties": {"contact_id": {"type": "string"}},
                    "required": ["contact_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "web_browse_page",
                "description": "Abre uma página pública indicada por URL e extrai texto, telefones, e-mails, WhatsApp, links de contato/agendamento e formulários visíveis. Use depois de encontrar URLs via web search. Não preenche formulários nem executa JavaScript.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "URL pública http/https da página a visitar. Não use URLs locais ou privadas.",
                        },
                    },
                    "required": ["url"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "agents_list_agents",
                "description": "Lista os agentes autônomos do usuário por nome/título, incluindo status, tarefa e progresso. Use o nome do agente ao falar com o usuário; não mencione IDs.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "agents_create_agent",
                "description": "Cria um agente autônomo planejado para uma tarefa nova. Não use para correções, filtros ou instruções adicionais sobre um agente recém-criado/existente; nesse caso use agents_add_instruction. O agente ainda aguardará autorização antes de executar. Ao responder ao usuário, refira-se ao agente pelo título gerado, não por ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task": {"type": "string", "description": "Tarefa completa que o agente deve planejar e executar."},
                        "type": {
                            "type": "string",
                            "enum": ["research", "shopping", "travel", "custom"],
                            "description": "Tipo do agente. Use custom quando não houver encaixe claro.",
                        },
                        "effort": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "Nível de pensamento: low=baixo, medium=médio, high=muito.",
                        },
                        "name": {"type": ["string", "null"], "description": "Nome opcional para o agente."},
                    },
                    "required": ["task"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "agents_add_instruction",
                "description": "Adiciona uma instrução, correção, filtro ou restrição a um agente já criado e ainda editável. Use quando o usuário disser algo como 'na verdade...', 'filtre apenas...', 'corrigindo...', 'quero que considere...' depois de criar um agente. Se souber o nome/título do agente, informe agent_name; se houver só um agente planejado/pausado/com erro, pode omitir.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "instruction": {
                            "type": "string",
                            "description": "Instrução adicional completa para anexar ao agente existente.",
                        },
                        "agent_name": {
                            "type": ["string", "null"],
                            "description": "Nome/título do agente a corrigir, quando conhecido.",
                        },
                        "agent_id": {
                            "type": ["string", "null"],
                            "description": "Uso interno apenas quando já estiver disponível; prefira agent_name.",
                        },
                    },
                    "required": ["instruction"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "agents_authorize_agent",
                "description": "Autoriza um agente planejado/pausado/com erro a entrar na fila de execução. Prefira informar agent_name, usando o nome/título do agente dito pelo usuário ou retornado na listagem. Não peça nem fale IDs ao usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "agent_name": {"type": ["string", "null"], "description": "Nome/título do agente a autorizar."},
                        "agent_id": {"type": ["string", "null"], "description": "Uso interno apenas quando já estiver disponível; prefira agent_name."},
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
    ]


def tools_schema_responses(names: set[str] | None = None) -> list[dict[str, Any]]:
    """Mesmas ferramentas no formato FunctionToolParam da Responses API (flat ``type``/``name``/``parameters``)."""
    result: list[dict[str, Any]] = []
    for t in tools_schema():
        fn = t["function"]
        if names is not None and fn["name"] not in names:
            continue
        result.append(
            {
                "type": "function",
                "name": fn["name"],
                "description": fn.get("description"),
                "parameters": fn["parameters"],
                "strict": False,
            }
        )
    return result
