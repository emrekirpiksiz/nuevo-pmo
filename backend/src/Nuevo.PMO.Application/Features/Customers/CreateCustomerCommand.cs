using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Application.Features.Customers;

public record CreateCustomerCommand(string Name, string ContactEmail) : IRequest<CustomerDto>, IAuditableCommand
{
    public string AuditAction => "CustomerCreated";
    public string? AuditEntityType => "Customer";
    public string? AuditEntityId { get; set; }
}

public class CreateCustomerValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress().MaximumLength(256);
    }
}

public class CreateCustomerHandler : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public CreateCustomerHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<CustomerDto> Handle(CreateCustomerCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);

        var exists = await _db.Customers.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower(), ct);
        if (exists) throw new DomainException("CUSTOMER_EXISTS", $"Customer with name '{request.Name}' already exists.");

        var c = new Customer { Name = request.Name.Trim(), ContactEmail = request.ContactEmail.Trim().ToLower() };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync(ct);

        return new CustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            ContactEmail = c.ContactEmail,
            CreatedAt = c.CreatedAt
        };
    }
}
