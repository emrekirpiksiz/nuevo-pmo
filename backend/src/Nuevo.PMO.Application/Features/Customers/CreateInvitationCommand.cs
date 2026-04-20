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

        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existingUser is not null)
            throw new DomainException("USER_EXISTS", "A user with this email already exists.");

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
        var subject = $"{customer.Name} — Nuevo PMO davetiniz";
        var html = $"""
<p>Merhaba,</p>
<p><b>{customer.Name}</b> için Nuevo PMO platformuna davet edildiniz. Aşağıdaki link ile parolanızı belirleyip giriş yapabilirsiniz.</p>
<p><a href="{acceptUrl}">{acceptUrl}</a></p>
<p>Bu link {_opt.Value.InvitationTtlDays} gün içinde geçerlidir.</p>
""";
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
