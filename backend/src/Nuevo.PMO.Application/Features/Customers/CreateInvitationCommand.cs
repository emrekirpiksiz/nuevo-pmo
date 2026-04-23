using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Customers;

public class InvitationOptions
{
    public string PublicUrl { get; set; } = "http://localhost:7001";
    public int InvitationTtlDays { get; set; } = 7;
}

public record CreateInvitationCommand(Guid CustomerId, string Email) : IRequest<InvitationResultDto>, IAuditableCommand
{
    public string AuditAction => "InvitationSent";
    public string? AuditEntityType => "Invitation";
    public string? AuditEntityId { get; set; }
}

public class CreateInvitationValidator : AbstractValidator<CreateInvitationCommand>
{
    public CreateInvitationValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
    }
}

public class InvitationResultDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string AcceptUrl { get; set; } = string.Empty;
}

public class CreateInvitationHandler : IRequestHandler<CreateInvitationCommand, InvitationResultDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IEmailSender _email;
    private readonly IOptions<InvitationOptions> _opt;
    private readonly ILogger<CreateInvitationHandler> _logger;

    public CreateInvitationHandler(IAppDbContext db, ICurrentUser user, IEmailSender email, IOptions<InvitationOptions> opt, ILogger<CreateInvitationHandler> logger)
    {
        _db = db;
        _user = user;
        _email = email;
        _opt = opt;
        _logger = logger;
    }

    public async Task<InvitationResultDto> Handle(CreateInvitationCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, ct)
                       ?? throw new NotFoundException("Customer", request.CustomerId);

        var email = request.Email.Trim().ToLower();

        var existingUser = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);

        if (existingUser is not null)
        {
            var isPending = existingUser.UserType == UserType.Customer
                            && existingUser.PasswordHash is null
                            && !existingUser.IsActive;
            if (!isPending)
                throw new DomainException("USER_EXISTS", "A user with this email already exists.");
            if (existingUser.CustomerId != customer.Id)
                throw new DomainException("USER_OTHER_CUSTOMER", "This email is already invited to another customer.");
        }
        else
        {
            existingUser = new User
            {
                Email = email,
                DisplayName = email,
                UserType = UserType.Customer,
                CustomerId = customer.Id,
                PasswordHash = null,
                IsActive = false
            };
            _db.Users.Add(existingUser);
        }

        var activeInvitation = await _db.Invitations
            .FirstOrDefaultAsync(i => i.Email == email && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow, ct);

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var hash = HashToken(rawToken);

        var inv = new Invitation
        {
            Email = email,
            CustomerId = customer.Id,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(_opt.Value.InvitationTtlDays)
        };
        _db.Invitations.Add(inv);

        if (activeInvitation is not null)
        {
            activeInvitation.IsDeleted = true;
        }

        await _db.SaveChangesAsync(ct);

        var acceptUrl = $"{_opt.Value.PublicUrl.TrimEnd('/')}/accept-invite?token={rawToken}";
        var subject = $"{customer.Name} — Nuevo Project Management Portal'a davetlisiniz";
        var safeCustomer = System.Net.WebUtility.HtmlEncode(customer.Name);
        var html = $@"<!DOCTYPE html>
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
          <p style=""color:#6a6860;margin:0 0 6px;font-size:13px"">Merhaba,</p>
          <h2 style=""margin:0 0 16px;color:#1a1d21;font-size:20px;font-weight:600;line-height:1.3"">Projeye davet edildiniz</h2>
          <p style=""color:#3a3830;line-height:1.7;margin:0 0 20px;font-size:14px"">
            <strong>{safeCustomer}</strong> adına Nuevo Project Management Portal'a davet edildiniz.
            Aşağıdaki butona tıklayarak parolanızı belirleyip platforma erişim sağlayabilirsiniz.
          </p>
          <div style=""margin:28px 0"">
            <a href=""{acceptUrl}"" style=""background:#1a1d21;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;font-weight:500;letter-spacing:0.2px"">
              Hesabımı Oluştur →
            </a>
          </div>
          <p style=""color:#9a9690;font-size:12px;margin:0"">
            Bu davet bağlantısı <strong>{_opt.Value.InvitationTtlDays} gün</strong> süreyle geçerlidir.<br/>
            Butona tıklayamıyorsanız şu adresi tarayıcınıza kopyalayın:<br/>
            <a href=""{acceptUrl}"" style=""color:#6abd49;word-break:break-all"">{acceptUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style=""background:#f5f4f0;border:1px solid #e8e4da;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px"">
          <p style=""color:#9a9690;font-size:11px;margin:0;line-height:1.6"">
            Bu e-posta <strong style=""color:#6abd49"">Nuevo Project Management Portal</strong> tarafından otomatik olarak gönderilmiştir.<br/>
            Bu daveti siz talep etmediyseniz bu e-postayı görmezden gelebilirsiniz.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>";
        try
        {
            await _email.SendAsync(email, subject, html, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invitation email could not be sent to {Email}; invitation link still valid.", email);
        }

        return new InvitationResultDto
        {
            Id = inv.Id,
            Email = inv.Email,
            ExpiresAt = inv.ExpiresAt,
            AcceptUrl = acceptUrl
        };
    }

    public static string HashToken(string raw)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
