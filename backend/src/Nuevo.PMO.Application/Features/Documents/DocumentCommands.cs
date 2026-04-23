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

// ---------- Create / Update meta / Delete ----------
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
    private readonly IMediator _mediator;

    public CreateDocumentHandler(IAppDbContext db, ICurrentUser user, IMediator mediator)
    {
        _db = db; _user = user; _mediator = mediator;
    }

    public async Task<DocumentDto> Handle(CreateDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var project = await _db.Projects.Include(p => p.Customer).FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var emptyDoc = JsonSerializer.Serialize(new { type = "doc", content = Array.Empty<object>() });
        var doc = new Document
        {
            ProjectId = project.Id,
            Title = request.Title.Trim(),
            Type = request.Type,
            CurrentMajor = 0,
            DraftContentJson = emptyDoc,
            DraftContentMarkdown = string.Empty,
            DraftUpdatedAt = DateTime.UtcNow,
            DraftUpdatedBy = _user.UserId
        };
        _db.Documents.Add(doc);
        await _db.SaveChangesAsync(ct);

        request.AuditEntityId = doc.Id.ToString();
        return await _mediator.Send(new GetDocumentByIdQuery(doc.Id), ct);
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
    public UpdateDocumentMetaValidator() => RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
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

// ---------- Save Draft ----------
public record SaveDocumentCommand(Guid DocumentId, string ContentJson, string ContentMarkdown)
    : IRequest<DocumentDto>, IAuditableCommand
{
    public string AuditAction => "DocumentDraftSaved";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId => DocumentId.ToString();
}

public class SaveDocumentValidator : AbstractValidator<SaveDocumentCommand>
{
    public SaveDocumentValidator()
    {
        RuleFor(x => x.DocumentId).NotEmpty();
        RuleFor(x => x.ContentJson).NotEmpty();
    }
}

public class SaveDocumentHandler : IRequestHandler<SaveDocumentCommand, DocumentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IMediator _mediator;

    public SaveDocumentHandler(IAppDbContext db, ICurrentUser user, IMediator mediator)
    {
        _db = db; _user = user; _mediator = mediator;
    }

    public async Task<DocumentDto> Handle(SaveDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        doc.DraftContentJson = request.ContentJson;
        doc.DraftContentMarkdown = request.ContentMarkdown ?? string.Empty;
        doc.DraftUpdatedAt = DateTime.UtcNow;
        doc.DraftUpdatedBy = _user.UserId;
        await _db.SaveChangesAsync(ct);

        return await _mediator.Send(new GetDocumentByIdQuery(doc.Id), ct);
    }
}

// ---------- Publish Customer Version ----------
public record PublishCustomerVersionCommand(Guid DocumentId, string? Label)
    : IRequest<DocumentDto>, IAuditableCommand
{
    public string AuditAction => "CustomerVersionPublished";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId => DocumentId.ToString();
}

public class PublishCustomerVersionValidator : AbstractValidator<PublishCustomerVersionCommand>
{
    public PublishCustomerVersionValidator()
    {
        RuleFor(x => x.DocumentId).NotEmpty();
        RuleFor(x => x.Label).MaximumLength(256);
    }
}

public class PublishCustomerVersionHandler : IRequestHandler<PublishCustomerVersionCommand, DocumentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IMediator _mediator;
    private readonly INotificationSender _notifications;

    public PublishCustomerVersionHandler(
        IAppDbContext db,
        ICurrentUser user,
        IMediator mediator,
        INotificationSender notifications)
    {
        _db = db; _user = user; _mediator = mediator; _notifications = notifications;
    }

    public async Task<DocumentDto> Handle(PublishCustomerVersionCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents
            .Include(d => d.CustomerVersion)
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        // Taslak içeriği yeni müşteri sürümü olarak kaydet.
        var newMajor = doc.CurrentMajor + 1;
        var newVersion = new DocumentVersion
        {
            DocumentId = doc.Id,
            Major = newMajor,
            Minor = 0,
            ContentJson = doc.DraftContentJson,
            ContentMarkdown = doc.DraftContentMarkdown,
            Label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label.Trim()
        };
        _db.DocumentVersions.Add(newVersion);
        await _db.SaveChangesAsync(ct);

        var previousVersionId = doc.CustomerVersionId;
        var previousContentJson = doc.CustomerVersion?.ContentJson;
        var now = DateTime.UtcNow;

        // Önceki sürümün blokları → yeni sürümün blokları arasında diff al.
        var oldBlocks = previousContentJson is null
            ? new Dictionary<string, string>()
            : VersioningHelpers.ExtractBlockTexts(previousContentJson);
        var newBlocks = VersioningHelpers.ExtractBlockTexts(newVersion.ContentJson);

        // ==========================================================
        // 1) Yorum migration (yalın akış — yayın yorumu KAPATMAZ):
        //    - ForVersionId yeni müşteri sürümüne taşınır (yorumun hâlâ güncel
        //      sürümde görünmesi için).
        //    - Blok aynı metinle yeni sürümde mevcutsa, BlockId DOM'daki yeni
        //      id'sine güncellenir (TipTap attr kayıpsa anchor-text eşleşmesi).
        //    - Blok tamamen yok olmuşsa yorum Orphaned olur.
        //    Manuel Resolve/Reopen kullanıcı sorumluluğundadır; publish bu
        //    durumlara hiç dokunmaz.
        // ==========================================================
        var activeComments = new List<Comment>();
        if (previousVersionId is Guid prevId)
        {
            activeComments = await _db.Comments
                .Where(c => c.DocumentId == doc.Id
                    && c.Status != CommentStatus.Orphaned
                    && c.ForVersionId == prevId)
                .ToListAsync(ct);
        }

        var newNormalizedToId = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (id, text) in newBlocks)
        {
            var key = NormalizeText(text);
            if (!newNormalizedToId.ContainsKey(key)) newNormalizedToId[key] = id;
        }

        foreach (var c in activeComments)
        {
            var oldText = oldBlocks.TryGetValue(c.BlockId, out var ot)
                ? ot
                : c.AnchorText ?? string.Empty;
            var oldNorm = NormalizeText(oldText);

            // Aynı blockId yeni sürümde duruyor
            if (newBlocks.ContainsKey(c.BlockId))
            {
                c.ForVersionId = newVersion.Id;
                continue;
            }

            // Aynı metin, farklı blockId (TipTap attr yenilenmiş olabilir)
            if (newNormalizedToId.TryGetValue(oldNorm, out var sameTextId))
            {
                c.ForVersionId = newVersion.Id;
                c.BlockId = sameTextId;
                continue;
            }

            // Yakın eşleşen blok var mı? (blok kısmen düzenlenmiş olabilir)
            var bestKey = (string?)null;
            var bestScore = 0d;
            foreach (var (id, text) in newBlocks)
            {
                var s = SimilarityScore(oldText, text);
                if (s > bestScore) { bestScore = s; bestKey = id; }
            }
            if (bestKey != null && bestScore > 0.4)
            {
                c.ForVersionId = newVersion.Id;
                c.BlockId = bestKey;
                continue;
            }

            // Hiçbir şey bulunamadı → blok silinmiş → Orphaned
            c.Status = CommentStatus.Orphaned;
        }

        // ==========================================================
        // 2) BlockChange audit kayıtları
        //    Comment migration'dan bağımsız şekilde, yayına giren her
        //    Added/Modified/Removed blok için kayıt üretilir.
        //
        //    *** İlk yayında (önceki müşteri sürümü yok) hiçbir kayıt
        //    üretilmez — doküman baştan yeni olduğu için "her blok
        //    eklendi" anlamsız bir audit'dir. Baseline = yayın olayı. ***
        // ==========================================================
        if (previousVersionId is null)
        {
            // Sadece pointer güncellemeleri yap, BlockChange üretimini atla.
            doc.CurrentMajor = newMajor;
            doc.CustomerVersionId = newVersion.Id;
            doc.CustomerVersionMarkedAt = now;
            doc.CustomerVersionMarkedBy = _user.UserId;
            await _db.SaveChangesAsync(ct);
            await NotifyCustomersAsync(doc, newMajor, ct);
            return await _mediator.Send(new GetDocumentByIdQuery(doc.Id), ct);
        }


        var newIdsUsed = new HashSet<string>(StringComparer.Ordinal);
        var remainingOld = new Dictionary<string, string>(oldBlocks, StringComparer.Ordinal);

        // 2.a) Aynı blockId'ye sahip bloklar
        foreach (var (oldId, oldText) in oldBlocks)
        {
            if (!newBlocks.TryGetValue(oldId, out var newText)) continue;
            if (NormalizeText(oldText) != NormalizeText(newText))
            {
                _db.DocumentBlockChanges.Add(new DocumentBlockChange
                {
                    DocumentId = doc.Id,
                    FromVersionId = previousVersionId,
                    ToVersionId = newVersion.Id,
                    BlockId = oldId,
                    OldText = oldText,
                    NewText = newText,
                    Kind = BlockChangeKind.Modified,
                    RelatedCommentId = activeComments.FirstOrDefault(c => c.BlockId == oldId)?.Id
                });
            }
            newIdsUsed.Add(oldId);
            remainingOld.Remove(oldId);
        }

        // 2.b) BlockId değişmiş ama metin aynı kalmış (re-assignment) → değişiklik değil
        foreach (var (oldId, oldText) in remainingOld.ToList())
        {
            var match = newBlocks.FirstOrDefault(kv =>
                !newIdsUsed.Contains(kv.Key) && NormalizeText(kv.Value) == NormalizeText(oldText));
            if (match.Key != null)
            {
                newIdsUsed.Add(match.Key);
                remainingOld.Remove(oldId);
            }
        }

        // 2.c) Kalan eski bloklar → Modified (fuzzy) veya Removed
        foreach (var (oldId, oldText) in remainingOld)
        {
            var bestKey = (string?)null;
            var bestScore = 0d;
            foreach (var kv in newBlocks)
            {
                if (newIdsUsed.Contains(kv.Key)) continue;
                var s = SimilarityScore(oldText, kv.Value);
                if (s > bestScore) { bestScore = s; bestKey = kv.Key; }
            }
            var relatedCommentId = activeComments.FirstOrDefault(c => c.BlockId == oldId)?.Id;
            if (bestKey != null && bestScore > 0.4)
            {
                _db.DocumentBlockChanges.Add(new DocumentBlockChange
                {
                    DocumentId = doc.Id,
                    FromVersionId = previousVersionId,
                    ToVersionId = newVersion.Id,
                    BlockId = bestKey,
                    OldText = oldText,
                    NewText = newBlocks[bestKey],
                    Kind = BlockChangeKind.Modified,
                    RelatedCommentId = relatedCommentId
                });
                newIdsUsed.Add(bestKey);
            }
            else
            {
                _db.DocumentBlockChanges.Add(new DocumentBlockChange
                {
                    DocumentId = doc.Id,
                    FromVersionId = previousVersionId,
                    ToVersionId = newVersion.Id,
                    BlockId = oldId,
                    OldText = oldText,
                    NewText = null,
                    Kind = BlockChangeKind.Removed,
                    RelatedCommentId = relatedCommentId
                });
            }
        }

        // 2.d) Yeni sürümde eklenmiş bloklar
        foreach (var (newId, newText) in newBlocks)
        {
            if (newIdsUsed.Contains(newId)) continue;
            _db.DocumentBlockChanges.Add(new DocumentBlockChange
            {
                DocumentId = doc.Id,
                FromVersionId = previousVersionId,
                ToVersionId = newVersion.Id,
                BlockId = newId,
                OldText = null,
                NewText = newText,
                Kind = BlockChangeKind.Added
            });
        }

        // Document'in pointer'larını güncelle.
        doc.CurrentMajor = newMajor;
        doc.CustomerVersionId = newVersion.Id;
        doc.CustomerVersionMarkedAt = now;
        doc.CustomerVersionMarkedBy = _user.UserId;

        await _db.SaveChangesAsync(ct);

        await NotifyCustomersAsync(doc, newMajor, ct);

        return await _mediator.Send(new GetDocumentByIdQuery(doc.Id), ct);
    }

    /// <summary>
    /// Yayın sonras\u0131 projenin m\u00fc\u015fteri \u00fcyelerine ( <see cref="ProjectRole.CustomerViewer"/> /
    /// <see cref="ProjectRole.CustomerContributor"/>) bildirim g\u00f6nderir. Hata olursa ana ak\u0131\u015f\u0131 bozmaz
    /// &mdash; <see cref="INotificationSender"/> i\u00e7indeki try/catch bunu garantiler.
    /// </summary>
    private async Task NotifyCustomersAsync(Document doc, int major, CancellationToken ct)
    {
        try
        {
            var recipients = await _db.ProjectMembers
                .Where(pm => pm.ProjectId == doc.ProjectId
                    && (pm.Role == ProjectRole.CustomerViewer || pm.Role == ProjectRole.CustomerContributor))
                .Select(pm => pm.User)
                .ToListAsync(ct);

            if (recipients.Count == 0) return;

            var title = $"{doc.Title} yay\u0131nland\u0131 (v{major}.0)";
            var body = $"Projeniz kapsam\u0131ndaki \"{doc.Title}\" doküman\u0131n\u0131n yeni m\u00fc\u015fteri s\u00fcr\u00fcm\u00fc yay\u0131na al\u0131nd\u0131. G\u00f6r\u00fcnt\u00fclemek i\u00e7in butona t\u0131klay\u0131n.";
            var url = $"/portal/projects/{doc.ProjectId}/documents/{doc.Id}";

            await _notifications.SendAsync(
                recipients,
                NotificationType.DocumentPublished,
                title,
                body,
                url,
                doc.ProjectId,
                doc.Id,
                null,
                ct);
        }
        catch
        {
            // Notification katman\u0131 kendi i\u00e7inde hatay\u0131 yutuyor; burada ekstra koruma.
        }
    }

    private static string NormalizeText(string s) => (s ?? string.Empty).Replace("\r\n", "\n").Trim();

    private static double SimilarityScore(string a, string b)
    {
        if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b)) return 0;
        var na = NormalizeText(a);
        var nb = NormalizeText(b);
        if (na == nb) return 1;
        if (na.Length < 5 || nb.Length < 5) return 0;
        if (na.StartsWith(nb, StringComparison.Ordinal)) return 0.9;
        if (nb.StartsWith(na, StringComparison.Ordinal)) return 0.9;
        if (na.Contains(nb, StringComparison.Ordinal)) return 0.7;
        if (nb.Contains(na, StringComparison.Ordinal)) return 0.7;
        // Basit token overlap
        var at = na.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var bt = nb.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (at.Count == 0 || bt.Count == 0) return 0;
        var common = at.Intersect(bt).Count();
        var total = Math.Max(at.Count, bt.Count);
        return (double)common / total;
    }
}

// ---------- Approve ----------
public record ApproveDocumentCommand(Guid DocumentId, string? Note) : IRequest<DocumentApprovalDto>, IAuditableCommand
{
    public string AuditAction => "DocumentApproved";
    public string? AuditEntityType => "Document";
    public string? AuditEntityId => DocumentId.ToString();
}

public class ApproveDocumentValidator : AbstractValidator<ApproveDocumentCommand>
{
    public ApproveDocumentValidator() => RuleFor(x => x.Note).MaximumLength(2000);
}

public class ApproveDocumentHandler : IRequestHandler<ApproveDocumentCommand, DocumentApprovalDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ApproveDocumentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<DocumentApprovalDto> Handle(ApproveDocumentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        if (!_user.IsCustomer) throw new ForbiddenException("Yalnız müşteri kullanıcıları onay verebilir.");
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var d = await _db.Documents.FirstOrDefaultAsync(x => x.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);
        if (d.CustomerVersionId is null)
            throw new DomainException("NO_CUSTOMER_VERSION", "Henüz müşteri sürümü yayınlanmadı.");

        var me = _user.UserId!.Value;
        var alreadyApproved = await _db.DocumentApprovals
            .AnyAsync(a => a.DocumentVersionId == d.CustomerVersionId && a.ApprovedBy == me, ct);
        if (alreadyApproved)
            throw new DomainException("ALREADY_APPROVED", "Bu sürümü zaten onayladınız.");

        var approval = new DocumentApproval
        {
            DocumentId = d.Id,
            DocumentVersionId = d.CustomerVersionId.Value,
            ApprovedBy = me,
            Note = request.Note,
            ApprovedAt = DateTime.UtcNow
        };
        _db.DocumentApprovals.Add(approval);
        await _db.SaveChangesAsync(ct);

        var user = await _db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == me, ct);
        var version = await _db.DocumentVersions.FirstAsync(v => v.Id == approval.DocumentVersionId, ct);
        return new DocumentApprovalDto
        {
            Id = approval.Id,
            DocumentVersionId = approval.DocumentVersionId,
            VersionMajor = version.Major,
            ApprovedBy = user.Id,
            ApprovedByName = user.DisplayName,
            ApprovedAt = approval.ApprovedAt,
            Note = approval.Note
        };
    }
}

// ---------- Word export ----------
public record ExportDocumentDocxQuery(Guid DocumentId) : IRequest<DocxResultDto>;

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

        var d = await _db.Documents
            .Include(x => x.CustomerVersion)
            .FirstOrDefaultAsync(x => x.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        string title = d.Title;
        string markdown;
        string label;
        if (_user.IsCustomer)
        {
            if (d.CustomerVersion is null) throw new ForbiddenException("Henüz paylaşılmış sürüm yok.");
            markdown = d.CustomerVersion.ContentMarkdown;
            label = $"v{d.CustomerVersion.Major}.0";
        }
        else
        {
            markdown = d.DraftContentMarkdown;
            label = d.CustomerVersion is null ? "taslak" : $"taslak (yay. v{d.CustomerVersion.Major}.0)";
        }

        var bytes = _docx.ExportFromMarkdown(title, markdown);
        return new DocxResultDto
        {
            FileName = $"{Sanitize(title)}-{label}.docx",
            Content = bytes
        };
    }

    private static string Sanitize(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string((name ?? "").Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return string.IsNullOrWhiteSpace(safe) ? "document" : safe;
    }
}

// ---------- Helpers ----------
internal static class VersioningHelpers
{
    /// <summary>JSON doc'tan blockId → plain text haritası çıkarır.</summary>
    public static Dictionary<string, string> ExtractBlockTexts(string contentJson)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(contentJson)) return result;
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            Walk(doc.RootElement, result);
        }
        catch
        {
            // ignore malformed JSON
        }
        return result;
    }

    private static void Walk(JsonElement el, Dictionary<string, string> acc)
    {
        if (el.ValueKind == JsonValueKind.Object)
        {
            // Container node'ların blockId'sini yoksay — kendi metinleri yok,
            // içlerindeki paragraph/heading aynı metni blockId ile taşıyor.
            // Her iki seviyeyi saymak duplicate audit kayıtlarına yol açıyordu.
            string? type = null;
            if (el.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String)
            {
                type = t.GetString();
            }
            var isContainerOnly = type is
                "tableCell" or "tableHeader"
                or "listItem" or "bulletList" or "orderedList"
                or "blockquote";

            string? blockId = null;
            if (!isContainerOnly
                && el.TryGetProperty("attrs", out var attrs) && attrs.ValueKind == JsonValueKind.Object
                && attrs.TryGetProperty("blockId", out var bid) && bid.ValueKind == JsonValueKind.String)
            {
                blockId = bid.GetString();
            }
            if (!string.IsNullOrWhiteSpace(blockId) && !acc.ContainsKey(blockId!))
            {
                acc[blockId!] = ExtractText(el).Trim();
            }
            foreach (var prop in el.EnumerateObject())
            {
                if (prop.Value.ValueKind is JsonValueKind.Array or JsonValueKind.Object)
                    Walk(prop.Value, acc);
            }
        }
        else if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray()) Walk(item, acc);
        }
    }

    private static string ExtractText(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Object)
        {
            if (el.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String && t.GetString() == "text"
                && el.TryGetProperty("text", out var txt) && txt.ValueKind == JsonValueKind.String)
            {
                return txt.GetString() ?? string.Empty;
            }
            if (el.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
            {
                var sb = new System.Text.StringBuilder();
                foreach (var c in content.EnumerateArray())
                {
                    sb.Append(ExtractText(c));
                }
                return sb.ToString();
            }
        }
        return string.Empty;
    }
}
