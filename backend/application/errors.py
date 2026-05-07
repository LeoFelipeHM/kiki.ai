class AuthApplicationError(Exception):
    """Erro de autenticação/autorização na camada de aplicação."""


class InvalidCredentialsError(AuthApplicationError):
    def __init__(self, detail: str = "Credenciais inválidas.") -> None:
        self.detail = detail
        super().__init__(detail)


class EmailAlreadyRegisteredError(AuthApplicationError):
    def __init__(self, detail: str = "E-mail já cadastrado.") -> None:
        self.detail = detail
        super().__init__(detail)


class InvalidRefreshTokenError(AuthApplicationError):
    def __init__(self, detail: str | None = None) -> None:
        self.detail = detail or "Refresh token inválido."
        super().__init__(self.detail)


class InvalidAccessTokenError(AuthApplicationError):
    def __init__(self, detail: str | None = None) -> None:
        self.detail = detail or "Token inválido."
        super().__init__(self.detail)


class UserInactiveError(AuthApplicationError):
    def __init__(self, detail: str = "Usuário inativo.") -> None:
        self.detail = detail
        super().__init__(detail)


class AccountLockedError(AuthApplicationError):
    def __init__(self, detail: str = "Conta temporariamente bloqueada por tentativas inválidas.") -> None:
        self.detail = detail
        super().__init__(detail)


class AdminApplicationError(Exception):
    pass


class AdminNoFieldsError(AdminApplicationError):
    def __init__(self, detail: str = "Nenhum campo para atualizar.") -> None:
        self.detail = detail
        super().__init__(detail)


class AdminEmailConflictError(AdminApplicationError):
    def __init__(self, detail: str = "E-mail já cadastrado.") -> None:
        self.detail = detail
        super().__init__(detail)


class AdminSelfDeactivateError(AdminApplicationError):
    def __init__(self, detail: str = "Você não pode desativar a própria conta por aqui.") -> None:
        self.detail = detail
        super().__init__(detail)


class AdminDeleteSelfError(AdminApplicationError):
    def __init__(self, detail: str = "Não é possível excluir a própria conta.") -> None:
        self.detail = detail
        super().__init__(detail)


class AdminUserNotFoundError(AdminApplicationError):
    def __init__(self, detail: str = "Usuário não encontrado.") -> None:
        self.detail = detail
        super().__init__(detail)

