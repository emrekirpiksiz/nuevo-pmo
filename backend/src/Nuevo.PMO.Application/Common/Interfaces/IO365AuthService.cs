namespace Nuevo.PMO.Application.Common.Interfaces;

public class O365UserInfo
{
    public string ExternalId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public interface IO365AuthService
{
    string BuildAuthorizeUrl(string state, string codeVerifier);
    Task<O365UserInfo> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct = default);
}
