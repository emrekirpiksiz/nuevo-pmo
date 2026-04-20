using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Documents;

public record GetDocumentsByProjectQuery(Guid ProjectId) : IRequest<List<DocumentDto>>;

public class GetDocumentsByProjectHandler : IRequestHandler<GetDocumentsByProjectQuery, List<DocumentDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentsByProjectHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<DocumentDto>> Handle(GetDocumentsByProjectQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var q = _db.Documents
            .Include(d => d.Project)
            .Where(d => d.ProjectId == request.ProjectId);

        if (_user.IsCustomer)
            q = q.Where(d => d.PublishedVersionId != null);

        return await q.OrderBy(d => d.Title).Select(d => new DocumentDto
        {
            Id = d.Id,
            ProjectId = d.ProjectId,
            ProjectName = d.Project.Name,
            Title = d.Title,
            Type = d.Type,
            CurrentDraftVersionId = d.CurrentDraftVersionId,
            CurrentDraftVersionNumber = d.CurrentDraftVersion != null ? d.CurrentDraftVersion.Major + "." + d.CurrentDraftVersion.Minor : null,
            PublishedVersionId = d.PublishedVersionId,
            PublishedVersionNumber = d.PublishedVersion != null ? d.PublishedVersion.Major + "." + d.PublishedVersion.Minor : null,
            PublishedAt = d.PublishedVersion != null ? d.PublishedVersion.PublishedAt : null,
            ApprovedVersionId = d.ApprovedVersionId,
            ApprovedVersionNumber = d.ApprovedVersion != null ? d.ApprovedVersion.Major + "." + d.ApprovedVersion.Minor : null,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            OpenCommentCount = d.Comments.Count(c => c.Status == CommentStatus.Open)
        }).ToListAsync(ct);
    }
}

public record GetDocumentByIdQuery(Guid Id) : IRequest<DocumentDto>;

public class GetDocumentByIdHandler : IRequestHandler<GetDocumentByIdQuery, DocumentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentByIdHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentDto> Handle(GetDocumentByIdQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.Id, ct);

        var d = await _db.Documents
            .Include(x => x.Project)
            .Include(x => x.CurrentDraftVersion)
            .Include(x => x.PublishedVersion)
            .Include(x => x.ApprovedVersion)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Document", request.Id);

        if (_user.IsCustomer && d.PublishedVersionId is null)
            throw new NotFoundException("Document", request.Id);

        return new DocumentDto
        {
            Id = d.Id,
            ProjectId = d.ProjectId,
            ProjectName = d.Project.Name,
            Title = d.Title,
            Type = d.Type,
            CurrentDraftVersionId = d.CurrentDraftVersionId,
            CurrentDraftVersionNumber = d.CurrentDraftVersion != null ? $"{d.CurrentDraftVersion.Major}.{d.CurrentDraftVersion.Minor}" : null,
            PublishedVersionId = d.PublishedVersionId,
            PublishedVersionNumber = d.PublishedVersion != null ? $"{d.PublishedVersion.Major}.{d.PublishedVersion.Minor}" : null,
            PublishedAt = d.PublishedVersion?.PublishedAt,
            ApprovedVersionId = d.ApprovedVersionId,
            ApprovedVersionNumber = d.ApprovedVersion != null ? $"{d.ApprovedVersion.Major}.{d.ApprovedVersion.Minor}" : null,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            OpenCommentCount = await _db.Comments.CountAsync(c => c.DocumentId == d.Id && c.Status == CommentStatus.Open, ct)
        };
    }
}

public record GetDocumentVersionsQuery(Guid DocumentId) : IRequest<List<DocumentVersionDto>>;

public class GetDocumentVersionsHandler : IRequestHandler<GetDocumentVersionsQuery, List<DocumentVersionDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentVersionsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<DocumentVersionDto>> Handle(GetDocumentVersionsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        var q = _db.DocumentVersions.Where(v => v.DocumentId == request.DocumentId);
        if (_user.IsCustomer) q = q.Where(v => v.IsPublished);

        var list = await q.OrderByDescending(v => v.Major).ThenByDescending(v => v.Minor)
            .Select(v => new DocumentVersionDto
            {
                Id = v.Id,
                DocumentId = v.DocumentId,
                Major = v.Major,
                Minor = v.Minor,
                VersionNumber = v.Major + "." + v.Minor,
                IsPublished = v.IsPublished,
                CreatedAt = v.CreatedAt,
                CreatedBy = v.CreatedBy,
                PublishedAt = v.PublishedAt,
                IsApproved = doc.ApprovedVersionId == v.Id,
                IsDraft = doc.CurrentDraftVersionId == v.Id
            })
            .ToListAsync(ct);
        return list;
    }
}

public record GetDocumentVersionContentQuery(Guid DocumentId, Guid VersionId) : IRequest<DocumentVersionContentDto>;

public class GetDocumentVersionContentHandler : IRequestHandler<GetDocumentVersionContentQuery, DocumentVersionContentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentVersionContentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentVersionContentDto> Handle(GetDocumentVersionContentQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        var v = await _db.DocumentVersions.FirstOrDefaultAsync(x => x.Id == request.VersionId && x.DocumentId == request.DocumentId, ct)
            ?? throw new NotFoundException("DocumentVersion", request.VersionId);

        if (_user.IsCustomer && !v.IsPublished)
            throw new NotFoundException("DocumentVersion", request.VersionId);

        return new DocumentVersionContentDto
        {
            Id = v.Id,
            DocumentId = v.DocumentId,
            Major = v.Major,
            Minor = v.Minor,
            VersionNumber = $"{v.Major}.{v.Minor}",
            IsPublished = v.IsPublished,
            CreatedAt = v.CreatedAt,
            CreatedBy = v.CreatedBy,
            PublishedAt = v.PublishedAt,
            IsApproved = doc.ApprovedVersionId == v.Id,
            IsDraft = doc.CurrentDraftVersionId == v.Id,
            ContentJson = v.ContentJson,
            ContentMarkdown = v.ContentMarkdown
        };
    }
}

public record GetApprovalsQuery(Guid DocumentId) : IRequest<List<DocumentApprovalDto>>;

public class GetApprovalsHandler : IRequestHandler<GetApprovalsQuery, List<DocumentApprovalDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetApprovalsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<DocumentApprovalDto>> Handle(GetApprovalsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        return await _db.DocumentApprovals
            .Include(a => a.DocumentVersion)
            .Include(a => a.ApprovedByUser)
            .Where(a => a.DocumentVersion.DocumentId == request.DocumentId)
            .OrderByDescending(a => a.ApprovedAt)
            .Select(a => new DocumentApprovalDto
            {
                Id = a.Id,
                DocumentVersionId = a.DocumentVersionId,
                VersionNumber = a.DocumentVersion.Major + "." + a.DocumentVersion.Minor,
                ApprovedBy = a.ApprovedBy,
                ApprovedByName = a.ApprovedByUser.DisplayName,
                ApprovedAt = a.ApprovedAt,
                Note = a.Note
            })
            .ToListAsync(ct);
    }
}
