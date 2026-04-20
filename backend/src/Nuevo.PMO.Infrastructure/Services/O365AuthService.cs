using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Infrastructure.Auth;

namespace Nuevo.PMO.Infrastructure.Services;

public class O365AuthService : IO365AuthService
{
    private readonly O365Options _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<O365AuthService> _logger;

    public O365AuthService(IOptions<O365Options> options, IHttpClientFactory httpClientFactory, ILogger<O365AuthService> logger)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public string BuildAuthorizeUrl(string state, string codeVerifier)
    {
        if (string.IsNullOrWhiteSpace(_options.TenantId) || string.IsNullOrWhiteSpace(_options.ClientId))
        {
            throw new DomainException("O365_NOT_CONFIGURED", "Azure AD is not configured.");
        }

        var challenge = PkceHelper.ComputeChallenge(codeVerifier);
        var scope = Uri.EscapeDataString(string.Join(' ', _options.Scopes));
        var url = $"https://login.microsoftonline.com/{_options.TenantId}/oauth2/v2.0/authorize" +
                  $"?client_id={_options.ClientId}" +
                  $"&response_type=code" +
                  $"&redirect_uri={Uri.EscapeDataString(_options.RedirectUri)}" +
                  $"&response_mode=query" +
                  $"&scope={scope}" +
                  $"&state={Uri.EscapeDataString(state)}" +
                  $"&code_challenge={challenge}" +
                  $"&code_challenge_method=S256";
        return url;
    }

    public async Task<O365UserInfo> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TenantId) || string.IsNullOrWhiteSpace(_options.ClientId))
        {
            throw new DomainException("O365_NOT_CONFIGURED", "Azure AD is not configured.");
        }

        var http = _httpClientFactory.CreateClient();
        var tokenEndpoint = $"https://login.microsoftonline.com/{_options.TenantId}/oauth2/v2.0/token";

        var form = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _options.RedirectUri,
            ["scope"] = string.Join(' ', _options.Scopes),
            ["code_verifier"] = codeVerifier,
        };
        if (!string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            form["client_secret"] = _options.ClientSecret;
        }
        var content = new FormUrlEncodedContent(form);

        var response = await http.PostAsync(tokenEndpoint, content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("O365 token exchange failed: {Status} {Body}", response.StatusCode, body);
            throw new DomainException("O365_EXCHANGE_FAILED", "Failed to exchange O365 authorization code.");
        }

        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct)
            ?? throw new DomainException("O365_EXCHANGE_FAILED", "Empty token response from Azure AD.");

        if (string.IsNullOrWhiteSpace(tokenResponse.IdToken))
            throw new DomainException("O365_EXCHANGE_FAILED", "Azure AD did not return an id_token.");

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenResponse.IdToken);

        return new O365UserInfo
        {
            ExternalId = jwt.Claims.FirstOrDefault(c => c.Type == "oid")?.Value
                        ?? jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value
                        ?? throw new DomainException("O365_NO_OID", "Missing oid in id_token."),
            Email = jwt.Claims.FirstOrDefault(c => c.Type == "preferred_username")?.Value
                    ?? jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value
                    ?? throw new DomainException("O365_NO_EMAIL", "Missing email in id_token."),
            DisplayName = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "Nuevo User"
        };
    }

    private class TokenResponse
    {
        [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
        [JsonPropertyName("id_token")] public string? IdToken { get; set; }
        [JsonPropertyName("refresh_token")] public string? RefreshToken { get; set; }
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
    }
}

internal static class PkceHelper
{
    public static string GenerateVerifier()
    {
        var bytes = new byte[64];
        System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    public static string ComputeChallenge(string verifier)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(verifier));
        return Base64UrlEncode(hash);
    }

    public static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
