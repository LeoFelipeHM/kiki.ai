from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from application.contacts_service import ContactsService, DuplicateContactEmailError
from presentation.api.dependencies import CurrentUserDep, get_contacts_service
from presentation.api.schemas.contacts import ContactCreate, ContactPatch, ContactResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])

ContactsServiceDep = Annotated[ContactsService, Depends(get_contacts_service)]


def _to_response(row: dict) -> ContactResponse:
    return ContactResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        name=row["name"],
        email=row["email"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    current_user: CurrentUserDep,
    contacts_service: ContactsServiceDep,
):
    rows = contacts_service.list_contacts(str(current_user["id"]))
    return [_to_response(r) for r in rows]


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactCreate,
    current_user: CurrentUserDep,
    contacts_service: ContactsServiceDep,
):
    try:
        row = contacts_service.create_contact(
            str(current_user["id"]),
            name=payload.name,
            email=str(payload.email),
        )
    except DuplicateContactEmailError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_response(row)


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: str,
    current_user: CurrentUserDep,
    contacts_service: ContactsServiceDep,
):
    row = contacts_service.get_contact(str(current_user["id"]), contact_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado.")
    return _to_response(row)


@router.patch("/{contact_id}", response_model=ContactResponse)
def patch_contact(
    contact_id: str,
    payload: ContactPatch,
    current_user: CurrentUserDep,
    contacts_service: ContactsServiceDep,
):
    data = payload.model_dump(exclude_unset=True)
    email_raw = data.get("email")
    try:
        row = contacts_service.update_contact(
            str(current_user["id"]),
            contact_id,
            name=data.get("name"),
            email=str(email_raw) if email_raw is not None else None,
        )
    except DuplicateContactEmailError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado.")
    return _to_response(row)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str,
    current_user: CurrentUserDep,
    contacts_service: ContactsServiceDep,
):
    if not contacts_service.delete_contact(str(current_user["id"]), contact_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato não encontrado.")
    return None
