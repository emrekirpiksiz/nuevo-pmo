using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Auth;

public record O365LoginCommand(string Code, string CodeVerifier) : IRequest<AuthResultDto>;

public class O365LoginValidator : AbstractValidator<O365LoginCommand>
{
    public O365LoginValidator()
    {
        RuleFor(x => x.Code).NotEmpty();
        RuleFor(x => x.CodeVerifier).NotEmpty();
    }
}

public class O365LoginHandler : IRequestHandler<O365LoginCommand, AuthResultDto>
{
    private readonly IAppDbContext _db;
    private readonly IO365AuthService _o365;
    private readonly ITokenService _tokens;

    public O365LoginHandler(IAppDbContext db, IO365AuthService o365, ITokenService tokens)
    {
        _db = db;
        _o365 = o365;
        _tokens = tokens;
    }

    public async Task<AuthResultDto> Handle(O365LoginCommand request, CancellationToken ct)
    {
        var info = await _o365.ExchangeCodeAsync(request.Code, request.CodeVerifier, ct);
        var email = info.Email.Trim().ToLower();

        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.ExternalId == info.ExternalId, ct)
            ?? await _db.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == email && u.UserType == UserType.Nuevo, ct);

        if (user is null)
        {
            user = new User
            {
                Email = email,
                DisplayName = info.DisplayName,
                UserType = UserType.Nuevo,
                ExternalId = info.ExternalId,
                IsActive = true,
            };
            _db.Users.Add(user);
        }
        else
        {
            user.ExternalId ??= info.ExternalId;
            user.DisplayName = info.DisplayName;
            if (!user.IsActive) user.IsActive = true;
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

public record GetO365RedirectQuery(string State, string CodeVerifier) : IRequest<string>;

public class GetO365RedirectHandler : IRequestHandler<GetO365RedirectQuery, string>
{
    private readonly IO365AuthService _svc;

    public GetO365RedirectHandler(IO365AuthService svc) { _svc = svc; }

    public Task<string> Handle(GetO365RedirectQuery request, CancellationToken ct)
    {
        return Task.FromResult(_svc.BuildAuthorizeUrl(request.State, request.CodeVerifier));
    }
}
