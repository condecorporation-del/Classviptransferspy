"""Excepciones de dominio — Errores de negocio tipados.

Cada excepción representa un error específico del dominio ClassVIP.
Son distintas de HTTPException (que pertenece a la capa de API).
Los endpoints capturan estas excepciones y las convierten en HTTP responses.
"""


class ClassVIPError(Exception):
    """Base para todas las excepciones de dominio."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(ClassVIPError):
    """Recurso no encontrado."""

    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            message=f"{entity} con id={entity_id} no encontrado",
            code="NOT_FOUND",
        )


class BookingNotFoundError(NotFoundError):
    """Reserva no encontrada."""

    def __init__(self, booking_id: str):
        super().__init__("Booking", booking_id)


class CustomerNotFoundError(NotFoundError):
    """Cliente no encontrado."""

    def __init__(self, customer_id: str):
        super().__init__("Customer", customer_id)


class AdminNotFoundError(NotFoundError):
    """Administrador no encontrado."""

    def __init__(self, admin_id: str):
        super().__init__("AdminUser", admin_id)


class InvalidBookingStateError(ClassVIPError):
    """La reserva no está en el estado correcto para esta operación."""

    def __init__(self, booking_id: str, current_state: str, required_state: str):
        super().__init__(
            message=f"Booking {booking_id} está en {current_state}, se requiere {required_state}",
            code="INVALID_STATE",
        )


class PricingNotFoundError(ClassVIPError):
    """No se encontró regla de precio para la ruta solicitada."""

    def __init__(self, zone_from: str, zone_to: str, vehicle_class: str):
        super().__init__(
            message=f"No hay precio para {zone_from} → {zone_to} ({vehicle_class})",
            code="PRICING_NOT_FOUND",
        )


class AuthenticationError(ClassVIPError):
    """Credenciales inválidas."""

    def __init__(self, message: str = "Email o contraseña inválidos"):
        super().__init__(message=message, code="AUTH_FAILED")


class DuplicateEntityError(ClassVIPError):
    """Entidad duplicada (email ya existe, etc.)."""

    def __init__(self, entity: str, field: str, value: str):
        super().__init__(
            message=f"{entity} con {field}={value} ya existe",
            code="DUPLICATE",
        )


class ValidationError(ClassVIPError):
    """Error de validación de negocio."""

    def __init__(self, message: str):
        super().__init__(message=message, code="VALIDATION_ERROR")
