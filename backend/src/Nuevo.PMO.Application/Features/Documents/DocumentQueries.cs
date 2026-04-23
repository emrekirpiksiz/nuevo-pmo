using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
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

        // Büyük içerik kolonlarını (DraftContentJson, CustomerVersion.ContentJson,
        // ContentMarkdown) DB'den asla çekme. HasDraftChanges için sadece hash/length
        // benzeri hafif bir karşılaştırma yap (md5 kullanılamadığı için uzunluk +
        // son 256 karakter karşılaştırması pratik bir fark göstericisidir).
        var q = _db.Documents
            .AsNoTracking()
            .Where(d => d.ProjectId == request.ProjectId);

        if (_user.IsCustomer)
            q = q.Where(d => d.CustomerVersionId != null);

        var rows = await q
            .OrderBy(d => d.Title)
            .Select(d => new
            {
                d.Id,
                d.ProjectId,
                ProjectName = d.Project.Name,
                d.Title,
                d.Type,
                d.CurrentMajor,
                d.CustomerVersionId,
                CustomerMajor = (int?)(d.CustomerVersion == null ? null : d.CustomerVersion.Major),
                CustomerContentLength = d.CustomerVersion == null ? 0 : d.CustomerVersion.ContentMarkdown.Length,
                DraftLength = d.DraftContentMarkdown.Length,
                // Son 256 karakteri almak yerine karşılaştırmayı ikisi birden "aynı hash'li
                // olabilir mi?" için hash kullanıyoruz. PG md5 fonksiyonu EF ile çağrılamaz;
                // onun yerine length + ilk 256 karakter kombinasyonu bile yeterli hassas.
                DraftHead = d.DraftContentMarkdown.Length > 512 ? d.DraftContentMarkdown.Substring(0, 512) : d.DraftContentMarkdown,
                CustomerHead = d.CustomerVersion == null
                    ? null
                    : (d.CustomerVersion.ContentMarkdown.Length > 512 ? d.CustomerVersion.ContentMarkdown.Substring(0, 512) : d.CustomerVersion.ContentMarkdown),
                d.CustomerVersionMarkedAt,
                d.DraftUpdatedAt,
                d.CreatedAt,
                d.UpdatedAt
            })
            .ToListAsync(ct);

        if (rows.Count == 0) return new();

        var docIds = rows.Select(r => r.Id).ToList();

        var openCommentCounts = await _db.Comments
            .Where(c => docIds.Contains(c.DocumentId) && c.Status == CommentStatus.Open)
            .GroupBy(c => c.DocumentId)
            .Select(g => new { DocumentId = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.DocumentId, x => x.N, ct);

        var approvalInfo = await _db.DocumentApprovals
            .Where(a => docIds.Contains(a.DocumentId))
            .GroupBy(a => a.DocumentId)
            .Select(g => new { DocumentId = g.Key, N = g.Count(), Last = g.Max(x => (DateTime?)x.ApprovedAt) })
            .ToDictionaryAsync(x => x.DocumentId, x => new { x.N, x.Last }, ct);

        return rows.Select(d => new DocumentDto
        {
            Id = d.Id,
            ProjectId = d.ProjectId,
            ProjectName = d.ProjectName,
            Title = d.Title,
            Type = d.Type,
            CurrentMajor = d.CurrentMajor,
            CustomerVersionId = d.CustomerVersionId,
            CustomerMajor = d.CustomerMajor,
            CustomerVersionMarkedAt = d.CustomerVersionMarkedAt,
            HasDraftChanges = HasDraftChanges(d.DraftLength, d.DraftHead, d.CustomerContentLength, d.CustomerHead, d.CustomerVersionId),
            DraftUpdatedAt = d.DraftUpdatedAt,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            OpenCommentCount = openCommentCounts.TryGetValue(d.Id, out var oc) ? oc : 0,
            ApprovalCount = approvalInfo.TryGetValue(d.Id, out var ai) ? ai.N : 0,
            LastApprovedAt = approvalInfo.TryGetValue(d.Id, out var ai2) ? ai2.Last : null
        }).ToList();
    }

    internal static bool HasDraftChanges(int draftLen, string? draftHead, int customerLen, string? customerHead, Guid? customerVersionId)
    {
        if (customerVersionId is null)
        {
            return draftLen > 0;
        }
        if (draftLen != customerLen) return true;
        return !string.Equals(draftHead ?? "", customerHead ?? "", StringComparison.Ordinal);
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

        // Content kolonlarını çekmeden hafif projection.
        var d = await _db.Documents
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new
            {
                x.Id,
                x.ProjectId,
                ProjectName = x.Project.Name,
                x.Title,
                x.Type,
                x.CurrentMajor,
                x.CustomerVersionId,
                CustomerMajor = (int?)(x.CustomerVersion == null ? null : x.CustomerVersion.Major),
                CustomerContentLength = x.CustomerVersion == null ? 0 : x.CustomerVersion.ContentMarkdown.Length,
                DraftLength = x.DraftContentMarkdown.Length,
                DraftHead = x.DraftContentMarkdown.Length > 512 ? x.DraftContentMarkdown.Substring(0, 512) : x.DraftContentMarkdown,
                CustomerHead = x.CustomerVersion == null
                    ? null
                    : (x.CustomerVersion.ContentMarkdown.Length > 512 ? x.CustomerVersion.ContentMarkdown.Substring(0, 512) : x.CustomerVersion.ContentMarkdown),
                x.CustomerVersionMarkedAt,
                x.DraftUpdatedAt,
                x.CreatedAt,
                x.UpdatedAt
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Document", request.Id);

        if (_user.IsCustomer && d.CustomerVersionId is null)
            throw new NotFoundException("Document", request.Id);

        var openCount = await _db.Comments.CountAsync(c => c.DocumentId == d.Id && c.Status == CommentStatus.Open, ct);
        var approvalCount = await _db.DocumentApprovals.CountAsync(a => a.DocumentId == d.Id, ct);
        var lastApproved = await _db.DocumentApprovals.Where(a => a.DocumentId == d.Id)
            .MaxAsync(a => (DateTime?)a.ApprovedAt, ct);

        return new DocumentDto
        {
            Id = d.Id,
            ProjectId = d.ProjectId,
            ProjectName = d.ProjectName,
            Title = d.Title,
            Type = d.Type,
            CurrentMajor = d.CurrentMajor,
            CustomerVersionId = d.CustomerVersionId,
            CustomerMajor = d.CustomerMajor,
            CustomerVersionMarkedAt = d.CustomerVersionMarkedAt,
            HasDraftChanges = GetDocumentsByProjectHandler.HasDraftChanges(d.DraftLength, d.DraftHead, d.CustomerContentLength, d.CustomerHead, d.CustomerVersionId),
            DraftUpdatedAt = d.DraftUpdatedAt,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            OpenCommentCount = openCount,
            ApprovalCount = approvalCount,
            LastApprovedAt = lastApproved
        };
    }
}

/// <summary>
/// Admin → taslak içeriği; Customer → son yayınlanmış müşteri sürümü içeriği.
/// </summary>
public record GetDocumentContentQuery(Guid DocumentId) : IRequest<DocumentContentDto>;

public class GetDocumentContentHandler : IRequestHandler<GetDocumentContentQuery, DocumentContentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentContentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentContentDto> Handle(GetDocumentContentQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        if (_user.IsCustomer)
        {
            // Customer → sadece yayınlanmış content çek. Draft alanlarını çekme.
            var customer = await _db.Documents
                .AsNoTracking()
                .Where(x => x.Id == request.DocumentId)
                .Select(x => new
                {
                    x.Id,
                    x.CustomerVersionId,
                    CustomerMajor = (int?)(x.CustomerVersion == null ? null : x.CustomerVersion.Major),
                    CustomerJson = x.CustomerVersion == null ? null : x.CustomerVersion.ContentJson,
                    CustomerMarkdown = x.CustomerVersion == null ? null : x.CustomerVersion.ContentMarkdown,
                    CustomerAt = (DateTime?)(x.CustomerVersion == null ? null : x.CustomerVersion.CreatedAt)
                })
                .FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("Document", request.DocumentId);

            if (customer.CustomerVersionId is null) throw new NotFoundException("Document", request.DocumentId);

            return new DocumentContentDto
            {
                DocumentId = customer.Id,
                IsDraft = false,
                VersionId = customer.CustomerVersionId,
                VersionMajor = customer.CustomerMajor,
                ContentJson = customer.CustomerJson ?? "{}",
                ContentMarkdown = customer.CustomerMarkdown ?? string.Empty,
                UpdatedAt = customer.CustomerAt
            };
        }

        // Admin → sadece Draft alanlarını çek. CustomerVersion'dan yalnız Major lazım.
        var admin = await _db.Documents
            .AsNoTracking()
            .Where(x => x.Id == request.DocumentId)
            .Select(x => new
            {
                x.Id,
                x.CustomerVersionId,
                CustomerMajor = (int?)(x.CustomerVersion == null ? null : x.CustomerVersion.Major),
                x.DraftContentJson,
                x.DraftContentMarkdown,
                x.DraftUpdatedAt
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        return new DocumentContentDto
        {
            DocumentId = admin.Id,
            IsDraft = true,
            VersionId = admin.CustomerVersionId,
            VersionMajor = admin.CustomerMajor,
            ContentJson = admin.DraftContentJson,
            ContentMarkdown = admin.DraftContentMarkdown,
            UpdatedAt = admin.DraftUpdatedAt
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
            .AsNoTracking()
            .Where(a => a.DocumentId == request.DocumentId)
            .OrderByDescending(a => a.ApprovedAt)
            .Select(a => new DocumentApprovalDto
            {
                Id = a.Id,
                DocumentVersionId = a.DocumentVersionId,
                VersionMajor = a.DocumentVersion.Major,
                ApprovedBy = a.ApprovedBy,
                ApprovedByName = a.ApprovedByUser.DisplayName,
                ApprovedAt = a.ApprovedAt,
                Note = a.Note
            })
            .ToListAsync(ct);
    }
}

/// <summary>Bir dokümanın tüm yayınlarındaki blok değişikliklerini döner.</summary>
public record GetBlockChangesQuery(Guid DocumentId, Guid? VersionId) : IRequest<List<DocumentBlockChangeDto>>;

public class GetBlockChangesHandler : IRequestHandler<GetBlockChangesQuery, List<DocumentBlockChangeDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetBlockChangesHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<DocumentBlockChangeDto>> Handle(GetBlockChangesQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        // Baseline (ilk yayın) kayıtlarını gösterme — FromVersionId null olanlar.
        // Mevcut eski baseline audit'leri de bu filtre ile gizlenir.
        var query = _db.DocumentBlockChanges.AsNoTracking()
            .Where(b => b.DocumentId == request.DocumentId && b.FromVersionId != null);

        if (_user.IsCustomer)
        {
            var cvId = await _db.Documents.AsNoTracking()
                .Where(d => d.Id == request.DocumentId)
                .Select(d => d.CustomerVersionId)
                .FirstOrDefaultAsync(ct);
            if (cvId is null) return new();
            query = query.Where(b => b.ToVersionId == cvId);
        }
        else if (request.VersionId is Guid vid)
        {
            query = query.Where(b => b.ToVersionId == vid);
        }

        var items = await query
            .Select(b => new
            {
                b.Id,
                b.DocumentId,
                b.FromVersionId,
                FromVersionMajor = (int?)(b.FromVersion == null ? null : b.FromVersion.Major),
                b.ToVersionId,
                ToVersionMajor = b.ToVersion.Major,
                PublishedBy = b.ToVersion.CreatedBy,
                PublishedAt = b.ToVersion.CreatedAt,
                b.BlockId,
                b.Kind,
                b.OldText,
                b.NewText,
                b.RelatedCommentId,
                RelatedCommentBody = b.RelatedComment == null ? null : b.RelatedComment.Body,
                b.CreatedAt,
                b.CreatedBy
            })
            .OrderByDescending(b => b.CreatedAt)
            .ThenBy(b => b.BlockId)
            .ToListAsync(ct);

        if (items.Count == 0) return new();

        var userIds = items.Select(x => x.CreatedBy ?? Guid.Empty)
            .Concat(items.Select(x => x.PublishedBy ?? Guid.Empty))
            .Where(i => i != Guid.Empty)
            .Distinct()
            .ToArray();
        var userMap = userIds.Length > 0
            ? await _db.Users.IgnoreQueryFilters().Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct)
            : new Dictionary<Guid, string>();

        return items.Select(b => new DocumentBlockChangeDto
        {
            Id = b.Id,
            DocumentId = b.DocumentId,
            FromVersionId = b.FromVersionId,
            FromVersionMajor = b.FromVersionMajor,
            ToVersionId = b.ToVersionId,
            ToVersionMajor = b.ToVersionMajor,
            PublishedBy = b.PublishedBy,
            PublishedByName = b.PublishedBy is Guid pb && userMap.TryGetValue(pb, out var pn) ? pn : null,
            PublishedAt = b.PublishedAt,
            BlockId = b.BlockId,
            Kind = b.Kind.ToString(),
            OldText = b.OldText,
            NewText = b.NewText,
            RelatedCommentId = b.RelatedCommentId,
            RelatedCommentBody = b.RelatedCommentBody,
            CreatedAt = b.CreatedAt,
            CreatedBy = b.CreatedBy,
            CreatedByName = b.CreatedBy is Guid cb && userMap.TryGetValue(cb, out var n) ? n : null
        }).ToList();
    }
}
