from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from application.agents_service import (
    AgentInvalidInputError,
    AgentInvalidTransitionError,
    AgentNotFoundError,
    AgentsService,
)
from presentation.api.dependencies import CurrentUserDep, get_agents_service
from presentation.api.schemas.agents import (
    AgentCreate,
    AgentMessageCreate,
    AgentMessageResponse,
    AgentPatch,
    AgentReorder,
    AgentResponse,
)

router = APIRouter(prefix="/agents", tags=["agents"])

AgentsServiceDep = Annotated[AgentsService, Depends(get_agents_service)]


def _to_response(row: dict) -> AgentResponse:
    return AgentResponse.model_validate(row)


def _to_message_response(row: dict) -> AgentMessageResponse:
    return AgentMessageResponse.model_validate(row)


def _handle_agent_error(exc: Exception) -> None:
    if isinstance(exc, AgentNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(exc, AgentInvalidTransitionError):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if isinstance(exc, AgentInvalidInputError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    raise exc


@router.get("", response_model=list[AgentResponse])
def list_agents(current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    rows = agents_service.list_agents(str(current_user["id"]))
    return [_to_response(row) for row in rows]


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreate,
    current_user: CurrentUserDep,
    agents_service: AgentsServiceDep,
):
    try:
        row = agents_service.create_agent(
            str(current_user["id"]),
            task=payload.task,
            agent_type=payload.type,
            effort=payload.effort,
            name=payload.name,
        )
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.post("/reorder", response_model=list[AgentResponse])
def reorder_agents(
    payload: AgentReorder,
    current_user: CurrentUserDep,
    agents_service: AgentsServiceDep,
):
    rows = agents_service.reorder_agents(str(current_user["id"]), payload.agent_ids)
    return [_to_response(row) for row in rows]


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    try:
        row = agents_service.get_agent(str(current_user["id"]), agent_id)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.patch("/{agent_id}", response_model=AgentResponse)
def patch_agent(
    agent_id: str,
    payload: AgentPatch,
    current_user: CurrentUserDep,
    agents_service: AgentsServiceDep,
):
    try:
        row = agents_service.update_agent_effort(str(current_user["id"]), agent_id, payload.effort)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.post("/{agent_id}/authorize", response_model=AgentResponse)
def authorize_agent(agent_id: str, current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    try:
        row = agents_service.authorize_agent(str(current_user["id"]), agent_id)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.post("/{agent_id}/pause", response_model=AgentResponse)
def pause_agent(agent_id: str, current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    try:
        row = agents_service.pause_agent(str(current_user["id"]), agent_id)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.post("/{agent_id}/resume", response_model=AgentResponse)
def resume_agent(agent_id: str, current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    try:
        row = agents_service.resume_agent(str(current_user["id"]), agent_id)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_response(row)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: str, current_user: CurrentUserDep, agents_service: AgentsServiceDep):
    if not agents_service.delete_agent(str(current_user["id"]), agent_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agente não encontrado.")
    return None


@router.get("/{agent_id}/messages", response_model=list[AgentMessageResponse])
def list_agent_messages(
    agent_id: str,
    current_user: CurrentUserDep,
    agents_service: AgentsServiceDep,
):
    try:
        rows = agents_service.list_messages(str(current_user["id"]), agent_id)
    except Exception as exc:
        _handle_agent_error(exc)
    return [_to_message_response(row) for row in rows]


@router.post("/{agent_id}/messages", response_model=AgentMessageResponse, status_code=status.HTTP_201_CREATED)
def create_agent_message(
    agent_id: str,
    payload: AgentMessageCreate,
    current_user: CurrentUserDep,
    agents_service: AgentsServiceDep,
):
    try:
        row = agents_service.create_message(str(current_user["id"]), agent_id, payload.content)
    except Exception as exc:
        _handle_agent_error(exc)
    return _to_message_response(row)
