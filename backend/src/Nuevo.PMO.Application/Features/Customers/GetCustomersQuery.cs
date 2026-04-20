using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;

namespace Nuevo.PMO.Application.Features.Customers;

public record GetCustomersQuery(string? Search) : IRequest<List<CustomerDto>>;

public class GetCustomersHandler : IRequestHandler<GetCustomersQuery, List<CustomerDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCustomersHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<CustomerDto>> Handle(GetCustomersQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var q = _db.Customers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            q = q.Where(c => c.Name.ToLower().Contains(s) || c.ContactEmail.ToLower().Contains(s));
        }
        return await q.OrderBy(c => c.Name)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                ContactEmail = c.ContactEmail,
                CreatedAt = c.CreatedAt,
                UserCount = c.Users.Count(u => !u.IsDeleted),
                ProjectCount = c.Projects.Count(p => !p.IsDeleted)
            })
            .ToListAsync(ct);
    }
}
