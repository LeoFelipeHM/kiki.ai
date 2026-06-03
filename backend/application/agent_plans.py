from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Literal

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

AgentType = Literal["research", "shopping", "travel", "custom"]
AgentEffort = Literal["low", "medium", "high"]
PLANNING_STEP = "Planejamento"


@dataclass(frozen=True)
class AgentPlanDraft:
    title: str
    steps: list[str]

AGENT_TYPE_CONFIG: dict[AgentType, dict[str, str]] = {
    "research": {
        "name": "Pesquisador",
        "color": "from-blue-500 to-cyan-500",
        "description": "Pesquisa, compara fontes e sintetiza respostas.",
    },
    "shopping": {
        "name": "Compras",
        "color": "from-purple-500 to-pink-500",
        "description": "Compara opções, preço, prazo e risco de compra.",
    },
    "travel": {
        "name": "Viagens",
        "color": "from-orange-500 to-yellow-500",
        "description": "Organiza rotas, datas, hospedagem e alternativas.",
    },
    "custom": {
        "name": "Personalizado",
        "color": "from-green-500 to-emerald-500",
        "description": "Planeja e executa tarefas abertas.",
    },
}

TYPE_PLANS: dict[AgentType, list[str]] = {
    "research": [
        "Entender o objetivo da pesquisa e os critérios de resposta",
        "Definir termos de busca e fontes prioritárias",
        "Coletar informações relevantes",
        "Sintetizar os achados em uma resposta acionável",
    ],
    "shopping": [
        "Entender o produto, restrições e critérios de compra",
        "Mapear opções disponíveis e comparáveis",
        "Comparar preço, prazo, confiabilidade e benefícios",
        "Recomendar as melhores opções com ressalvas",
    ],
    "travel": [
        "Entender origem, destino, datas e preferências",
        "Mapear rotas, horários e restrições importantes",
        "Comparar alternativas por custo, tempo e conveniência",
        "Montar recomendação final de viagem",
    ],
    "custom": [
        "Interpretar o pedido e separar objetivos",
        "Quebrar o trabalho em tarefas executáveis",
        "Executar as tarefas na ordem mais eficiente",
        "Consolidar resultado e próximas ações",
    ],
}

EFFORT_EXTRA_STEPS: dict[AgentEffort, list[str]] = {
    "low": [],
    "medium": ["Validar coerência dos achados antes da resposta final"],
    "high": [
        "Cruzar evidências e procurar inconsistências",
        "Refinar a resposta com alternativas e próximos passos",
    ],
}


def fallback_agent_plan(agent_type: AgentType, effort: AgentEffort) -> list[str]:
    return [PLANNING_STEP, *TYPE_PLANS[agent_type], *EFFORT_EXTRA_STEPS[effort]]


def fallback_agent_title(task: str, agent_type: AgentType) -> str:
    theme = re.sub(r"\s+", " ", task.strip())
    theme = theme[:70].strip(" .,:;!?")
    prefix = AGENT_TYPE_CONFIG[agent_type]["name"]
    return f"{prefix}: {theme}" if theme else f"{prefix} Kiki"


def fallback_agent_draft(task: str, agent_type: AgentType, effort: AgentEffort) -> AgentPlanDraft:
    return AgentPlanDraft(
        title=fallback_agent_title(task, agent_type),
        steps=fallback_agent_plan(agent_type, effort),
    )


def _model_name() -> str:
    return (
        os.getenv("OPENAI_AGENT_PLANNER_MODEL", "").strip()
        or os.getenv("OPENAI_CHAT_MODEL", "").strip()
        or "gpt-5.4-mini"
    )


def _json_from_text(text: str) -> object | None:
    clean = text.strip()
    if not clean:
        return None
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        for pattern in (r"\{[\s\S]*\}", r"\[[\s\S]*\]"):
            match = re.search(pattern, clean)
            if not match:
                continue
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                continue
    return None


def _normalize_title(raw: object, task: str, agent_type: AgentType) -> str:
    value = str(raw).strip() if raw is not None else ""
    value = re.sub(r"\s+", " ", value).strip(" \"'")
    if not value:
        return fallback_agent_title(task, agent_type)
    return value[:90].strip(" .,:;!?") or fallback_agent_title(task, agent_type)


def _parse_steps(parsed: object) -> list[str]:
    if not isinstance(parsed, list):
        return []
    steps: list[str] = []
    seen: set[str] = {PLANNING_STEP.lower()}
    for item in parsed:
        value = str(item).strip() if item is not None else ""
        value = re.sub(r"^\d+[\).\-\s]+", "", value).strip()
        if not value:
            continue
        if value.lower().startswith("planej"):
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        steps.append(value[:220])
    return steps


def _parse_draft(raw: str, task: str, agent_type: AgentType) -> AgentPlanDraft | None:
    parsed = _json_from_text(raw)
    if isinstance(parsed, dict):
        title = _normalize_title(parsed.get("title"), task, agent_type)
        steps = _parse_steps(parsed.get("steps"))
        if steps:
            return AgentPlanDraft(title=title, steps=[PLANNING_STEP, *steps])
    if isinstance(parsed, list):
        steps = _parse_steps(parsed)
        if steps:
            return AgentPlanDraft(
                title=fallback_agent_title(task, agent_type),
                steps=[PLANNING_STEP, *steps],
            )
    return None


def build_agent_draft(task: str, agent_type: AgentType, effort: AgentEffort) -> AgentPlanDraft:
    key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        return fallback_agent_draft(task, agent_type, effort)

    expected = 3 if effort == "low" else 4 if effort == "medium" else 6
    prompt = (
        "Gere um título curto e nomes acionáveis para as etapas de execução de um agente autônomo.\n"
        'Responda somente com JSON válido no formato: {"title":"...","steps":["..."]}.\n'
        "O título deve ter relação direta com o tema da tarefa, sem ser genérico.\n"
        f"Não inclua a etapa de planejamento; ela será adicionada automaticamente como primeira etapa.\n"
        f"Quantidade desejada de etapas após o planejamento: {expected}.\n"
        f"Tipo do agente: {agent_type}.\n"
        f"Nível de esforço: {effort}.\n"
        f"Tarefa do usuário: {task.strip()}\n"
        "Cada etapa deve descrever uma ação concreta que o agente executará."
    )
    try:
        client = OpenAI(api_key=key)
        response = client.chat.completions.create(
            model=_model_name(),
            messages=[
                {
                    "role": "system",
                    "content": "Você é um planejador de execução. Sua saída deve ser apenas JSON válido.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        draft = _parse_draft(raw, task, agent_type)
    except (APIConnectionError, APIStatusError, RateLimitError, Exception):
        return fallback_agent_draft(task, agent_type, effort)

    if draft is None:
        return fallback_agent_draft(task, agent_type, effort)
    return draft


def build_agent_plan(task: str, agent_type: AgentType, effort: AgentEffort) -> list[str]:
    return build_agent_draft(task, agent_type, effort).steps


def effort_label(effort: AgentEffort) -> str:
    if effort == "low":
        return "baixo"
    if effort == "medium":
        return "médio"
    return "muito"
