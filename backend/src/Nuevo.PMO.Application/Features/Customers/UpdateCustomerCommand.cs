using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Application.Features.Customers;

public record UpdateCustomerCommand(Guid Id, string Name, string ContactEmail) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CustomerUpdated";
    public string? AuditEntityType => "Customer";
    public string? AuditEntityId => Id.ToString();
}

public class UpdateCustomerValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress().MaximumLength(256);
    }
}

public class UpdateCustomerHandler : IRequestHandler<UpdateCustomerCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpdateCustomerHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<Unit> Handle(UpdateCustomerCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
                ?? throw new NotFoundException("Customer", request.Id);
        c.Name = request.Name.Trim();
        c.ContactEmail = request.ContactEmail.Trim().ToLower();
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record DeleteCustomerCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CustomerDeleted";
    public string? AuditEntityType => "Customer";
    public string? AuditEntityId => Id.ToString();
}

public class DeleteCustomerHandler : IRequestHandler<DeleteCustomerCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteCustomerHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<Unit> Handle(DeleteCustomerCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
                ?? throw new NotFoundException("Customer", request.Id);
        _db.Customers.Remove(c);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
