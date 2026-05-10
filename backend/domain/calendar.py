class InvalidEventIntervalError(ValueError):
    """Intervalo de evento inválido (ends_at deve ser maior que starts_at)."""


class RecurrenceValidationError(ValueError):
    """Parâmetros de recorrência inválidos ou fora dos limites permitidos."""


class ScheduleConflictError(ValueError):
    """Sobreposição com eventos existentes ao criar uma ocorrência ou série."""

    def __init__(self, slot_start: object, conflicts: list[dict[str, object]]) -> None:
        self.slot_start = slot_start
        self.conflicts = conflicts
        super().__init__("Conflito de horário com evento(s) existente(s).")

