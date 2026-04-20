using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Auth;

public class AuthResultDto
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserSummaryDto User { get; set; } = null!;
}

public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public UserType UserType { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
}
