namespace Nuevo.PMO.Infrastructure.Auth;

public class JwtOptions
{
    public string Issuer { get; set; } = "Nuevo.PMO";
    public string Audience { get; set; } = "Nuevo.PMO.Clients";
    public string Secret { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
}

public class O365Options
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:7001/admin/callback";
    public string[] Scopes { get; set; } = new[] { "openid", "profile", "email", "User.Read" };
}

public class SmtpOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1025;
    public string FromEmail { get; set; } = "noreply@nuevo.local";
    public string FromName { get; set; } = "Nuevo PMO";
    public string? UserName { get; set; }
    public string? Password { get; set; }
    public bool UseSsl { get; set; } = false;
}

public class AppOptions
{
    public string PublicUrl { get; set; } = "http://localhost:7001";
    public int InvitationTtlDays { get; set; } = 7;
    public int HeartbeatIntervalSeconds { get; set; } = 30;
}
