using System.Text.Json;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Documents;

public record CreateDocumentCommand(Guid ProjectId, string Title, DocumentType Type) : IRequest<DocumentDto>, IAuditableCommand
{
    public string AuditAction => "DocumentCreated";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId { get; set; }
}

public class CreateDocumentValidator : AbstractValidator<CreateDocumentCommand>
{
    public CreateDocumentValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
    }
}

public class CreateDocumentHandler : IRequestHandler<CreateDocumentCommand, DocumentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public CreateDocumentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentDto> Handle(CreateDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var project = await _db.Projects.Include(p => p.Customer).FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var doc = new Document
        {
            ProjectId = project.Id,
            Title = request.Title.Trim(),
            Type = request.Type,
            PublishedCount = 0
        };
        _db.Documents.Add(doc);
        await _db.SaveChangesAsync(ct);

        var emptyContent = JsonSerializer.Serialize(new { type = "doc", content = Array.Empty<object>() });
        var firstVersion = new DocumentVersion
        {
            DocumentId = doc.Id,
            Major = 1,
            Minor = 0,
            ContentJson = emptyContent,
            ContentMarkdown = "",
            IsPublished = false
        };
        _db.DocumentVersions.Add(firstVersion);
        await _db.SaveChangesAsync(ct);

        doc.CurrentDraftVersionId = firstVersion.Id;
        await _db.SaveChangesAsync(ct);

        return new DocumentDto
        {
            Id = doc.Id,
            ProjectId = doc.ProjectId,
            ProjectName = project.Name,
            Title = doc.Title,
            Type = doc.Type,
            CurrentDraftVersionId = firstVersion.Id,
            CurrentDraftVersionNumber = "1.0",
            CreatedAt = doc.CreatedAt
        };
    }
}

public record UpdateDocumentMetaCommand(Guid Id, string Title, DocumentType Type) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "DocumentUpdated";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId => Id.ToString();
}

public class UpdateDocumentMetaValidator : AbstractValidator<UpdateDocumentMetaCommand>
{
    public UpdateDocumentMetaValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
    }
}

public class UpdateDocumentMetaHandler : IRequestHandler<UpdateDocumentMetaCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpdateDocumentMetaHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(UpdateDocumentMetaCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.Id, ct);
        var d = await _db.Documents.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Document", request.Id);
        d.Title = request.Title.Trim();
        d.Type = request.Type;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record DeleteDocumentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "DocumentDeleted";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId => Id.ToString();
}

public class DeleteDocumentHandler : IRequestHandler<DeleteDocumentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteDocumentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(DeleteDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.Id, ct);
        var d = await _db.Documents.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Document", request.Id);
        _db.Documents.Remove(d);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record SaveDocumentContentCommand(Guid DocumentId, string ContentJson, string ContentMarkdown) : IRequest<DocumentVersionDto>, IAuditableCommand
{
    public string AuditAction => "DocumentDraftSaved";
    public string? AuditEntityType => "DocumentVersion";
    public string? AuditEntityId { get; set; }
}

public class SaveDocumentContentValidator : AbstractValidator<SaveDocumentContentCommand>
{
    public SaveDocumentContentValidator()
    {
        RuleFor(x => x.DocumentId).NotEmpty();
        RuleFor(x => x.ContentJson).NotEmpty();
    }
}

public class SaveDocumentContentHandler : IRequestHandler<SaveDocumentContentCommand, DocumentVersionDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public SaveDocumentContentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentVersionDto> Handle(SaveDocumentContentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        var latest = await _db.DocumentVersions
            .Where(v => v.DocumentId == doc.Id)
            .OrderByDescending(v => v.Major).ThenByDescending(v => v.Minor)
            .FirstOrDefaultAsync(ct);

        int major, minor;
        if (latest is null)
        {
            major = 1; minor = 0;
        }
        else if (!latest.IsPublished)
        {
            major = latest.Major;
            minor = latest.Minor + 1;
        }
        else
        {
            major = latest.Major + 1;
            minor = 0;
        }

        var v = new DocumentVersion
        {
            DocumentId = doc.Id,
            Major = major,
            Minor = minor,
            ContentJson = request.ContentJson,
            ContentMarkdown = request.ContentMarkdown ?? string.Empty,
            IsPublished = false
        };
        _db.DocumentVersions.Add(v);
        doc.CurrentDraftVersionId = v.Id;
        doc.CurrentDraftVersion = v;
        await _db.SaveChangesAsync(ct);

        await MigrateCommentsAsync(doc.Id, latest?.Id, v, ct);

        return new DocumentVersionDto
        {
            Id = v.Id,
            DocumentId = v.DocumentId,
            Major = v.Major,
            Minor = v.Minor,
            VersionNumber = $"{v.Major}.{v.Minor}",
            IsPublished = false,
            IsDraft = true,
            CreatedAt = v.CreatedAt,
            CreatedBy = v.CreatedBy
        };
    }

    private async Task MigrateCommentsAsync(Guid documentId, Guid? previousVersionId, DocumentVersion newVersion, CancellationToken ct)
    {
        if (previousVersionId is null) return;

        var openComments = await _db.Comments
            .Where(c => c.DocumentId == documentId && (c.Status == CommentStatus.Open || c.Status == CommentStatus.Orphaned))
            .ToListAsync(ct);

        if (openComments.Count == 0) return;

        var blockIds = ExtractBlockIds(newVersion.ContentJson);

        foreach (var cmt in openComments)
        {
            if (blockIds.Contains(cmt.BlockId))
            {
                cmt.VersionId = newVersion.Id;
                if (cmt.Status == CommentStatus.Orphaned) cmt.Status = CommentStatus.Open;
            }
            else
            {
                cmt.Status = CommentStatus.Orphaned;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private static HashSet<string> ExtractBlockIds(string contentJson)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            Walk(doc.RootElement, ids);
        }
        catch
        {
            // best effort
        }
        return ids;
    }

    private static void Walk(JsonElement el, HashSet<string> ids)
    {
        if (el.ValueKind == JsonValueKind.Object)
        {
            if (el.TryGetProperty("attrs", out var attrs) && attrs.ValueKind == JsonValueKind.Object)
            {
                if (attrs.TryGetProperty("blockId", out var bid) && bid.ValueKind == JsonValueKind.String)
                {
                    var v = bid.GetString();
                    if (!string.IsNullOrWhiteSpace(v)) ids.Add(v);
                }
            }
            if (el.TryGetProperty("content", out var content)) Walk(content, ids);
            foreach (var prop in el.EnumerateObject())
            {
                if (prop.NameEquals("content")) continue;
                if (prop.Value.ValueKind == JsonValueKind.Array || prop.Value.ValueKind == JsonValueKind.Object)
                    Walk(prop.Value, ids);
            }
        }
        else if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray()) Walk(item, ids);
        }
    }
}

public record PublishDocumentCommand(Guid DocumentId, Guid VersionId) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "DocumentPublished";
    public string? AuditEntityType => "DocumentVersion";
    public string? AuditEntityId => VersionId.ToString();
}

public class PublishDocumentHandler : IRequestHandler<PublishDocumentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public PublishDocumentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(PublishDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);
        var v = await _db.DocumentVersions.FirstOrDefaultAsync(x => x.Id == request.VersionId && x.DocumentId == doc.Id, ct)
            ?? throw new NotFoundException("DocumentVersion", request.VersionId);

        if (!v.IsPublished)
        {
            v.IsPublished = true;
            v.PublishedAt = DateTime.UtcNow;
            v.PublishedBy = _user.UserId;
            doc.PublishedVersionId = v.Id;
            doc.PublishedCount += 1;
            if (doc.CurrentDraftVersionId == v.Id) doc.CurrentDraftVersionId = null;
            await _db.SaveChangesAsync(ct);
        }
        return Unit.Value;
    }
}

public record ApproveDocumentVersionCommand(Guid DocumentId, Guid VersionId, string? Note) : IRequest<DocumentApprovalDto>, IAuditableCommand
{
    public string AuditAction => "DocumentApproved";
    public string? AuditEntityType => "DocumentVersion";
    public string? AuditEntityId => VersionId.ToString();
}

public class ApproveDocumentVersionValidator : AbstractValidator<ApproveDocumentVersionCommand>
{
    public ApproveDocumentVersionValidator()
    {
        RuleFor(x => x.Note).MaximumLength(2000);
    }
}

public class ApproveDocumentVersionHandler : IRequestHandler<ApproveDocumentVersionCommand, DocumentApprovalDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ApproveDocumentVersionHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentApprovalDto> Handle(ApproveDocumentVersionCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        if (!_user.IsCustomer) throw new ForbiddenException("Only customer users can approve versions.");
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);
        var v = await _db.DocumentVersions.FirstOrDefaultAsync(x => x.Id == request.VersionId && x.DocumentId == doc.Id, ct)
            ?? throw new NotFoundException("DocumentVersion", request.VersionId);

        if (!v.IsPublished)
            throw new DomainException("NOT_PUBLISHED", "Only published versions can be approved.");

        var me = _user.UserId!.Value;
        var existing = await _db.DocumentApprovals
            .FirstOrDefaultAsync(a => a.DocumentVersionId == v.Id && a.ApprovedBy == me, ct);
        if (existing is not null)
            throw new DomainException("ALREADY_APPROVED", "You have already approved this version.");

        var approval = new DocumentApproval
        {
            DocumentVersionId = v.Id,
            ApprovedBy = me,
            Note = request.Note,
            ApprovedAt = DateTime.UtcNow
        };
        _db.DocumentApprovals.Add(approval);
        doc.ApprovedVersionId = v.Id;
        await _db.SaveChangesAsync(ct);

        var approver = await _db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == me, ct);
        return new DocumentApprovalDto
        {
            Id = approval.Id,
            DocumentVersionId = approval.DocumentVersionId,
            VersionNumber = $"{v.Major}.{v.Minor}",
            ApprovedBy = approver.Id,
            ApprovedByName = approver.DisplayName,
            ApprovedAt = approval.ApprovedAt,
            Note = approval.Note
        };
    }
}

public record ExportDocumentDocxQuery(Guid DocumentId, Guid? VersionId) : IRequest<DocxResultDto>;

public class DocxResultDto
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Content { get; set; } = Array.Empty<byte>();
}

public class ExportDocumentDocxHandler : IRequestHandler<ExportDocumentDocxQuery, DocxResultDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IDocxExporter _docx;

    public ExportDocumentDocxHandler(IAppDbContext db, ICurrentUser user, IDocxExporter docx)
    {
        _db = db; _user = user; _docx = docx;
    }

    public async Task<DocxResultDto> Handle(ExportDocumentDocxQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        Guid targetVersionId;
        if (request.VersionId is Guid vid)
        {
            targetVersionId = vid;
        }
        else if (_user.IsCustomer)
        {
            targetVersionId = doc.PublishedVersionId ?? throw new DomainException("NO_PUBLISHED_VERSION", "Document has no published version.");
        }
        else
        {
            targetVersionId = doc.CurrentDraftVersionId ?? doc.PublishedVersionId
                ?? throw new DomainException("NO_VERSION", "Document has no versions.");
        }

        var v = await _db.DocumentVersions.FirstOrDefaultAsync(x => x.Id == targetVersionId && x.DocumentId == doc.Id, ct)
            ?? throw new NotFoundException("DocumentVersion", targetVersionId);

        if (_user.IsCustomer && !v.IsPublished)
            throw new ForbiddenException("Customers can only export published versions.");

        var bytes = _docx.ExportFromMarkdown(doc.Title, v.ContentMarkdown);
        return new DocxResultDto
        {
            FileName = $"{Sanitize(doc.Title)}-v{v.Major}.{v.Minor}.docx",
            Content = bytes
        };
    }

    private static string Sanitize(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return string.IsNullOrWhiteSpace(safe) ? "document" : safe;
    }
}
