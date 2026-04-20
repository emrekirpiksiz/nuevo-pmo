using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Auth;

public record CustomerLoginCommand(string Email, string Password) : IRequest<AuthResultDto>;

public class CustomerLoginValidator : AbstractValidator<CustomerLoginCommand>
{
    public CustomerLoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class CustomerLoginHandler : IRequestHandler<CustomerLoginCommand, AuthResultDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;

    public CustomerLoginHandler(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
    }

    public async Task<AuthResultDto> Handle(CustomerLoginCommand request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLower();
        var user = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Email == email && u.UserType == UserType.Customer && !u.IsDeleted, ct);
        if (user is null || !user.IsActive || user.PasswordHash is null || !_hasher.Verify(request.Password, user.PasswordHash))
        {
            throw new DomainException("INVALID_CREDENTIALS", "Invalid email or password.");
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
                UserType = user.UserType,
                CustomerId = user.CustomerId,
                CustomerName = user.Customer?.Name
            }
        };
    }
}
