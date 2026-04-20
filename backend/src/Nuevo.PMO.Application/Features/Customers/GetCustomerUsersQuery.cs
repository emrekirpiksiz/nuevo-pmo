using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Customers;

public record GetCustomerUsersQuery(Guid CustomerId) : IRequest<List<CustomerUserDto>>;

public class GetCustomerUsersHandler : IRequestHandler<GetCustomerUsersQuery, List<CustomerUserDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCustomerUsersHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<CustomerUserDto>> Handle(GetCustomerUsersQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        return await _db.Users
            .Where(u => u.CustomerId == request.CustomerId && u.UserType == UserType.Customer)
            .OrderBy(u => u.DisplayName)
            .Select(u => new CustomerUserDto
            {
                Id = u.Id,
                Email = u.Email,
                DisplayName = u.DisplayName,
                IsActive = u.IsActive,
                LastLoginAt = u.LastLoginAt,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync(ct);
    }
}
