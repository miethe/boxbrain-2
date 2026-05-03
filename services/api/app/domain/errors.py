class DomainError(Exception):
    """Base class for application-visible domain errors."""


class NotFoundError(DomainError):
    """Raised when an entity cannot be found."""


class PermissionDeniedError(DomainError):
    """Raised when an actor cannot perform an action."""


class InvariantViolationError(DomainError):
    """Raised when a domain invariant would be violated."""


class ConflictError(DomainError):
    """Raised when a command conflicts with current state."""
