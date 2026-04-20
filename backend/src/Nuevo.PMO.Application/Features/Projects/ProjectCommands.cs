using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Projects;

public record CreateProjectCommand(
    string Code,
    string Name,
    string? Description,
    Guid CustomerId
) : IRequest<ProjectDto>, IAuditableCommand
{
    public string AuditAction => "ProjectCreated";
    public string? AuditEntityType => "Project";
    public string? AuditEntityId { get; set; }
}

public class CreateProjectValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.CustomerId).NotEmpty();
    }
}

public class CreateProjectHandler : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public CreateProjectHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<ProjectDto> Handle(CreateProjectCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, ct)
            ?? throw new NotFoundException("Customer", request.CustomerId);
        var codeExists = await _db.Projects.AnyAsync(p => p.Code == request.Code, ct);
        if (codeExists) throw new DomainException("PROJECT_CODE_EXISTS", $"Project code '{request.Code}' already exists.");

        var p = new Project
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description,
            CustomerId = customer.Id,
            Status = ProjectStatus.Active
        };
        _db.Projects.Add(p);

        var creator = new ProjectMember
        {
            Project = p,
            UserId = _user.UserId!.Value,
            Role = ProjectRole.PMOwner
        };
        _db.ProjectMembers.Add(creator);

        await _db.SaveChangesAsync(ct);

        return new ProjectDto
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Description = p.Description,
            Status = p.Status,
            CustomerId = p.CustomerId,
            CustomerName = customer.Name,
            MemberCount = 1,
            DocumentCount = 0,
            CreatedAt = p.CreatedAt
        };
    }
}

public record UpdateProjectCommand(Guid Id, string Name, string? Description, ProjectStatus Status) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "ProjectUpdated";
    public string? AuditEntityType => "Project";
    public string? AuditEntityId => Id.ToString();
}

public class UpdateProjectValidator : AbstractValidator<UpdateProjectCommand>
{
    public UpdateProjectValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(256);
    }
}

public class UpdateProjectHandler : IRequestHandler<UpdateProjectCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpdateProjectHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(UpdateProjectCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Project", request.Id);
        p.Name = request.Name.Trim();
        p.Description = request.Description;
        p.Status = request.Status;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record DeleteProjectCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "ProjectDeleted";
    public string? AuditEntityType => "Project";
    public string? AuditEntityId => Id.ToString();
}

public class DeleteProjectHandler : IRequestHandler<DeleteProjectCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteProjectHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(DeleteProjectCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var p = await _db.Projects.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Project", request.Id);
        _db.Projects.Remove(p);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record AddProjectMemberCommand(Guid ProjectId, Guid UserId, ProjectRole Role) : IRequest<ProjectMemberDto>, IAuditableCommand
{
    public string AuditAction => "ProjectMemberAdded";
    public string? AuditEntityType => "ProjectMember";
    public string? AuditEntityId => ProjectId.ToString();
}

public class AddProjectMemberValidator : AbstractValidator<AddProjectMemberCommand>
{
    public AddProjectMemberValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public class AddProjectMemberHandler : IRequestHandler<AddProjectMemberCommand, ProjectMemberDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public AddProjectMemberHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<ProjectMemberDto> Handle(AddProjectMemberCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted, ct)
            ?? throw new NotFoundException("User", request.UserId);

        if (user.UserType == UserType.Nuevo)
        {
            if (request.Role != ProjectRole.PMOwner && request.Role != ProjectRole.PMOMember)
                throw new DomainException("INVALID_ROLE", "Nuevo users must be PMOwner or PMOMember.");
        }
        else
        {
            if (user.CustomerId != project.CustomerId)
                throw new DomainException("CUSTOMER_MISMATCH", "Customer user does not belong to the project's customer.");
            if (request.Role != ProjectRole.CustomerViewer && request.Role != ProjectRole.CustomerContributor)
                throw new DomainException("INVALID_ROLE", "Customer users must be Viewer or Contributor.");
        }

        var existing = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == project.Id && m.UserId == user.Id, ct);
        if (existing is not null)
        {
            existing.Role = request.Role;
            await _db.SaveChangesAsync(ct);
            return new ProjectMemberDto { Id = existing.Id, UserId = user.Id, UserDisplayName = user.DisplayName, UserEmail = user.Email, UserType = user.UserType, Role = existing.Role };
        }

        var m = new ProjectMember { ProjectId = project.Id, UserId = user.Id, Role = request.Role };
        _db.ProjectMembers.Add(m);
        await _db.SaveChangesAsync(ct);

        return new ProjectMemberDto { Id = m.Id, UserId = user.Id, UserDisplayName = user.DisplayName, UserEmail = user.Email, UserType = user.UserType, Role = m.Role };
    }
}

public record RemoveProjectMemberCommand(Guid ProjectId, Guid UserId) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "ProjectMemberRemoved";
    public string? AuditEntityType => "ProjectMember";
    public string? AuditEntityId => $"{ProjectId}:{UserId}";
}

public class RemoveProjectMemberHandler : IRequestHandler<RemoveProjectMemberCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public RemoveProjectMemberHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(RemoveProjectMemberCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var m = await _db.ProjectMembers.FirstOrDefaultAsync(x => x.ProjectId == request.ProjectId && x.UserId == request.UserId, ct)
            ?? throw new NotFoundException("ProjectMember", $"{request.ProjectId}:{request.UserId}");
        _db.ProjectMembers.Remove(m);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record SearchUsersForProjectQuery(Guid ProjectId, string? Search) : IRequest<List<AvailableUserDto>>;

public class AvailableUserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public UserType UserType { get; set; }
    public Guid? CustomerId { get; set; }
}

public class SearchUsersForProjectHandler : IRequestHandler<SearchUsersForProjectQuery, List<AvailableUserDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public SearchUsersForProjectHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<AvailableUserDto>> Handle(SearchUsersForProjectQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var q = _db.Users.IgnoreQueryFilters().Where(u => !u.IsDeleted && u.IsActive);
        q = q.Where(u => u.UserType == UserType.Nuevo || u.CustomerId == project.CustomerId);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            q = q.Where(u => u.Email.ToLower().Contains(s) || u.DisplayName.ToLower().Contains(s));
        }
        return await q.OrderBy(u => u.DisplayName).Take(50)
            .Select(u => new AvailableUserDto { Id = u.Id, Email = u.Email, DisplayName = u.DisplayName, UserType = u.UserType, CustomerId = u.CustomerId })
            .ToListAsync(ct);
    }
}
