using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Application.Features.Customers;

public record GetCustomerByIdQuery(Guid Id) : IRequest<CustomerDto>;

public class GetCustomerByIdHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCustomerByIdHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<CustomerDto> Handle(GetCustomerByIdQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
                ?? throw new NotFoundException("Customer", request.Id);

        return new CustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            ContactEmail = c.ContactEmail,
            CreatedAt = c.CreatedAt,
            UserCount = await _db.Users.CountAsync(u => u.CustomerId == c.Id, ct),
            ProjectCount = await _db.Projects.CountAsync(p => p.CustomerId == c.Id, ct)
        };
    }
}
