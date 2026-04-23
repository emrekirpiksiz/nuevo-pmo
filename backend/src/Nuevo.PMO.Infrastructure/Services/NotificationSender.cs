using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;
using Nuevo.PMO.Infrastructure.Auth;

namespace Nuevo.PMO.Infrastructure.Services;

public class NotificationSender : INotificationSender
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<NotificationSender> _logger;
    private readonly AppOptions _appOptions;

    public NotificationSender(
        IAppDbContext db,
        IEmailSender email,
        ILogger<NotificationSender> logger,
        IOptions<AppOptions> appOptions)
    {
        _db = db;
        _email = email;
        _logger = logger;
        _appOptions = appOptions.Value;
    }

    public async Task SendAsync(
        IEnumerable<User> recipients,
        NotificationType type,
        string title,
        string body,
        string? actionUrl,
        Guid? projectId,
        Guid? documentId,
        Guid? commentId,
        CancellationToken ct = default)
    {
        var list = recipients
            .Where(u => u is not null && u.IsActive && !string.IsNullOrWhiteSpace(u.Email))
            .GroupBy(u => u.Id)
            .Select(g => g.First())
            .ToList();

        if (list.Count == 0) return;

        foreach (var user in list)
        {
            var n = new Notification
            {
                RecipientId = user.Id,
                Type = type,
                Title = title,
                Body = body,
                ActionUrl = actionUrl,
                ProjectId = projectId,
                DocumentId = documentId,
                CommentId = commentId
            };
            _db.Notifications.Add(n);
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bildirim DB kayd\u0131 ba\u015far\u0131s\u0131z (type={Type}, title={Title})", type, title);
            return;
        }

        foreach (var user in list)
        {
            try
            {
                var fullUrl = BuildFullUrl(actionUrl);
                var html = BuildEmailHtml(user.DisplayName, title, body, fullUrl);
                await _email.SendAsync(user.Email, title, html, ct);
            }
            catch (Exception ex)
            {
                // Mail hatas\u0131 DB kayd\u0131n\u0131 bozmas\u0131n; sadece logla.
                _logger.LogWarning(ex, "Bildirim maili g\u00f6nderilemedi: {Email}", user.Email);
            }
        }
    }

    private string? BuildFullUrl(string? actionUrl)
    {
        if (string.IsNullOrWhiteSpace(actionUrl)) return null;
        if (actionUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            actionUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return actionUrl;
        }
        var baseUrl = _appOptions.PublicUrl?.TrimEnd('/') ?? "";
        var path = actionUrl.StartsWith('/') ? actionUrl : "/" + actionUrl;
        return baseUrl + path;
    }

    private static string BuildEmailHtml(string displayName, string title, string body, string? actionUrl)
    {
        var safeTitle = System.Net.WebUtility.HtmlEncode(title);
        var safeBody = System.Net.WebUtility.HtmlEncode(body).Replace("&#xA;", "<br/>");
        var safeName = System.Net.WebUtility.HtmlEncode(displayName ?? "");
        var button = string.IsNullOrWhiteSpace(actionUrl)
            ? ""
            : $@"<div style=""margin:28px 0"">
  <a href=""{actionUrl}"" style=""background:#1a1d21;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;font-weight:500;letter-spacing:0.2px"">Görüntüle →</a>
</div>";

        return $@"<!DOCTYPE html>
<html lang=""tr"">
<head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width,initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f5f4f0;padding:32px 16px"">
    <tr><td align=""center"">
      <table width=""100%"" style=""max-width:560px"" cellpadding=""0"" cellspacing=""0"">

        <!-- Header / Logo -->
        <tr><td style=""background:#1a1d21;border-radius:12px 12px 0 0;padding:24px 32px"">
          <div style=""font-size:26px;font-weight:800;letter-spacing:-1.5px;color:#6abd49;font-family:Georgia,serif"">nuevo</div>
          <div style=""font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6a6860;margin-top:4px"">Project Management Portal</div>
        </td></tr>

        <!-- Body -->
        <tr><td style=""background:#ffffff;padding:32px 32px 24px"">
          <p style=""color:#6a6860;margin:0 0 6px;font-size:13px"">Merhaba {safeName},</p>
          <h2 style=""margin:0 0 16px;color:#1a1d21;font-size:20px;font-weight:600;line-height:1.3"">{safeTitle}</h2>
          <p style=""color:#3a3830;line-height:1.7;margin:0;font-size:14px;white-space:pre-line"">{safeBody}</p>
          {button}
        </td></tr>

        <!-- Footer -->
        <tr><td style=""background:#f5f4f0;border:1px solid #e8e4da;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px"">
          <p style=""color:#9a9690;font-size:11px;margin:0;line-height:1.6"">
            Bu e-posta <strong style=""color:#6abd49"">Nuevo Project Management Portal</strong> tarafından otomatik olarak gönderilmiştir.<br/>
            Hesabınızla ilgili sorularınız için Nuevo ekibiyle iletişime geçebilirsiniz.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>";
    }
}
