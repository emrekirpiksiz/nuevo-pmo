using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Auth;

public record DevLoginCommand(string Email, string? DisplayName = null) : IRequest<AuthResultDto>;

public class DevLoginHandler : IRequestHandler<DevLoginCommand, AuthResultDto>
{
    private readonly IAppDbContext _db;
    private readonly ITokenService _tokens;

    public DevLoginHandler(IAppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public async Task<AuthResultDto> Handle(DevLoginCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new DomainException("INVALID_EMAIL", "Email is required.");

        var email = request.Email.Trim().ToLower();
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && u.UserType == UserType.Nuevo, ct);

        if (user is null)
        {
            user = new User
            {
                Email = email,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email.Split('@')[0] : request.DisplayName,
                UserType = UserType.Nuevo,
                IsActive = true,
                ExternalId = "dev-" + Guid.NewGuid().ToString("N")
            };
            _db.Users.Add(user);
        }
        user.LastLoginAt = DateTime.UtcNow;
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
                UserType = user.UserType
            }
        };
    }
}
