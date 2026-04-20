using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Common.Interfaces;

public interface ICurrentUser
{
    Guid? UserId { get; }
    string? Email { get; }
    string? DisplayName { get; }
    UserType? UserType { get; }
    Guid? CustomerId { get; }
    bool IsAuthenticated { get; }
    bool IsNuevo { get; }
    bool IsCustomer { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
    string? CorrelationId { get; }
}
