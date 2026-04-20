using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Application.Features.Projects;

public record GetProjectsQuery(Guid? CustomerId, string? Search) : IRequest<List<ProjectDto>>;

public class GetProjectsHandler : IRequestHandler<GetProjectsQuery, List<ProjectDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetProjectsHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<ProjectDto>> Handle(GetProjectsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var q = _db.Projects.AsQueryable();

        if (_user.IsCustomer)
        {
            q = q.Where(p => p.Members.Any(m => m.UserId == _user.UserId));
        }

        if (request.CustomerId is { } cid)
            q = q.Where(p => p.CustomerId == cid);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            q = q.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s));
        }

        return await q.OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Description = p.Description,
                Status = p.Status,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer.Name,
                MemberCount = p.Members.Count,
                DocumentCount = p.Documents.Count(d => !d.IsDeleted),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(ct);
    }
}

public record GetProjectByIdQuery(Guid Id) : IRequest<ProjectDto>;

public class GetProjectByIdHandler : IRequestHandler<GetProjectByIdQuery, ProjectDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetProjectByIdHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<ProjectDto> Handle(GetProjectByIdQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.Id, ct);

        var p = await _db.Projects
            .Include(x => x.Customer)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Project", request.Id);

        return new ProjectDto
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Description = p.Description,
            Status = p.Status,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer.Name,
            MemberCount = await _db.ProjectMembers.CountAsync(m => m.ProjectId == p.Id, ct),
            DocumentCount = await _db.Documents.CountAsync(d => d.ProjectId == p.Id, ct),
            CreatedAt = p.CreatedAt
        };
    }
}

public record GetProjectMembersQuery(Guid ProjectId) : IRequest<List<ProjectMemberDto>>;

public class GetProjectMembersHandler : IRequestHandler<GetProjectMembersQuery, List<ProjectMemberDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetProjectMembersHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<ProjectMemberDto>> Handle(GetProjectMembersQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        return await _db.ProjectMembers
            .Where(m => m.ProjectId == request.ProjectId)
            .Select(m => new ProjectMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                UserDisplayName = m.User.DisplayName,
                UserEmail = m.User.Email,
                UserType = m.User.UserType,
                Role = m.Role
            })
            .ToListAsync(ct);
    }
}
