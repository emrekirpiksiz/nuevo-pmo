using System.Security.Claims;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Api.Common;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUser(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var sub = Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? Principal?.FindFirst("sub")?.Value;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value
                            ?? Principal?.FindFirst("email")?.Value;

    public string? DisplayName => Principal?.FindFirst(ClaimTypes.Name)?.Value
                                  ?? Principal?.FindFirst("name")?.Value;

    public UserType? UserType
    {
        get
        {
            var raw = Principal?.FindFirst("user_type")?.Value;
            return Enum.TryParse<UserType>(raw, out var v) ? v : null;
        }
    }

    public Guid? CustomerId
    {
        get
        {
            var raw = Principal?.FindFirst("customer_id")?.Value;
            return Guid.TryParse(raw, out var v) ? v : null;
        }
    }

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;
    public bool IsNuevo => UserType == Nuevo.PMO.Domain.Enums.UserType.Nuevo;
    public bool IsCustomer => UserType == Nuevo.PMO.Domain.Enums.UserType.Customer;

    public string? IpAddress => _accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
    public string? UserAgent => _accessor.HttpContext?.Request.Headers.UserAgent.ToString();
    public string? CorrelationId => _accessor.HttpContext?.Items["CorrelationId"] as string;
}
