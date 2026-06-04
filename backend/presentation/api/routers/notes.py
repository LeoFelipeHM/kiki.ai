from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from application.notes_service import EmptyNoteError, NotePermissionError, NoteVersionConflictError, NotesService
from presentation.api.dependencies import CurrentUserDep, get_notes_service
from presentation.api.schemas.notes import (
    NoteCollaboratorPatch,
    NoteCollaboratorResponse,
    NoteCreate,
    NotePatch,
    NoteResponse,
    NoteShareRequest,
)

router = APIRouter(prefix="/notes", tags=["notes"])

NotesServiceDep = Annotated[NotesService, Depends(get_notes_service)]


def _to_response(row: dict) -> NoteResponse:
    return NoteResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        title=row["title"],
        content=row["content"],
        is_pinned=bool(row["is_pinned"]),
        is_locked=bool(row["is_locked"]),
        tags=list(row.get("tags") or []),
        permission_role=str(row.get("permission_role") or "owner"),
        is_shared=bool(row.get("is_shared", False)),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=list[NoteResponse])
def list_notes(
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
    q: Annotated[str | None, Query(description="Busca em título, conteúdo ou tags")] = None,
):
    rows = notes_service.list_notes(str(current_user["id"]), q)
    return [_to_response(r) for r in rows]


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    try:
        row = notes_service.create_note(
            str(current_user["id"]),
            title=payload.title,
            content=payload.content,
            is_pinned=payload.is_pinned,
            is_locked=payload.is_locked,
            tags=payload.tags,
        )
    except EmptyNoteError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_response(row)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    row = notes_service.get_note(str(current_user["id"]), note_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return _to_response(row)


@router.patch("/{note_id}", response_model=NoteResponse)
def patch_note(
    note_id: str,
    payload: NotePatch,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    data = payload.model_dump(exclude_unset=True)
    tags_replace = "tags" in data
    tags_val = data.pop("tags", None) if tags_replace else None

    try:
        row = notes_service.update_note(
            str(current_user["id"]),
            note_id,
            title=data.get("title"),
            content=data.get("content"),
            is_pinned=data.get("is_pinned"),
            is_locked=data.get("is_locked"),
            tags_replace=tags_replace,
            tags=tags_val if tags_replace else None,
            expected_updated_at=data.get("expected_updated_at"),
        )
    except EmptyNoteError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except NoteVersionConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return _to_response(row)


@router.post("/{note_id}/share", response_model=NoteCollaboratorResponse, status_code=status.HTTP_201_CREATED)
def share_note(
    note_id: str,
    payload: NoteShareRequest,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    try:
        row = notes_service.share_note(
            str(current_user["id"]),
            note_id=note_id,
            target_user_id=payload.user_id,
            role=payload.role,
            actor_name=str(current_user.get("name") or "Um usuário"),
        )
    except NotePermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return NoteCollaboratorResponse(**row)


@router.get("/{note_id}/collaborators", response_model=list[NoteCollaboratorResponse])
def list_note_collaborators(
    note_id: str,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    rows = notes_service.list_collaborators(str(current_user["id"]), note_id)
    if rows is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return [NoteCollaboratorResponse(**row) for row in rows]


@router.patch("/{note_id}/collaborators/{user_id}", response_model=NoteCollaboratorResponse)
def patch_note_collaborator(
    note_id: str,
    user_id: str,
    payload: NoteCollaboratorPatch,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    row = notes_service.update_collaborator_role(str(current_user["id"]), note_id, user_id, payload.role)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado.")
    return NoteCollaboratorResponse(**row)


@router.delete("/{note_id}/collaborators/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note_collaborator(
    note_id: str,
    user_id: str,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    if not notes_service.remove_collaborator(str(current_user["id"]), note_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador não encontrado.")
    return None


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    if not notes_service.delete_note(str(current_user["id"]), note_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return None
