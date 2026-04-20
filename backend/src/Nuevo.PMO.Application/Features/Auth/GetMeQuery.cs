using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Application.Features.Auth;

public record GetMeQuery() : IRequest<UserSummaryDto>;

public class GetMeHandler : IRequestHandler<GetMeQuery, UserSummaryDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetMeHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<UserSummaryDto> Handle(GetMeQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var user = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Id == _user.UserId, ct)
            ?? throw new NotFoundException("User", _user.UserId!);
        return new UserSummaryDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            UserType = user.UserType,
            CustomerId = user.CustomerId,
            CustomerName = user.Customer?.Name
        };
    }
}
