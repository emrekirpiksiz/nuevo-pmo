using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Features.Customers;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Auth;

public record AcceptInvitationCommand(string Token, string DisplayName, string Password) : IRequest<AuthResultDto>;

public class AcceptInvitationValidator : AbstractValidator<AcceptInvitationCommand>
{
    public AcceptInvitationValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(10)
            .Matches("[A-Za-z]").WithMessage("Parola en az bir harf içermelidir.")
            .Matches("[0-9]").WithMessage("Parola en az bir rakam içermelidir.");
    }
}

public class AcceptInvitationHandler : IRequestHandler<AcceptInvitationCommand, AuthResultDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;

    public AcceptInvitationHandler(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
    }

    public async Task<AuthResultDto> Handle(AcceptInvitationCommand request, CancellationToken ct)
    {
        var hash = CreateInvitationHandler.HashToken(request.Token);
        var inv = await _db.Invitations.IgnoreQueryFilters()
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.TokenHash == hash && !i.IsDeleted, ct)
            ?? throw new DomainException("INVITATION_NOT_FOUND", "Invitation is invalid.");

        if (inv.AcceptedAt is not null)
            throw new DomainException("INVITATION_ACCEPTED", "This invitation has already been used.");
        if (inv.ExpiresAt < DateTime.UtcNow)
            throw new DomainException("INVITATION_EXPIRED", "This invitation has expired.");

        var email = inv.Email;
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);

        if (user is not null)
        {
            var isPending = user.UserType == UserType.Customer
                            && user.PasswordHash is null
                            && !user.IsActive;
            if (!isPending)
                throw new DomainException("USER_EXISTS", "A user with this email already exists.");

            user.DisplayName = request.DisplayName.Trim();
            user.CustomerId = inv.CustomerId;
            user.PasswordHash = _hasher.Hash(request.Password);
            user.IsActive = true;
            user.LastLoginAt = DateTime.UtcNow;
        }
        else
        {
            user = new User
            {
                Email = email,
                DisplayName = request.DisplayName.Trim(),
                UserType = UserType.Customer,
                CustomerId = inv.CustomerId,
                PasswordHash = _hasher.Hash(request.Password),
                IsActive = true,
                LastLoginAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }

        inv.AcceptedAt = DateTime.UtcNow;
        inv.AcceptedUserId = user.Id;

        await _db.SaveChangesAsync(ct);

        var token = _tokens.IssueAccessToken(user, out var expiresAt);
        return new AuthResultDto
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            User = new UserSummaryDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                UserType = user.UserType,
                CustomerId = user.CustomerId,
                CustomerName = inv.Customer.Name
            }
        };
    }
}
