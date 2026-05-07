from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from application.notes_service import EmptyNoteError, NotesService
from presentation.api.dependencies import CurrentUserDep, get_notes_service
from presentation.api.schemas.notes import NoteCreate, NotePatch, NoteResponse

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
        )
    except EmptyNoteError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return _to_response(row)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    current_user: CurrentUserDep,
    notes_service: NotesServiceDep,
):
    if not notes_service.delete_note(str(current_user["id"]), note_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada.")
    return None
