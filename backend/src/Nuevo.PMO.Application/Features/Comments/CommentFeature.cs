using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Comments;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string BlockId { get; set; } = string.Empty;
    public string AnchorText { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public CommentStatus Status { get; set; }

    public Guid? ForVersionId { get; set; }
    public int? ForVersionMajor { get; set; }

    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedBy { get; set; }
    public string? ResolvedByName { get; set; }

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public List<CommentReplyDto> Replies { get; set; } = new();
}

public class CommentReplyDto
{
    public Guid Id { get; set; }
    public Guid CommentId { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public record GetCommentsQuery(Guid DocumentId, CommentStatus[]? Statuses) : IRequest<List<CommentDto>>;

public class GetCommentsHandler : IRequestHandler<GetCommentsQuery, List<CommentDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCommentsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<CommentDto>> Handle(GetCommentsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var exists = await _db.Documents.AsNoTracking()
            .AnyAsync(d => d.Id == request.DocumentId, ct);
        if (!exists) throw new NotFoundException("Document", request.DocumentId);

        var q = _db.Comments.AsNoTracking()
            .Where(c => c.DocumentId == request.DocumentId);

        // Müşteri: Orphaned yorumları (blok silinmiş) gösterme, geriye kalan
        // tüm açık/çözülmüş yorumları gösterir — sürüm filtresi yok; doküman
        // bazlı basit bir todo listesi gibi çalışır.
        if (_user.IsCustomer)
        {
            q = q.Where(c => c.Status != CommentStatus.Orphaned);
        }

        if (request.Statuses is { Length: > 0 })
            q = q.Where(c => request.Statuses.Contains(c.Status));

        var rows = await q
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.DocumentId,
                c.BlockId,
                c.AnchorText,
                c.Body,
                c.Status,
                c.ForVersionId,
                ForVersionMajor = (int?)(c.ForVersion == null ? null : c.ForVersion.Major),
                c.ResolvedAt,
                c.ResolvedBy,
                c.CreatedBy,
                c.CreatedAt
            })
            .ToListAsync(ct);

        if (rows.Count == 0) return new();

        var commentIds = rows.Select(r => r.Id).ToList();

        var replies = await _db.CommentReplies.AsNoTracking()
            .Where(r => commentIds.Contains(r.CommentId))
            .OrderBy(r => r.CreatedAt)
            .Select(r => new { r.Id, r.CommentId, r.Body, r.CreatedBy, r.CreatedAt })
            .ToListAsync(ct);

        var userIds = rows.Select(c => c.CreatedBy ?? Guid.Empty)
            .Concat(rows.Select(c => c.ResolvedBy ?? Guid.Empty))
            .Concat(replies.Select(r => r.CreatedBy ?? Guid.Empty))
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var userMap = userIds.Count > 0
            ? await _db.Users.IgnoreQueryFilters()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.DisplayName })
                .ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct)
            : new Dictionary<Guid, string>();

        var repliesByComment = replies
            .GroupBy(r => r.CommentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return rows.Select(c => new CommentDto
        {
            Id = c.Id,
            DocumentId = c.DocumentId,
            BlockId = c.BlockId,
            AnchorText = c.AnchorText,
            Body = c.Body,
            Status = c.Status,
            ForVersionId = c.ForVersionId,
            ForVersionMajor = c.ForVersionMajor,
            ResolvedAt = c.ResolvedAt,
            ResolvedBy = c.ResolvedBy,
            ResolvedByName = c.ResolvedBy is Guid rb && userMap.TryGetValue(rb, out var rbn) ? rbn : null,
            CreatedBy = c.CreatedBy ?? Guid.Empty,
            CreatedByName = c.CreatedBy is Guid id && userMap.TryGetValue(id, out var n) ? n : "",
            CreatedAt = c.CreatedAt,
            Replies = (repliesByComment.TryGetValue(c.Id, out var rs) ? rs : new())
                .Select(r => new CommentReplyDto
                {
                    Id = r.Id,
                    CommentId = r.CommentId,
                    Body = r.Body,
                    CreatedBy = r.CreatedBy ?? Guid.Empty,
                    CreatedByName = r.CreatedBy is Guid rcid && userMap.TryGetValue(rcid, out var rcn) ? rcn : "",
                    CreatedAt = r.CreatedAt
                }).ToList()
        }).ToList();
    }
}

public record CreateCommentCommand(Guid DocumentId, string BlockId, string AnchorText, string Body) : IRequest<CommentDto>, IAuditableCommand
{
    public string AuditAction => "CommentCreated";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId { get; set; }
}

public class CreateCommentValidator : AbstractValidator<CreateCommentCommand>
{
    public CreateCommentValidator()
    {
        RuleFor(x => x.DocumentId).NotEmpty();
        RuleFor(x => x.BlockId).NotEmpty().MaximumLength(64);
        RuleFor(x => x.AnchorText).MaximumLength(1024);
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

public class CreateCommentHandler : IRequestHandler<CreateCommentCommand, CommentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly INotificationSender _notifications;

    public CreateCommentHandler(IAppDbContext db, ICurrentUser user, INotificationSender notifications)
    {
        _db = db; _user = user; _notifications = notifications;
    }

    public async Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId, ct)
            ?? throw new NotFoundException("Document", request.DocumentId);

        // Yorumlar ancak yayınlanmış bir müşteri sürümü varken açılabilir.
        if (doc.CustomerVersionId is null)
            throw new DomainException("NO_CUSTOMER_VERSION",
                "Bu doküman henüz yayınlanmadı. Yorumlar ancak müşteri sürümü yayınlandıktan sonra yapılabilir.");

        var cmt = new Comment
        {
            DocumentId = doc.Id,
            BlockId = request.BlockId.Trim(),
            AnchorText = (request.AnchorText ?? string.Empty).Trim(),
            Body = request.Body.Trim(),
            Status = CommentStatus.Open,
            ForVersionId = doc.CustomerVersionId
        };
        _db.Comments.Add(cmt);
        await _db.SaveChangesAsync(ct);
        request.AuditEntityId = cmt.Id.ToString();

        var me = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == _user.UserId, ct);

        await CommentNotifier.NotifyNewCommentAsync(_db, _notifications, doc, cmt, me, ct);

        return new CommentDto
        {
            Id = cmt.Id,
            DocumentId = cmt.DocumentId,
            BlockId = cmt.BlockId,
            AnchorText = cmt.AnchorText,
            Body = cmt.Body,
            Status = cmt.Status,
            ForVersionId = cmt.ForVersionId,
            CreatedBy = _user.UserId ?? Guid.Empty,
            CreatedByName = me?.DisplayName ?? "",
            CreatedAt = cmt.CreatedAt
        };
    }
}

public record UpdateCommentCommand(Guid Id, string Body) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentUpdated";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class UpdateCommentValidator : AbstractValidator<UpdateCommentCommand>
{
    public UpdateCommentValidator() => RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
}

public class UpdateCommentHandler : IRequestHandler<UpdateCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpdateCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(UpdateCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);
        if (cmt.CreatedBy != _user.UserId && !_user.IsNuevo)
            throw new ForbiddenException();
        cmt.Body = request.Body.Trim();
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record DeleteCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentDeleted";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class DeleteCommentHandler : IRequestHandler<DeleteCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(DeleteCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);
        if (cmt.CreatedBy != _user.UserId && !_user.IsNuevo) throw new ForbiddenException();
        _db.Comments.Remove(cmt);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record AddReplyCommand(Guid CommentId, string Body) : IRequest<CommentReplyDto>, IAuditableCommand
{
    public string AuditAction => "CommentReplyAdded";
    public string? AuditEntityType => "CommentReply";
    public string? AuditEntityId => CommentId.ToString();
}

public class AddReplyValidator : AbstractValidator<AddReplyCommand>
{
    public AddReplyValidator() => RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
}

public class AddReplyHandler : IRequestHandler<AddReplyCommand, CommentReplyDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly INotificationSender _notifications;

    public AddReplyHandler(IAppDbContext db, ICurrentUser user, INotificationSender notifications)
    {
        _db = db; _user = user; _notifications = notifications;
    }

    public async Task<CommentReplyDto> Handle(AddReplyCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.CommentId, ct)
            ?? throw new NotFoundException("Comment", request.CommentId);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        var reply = new CommentReply { CommentId = cmt.Id, Body = request.Body.Trim() };
        _db.CommentReplies.Add(reply);

        // Çözülmüş yoruma yanıt gelirse konu yeniden açılır — taraflar hâlâ
        // konuşmak istiyor demektir.
        if (cmt.Status == CommentStatus.Resolved)
        {
            cmt.Status = CommentStatus.Open;
            cmt.ResolvedAt = null;
            cmt.ResolvedBy = null;
        }

        await _db.SaveChangesAsync(ct);

        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == cmt.DocumentId, ct);
        var me = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == _user.UserId, ct);

        if (doc is not null)
        {
            await CommentNotifier.NotifyReplyAsync(_db, _notifications, doc, cmt, reply, me, ct);
        }

        return new CommentReplyDto
        {
            Id = reply.Id,
            CommentId = reply.CommentId,
            Body = reply.Body,
            CreatedBy = _user.UserId ?? Guid.Empty,
            CreatedByName = me?.DisplayName ?? "",
            CreatedAt = reply.CreatedAt
        };
    }
}

// ---------- Resolve / Reopen (manuel) ----------
public record ResolveCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentResolved";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class ResolveCommentHandler : IRequestHandler<ResolveCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ResolveCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(ResolveCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        // Sadece Nuevo kullanıcıları yorumu çözebilir (iç süreç sahibidir).
        if (!_user.IsNuevo) throw new ForbiddenException();

        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        if (cmt.Status == CommentStatus.Resolved) return Unit.Value;

        cmt.Status = CommentStatus.Resolved;
        cmt.ResolvedAt = DateTime.UtcNow;
        cmt.ResolvedBy = _user.UserId;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record ReopenCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentReopened";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class ReopenCommentHandler : IRequestHandler<ReopenCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ReopenCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(ReopenCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);

        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        // Müşteri sadece KENDİ yorumunu yeniden açabilir; Nuevo herhangi bir yorumu.
        if (_user.IsCustomer && cmt.CreatedBy != _user.UserId)
            throw new ForbiddenException();

        if (cmt.Status == CommentStatus.Open) return Unit.Value;
        if (cmt.Status == CommentStatus.Orphaned)
            throw new DomainException("ORPHANED",
                "Bu yorumun ait olduğu blok silinmiş; yeniden açılamaz.");

        cmt.Status = CommentStatus.Open;
        cmt.ResolvedAt = null;
        cmt.ResolvedBy = null;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

/// <summary>
/// Yorum ve yan\u0131t bildirim ak\u0131\u015f\u0131 yard\u0131mc\u0131s\u0131.
///
/// Kural:
/// - Yorumu yapan Nuevo ise \u2192 projenin m\u00fc\u015fteri \u00fcyelerine (CustomerViewer/Contributor).
/// - Yorumu yapan M\u00fc\u015fteri ise \u2192 projenin Nuevo \u00fcyelerine (PMOwner/PMOMember).
/// - Yan\u0131t (reply) geldi\u011finde, \u00fcst yorumun yazar\u0131 da listeye eklenir (tek sefer).
/// </summary>
internal static class CommentNotifier
{
    public static async Task NotifyNewCommentAsync(
        IAppDbContext db,
        INotificationSender notifications,
        Document doc,
        Comment cmt,
        User? author,
        CancellationToken ct)
    {
        try
        {
            var recipients = await ResolveRecipientsAsync(db, doc, author, null, ct);
            if (recipients.Count == 0) return;

            var title = $"Yeni yorum: {doc.Title}";
            var snippet = Truncate(cmt.Body, 200);
            var whoName = author?.DisplayName ?? "Bir kullan\u0131c\u0131";
            var body = $"{whoName} \"{doc.Title}\" doküman\u0131na yorum yapt\u0131.\n\n\u201C{snippet}\u201D";

            await SendSplitAsync(notifications, recipients, NotificationType.CommentCreated, title, body, doc, cmt.Id, ct);
        }
        catch { /* yutuldu; ana ak\u0131\u015f bozulmas\u0131n */ }
    }

    public static async Task NotifyReplyAsync(
        IAppDbContext db,
        INotificationSender notifications,
        Document doc,
        Comment parent,
        CommentReply reply,
        User? replier,
        CancellationToken ct)
    {
        try
        {
            var recipients = await ResolveRecipientsAsync(db, doc, replier, parent, ct);
            if (recipients.Count == 0) return;

            var title = $"Yoruma yan\u0131t: {doc.Title}";
            var snippet = Truncate(reply.Body, 200);
            var whoName = replier?.DisplayName ?? "Bir kullan\u0131c\u0131";
            var body = $"{whoName} bir yoruma yan\u0131t verdi.\n\n\u201C{snippet}\u201D";

            await SendSplitAsync(notifications, recipients, NotificationType.CommentReplied, title, body, doc, parent.Id, ct);
        }
        catch { /* yutuldu */ }
    }

    /// <summary>
    /// Al\u0131c\u0131lar\u0131 Nuevo/M\u00fc\u015fteri olarak ikiye b\u00f6l\u00fcp her gruba kendi deep-link'iyle bildirim yollar.
    /// </summary>
    private static async Task SendSplitAsync(
        INotificationSender notifications,
        List<User> recipients,
        NotificationType type,
        string title,
        string body,
        Document doc,
        Guid commentId,
        CancellationToken ct)
    {
        var nuevo = recipients.Where(u => u.UserType == UserType.Nuevo).ToList();
        var customer = recipients.Where(u => u.UserType == UserType.Customer).ToList();

        if (nuevo.Count > 0)
        {
            await notifications.SendAsync(nuevo, type, title, body,
                $"/admin/projects/{doc.ProjectId}/documents/{doc.Id}",
                doc.ProjectId, doc.Id, commentId, ct);
        }
        if (customer.Count > 0)
        {
            await notifications.SendAsync(customer, type, title, body,
                $"/portal/projects/{doc.ProjectId}/documents/{doc.Id}",
                doc.ProjectId, doc.Id, commentId, ct);
        }
    }

    private static async Task<List<User>> ResolveRecipientsAsync(
        IAppDbContext db,
        Document doc,
        User? actor,
        Comment? parent,
        CancellationToken ct)
    {
        var members = await db.ProjectMembers
            .IgnoreQueryFilters()
            .Where(pm => pm.ProjectId == doc.ProjectId && !pm.IsDeleted)
            .Select(pm => new { pm.Role, User = pm.User })
            .ToListAsync(ct);

        List<User> target;
        if (actor?.UserType == UserType.Nuevo)
        {
            target = members
                .Where(m => m.Role == ProjectRole.CustomerViewer || m.Role == ProjectRole.CustomerContributor)
                .Select(m => m.User!)
                .Where(u => u is not null)
                .ToList();
        }
        else
        {
            target = members
                .Where(m => m.Role == ProjectRole.PMOwner || m.Role == ProjectRole.PMOMember)
                .Select(m => m.User!)
                .Where(u => u is not null)
                .ToList();
        }

        // Reply'da \u00fcst yorumun yazar\u0131n\u0131 da ekle.
        if (parent is not null && parent.CreatedBy is Guid authorId && authorId != Guid.Empty)
        {
            var alreadyIncluded = target.Any(u => u.Id == authorId);
            if (!alreadyIncluded && actor?.Id != authorId)
            {
                var parentAuthor = await db.Users.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == authorId, ct);
                if (parentAuthor is not null && parentAuthor.IsActive)
                {
                    target.Add(parentAuthor);
                }
            }
        }

        if (actor is not null)
        {
            target = target.Where(u => u.Id != actor.Id).ToList();
        }

        return target;
    }

    private static string Truncate(string text, int maxLen)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        return text.Length <= maxLen ? text : text[..maxLen].TrimEnd() + "\u2026";
    }
}
