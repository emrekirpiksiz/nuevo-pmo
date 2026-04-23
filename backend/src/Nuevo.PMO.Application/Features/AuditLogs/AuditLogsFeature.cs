using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;

namespace Nuevo.PMO.Application.Features.AuditLogs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? IpAddress { get; set; }
    public string? CorrelationId { get; set; }
}

internal record UserMini(string DisplayName, string Email);

public record GetDocumentAuditLogsQuery(Guid DocumentId, int Take = 200) : IRequest<List<AuditLogDto>>;

public class GetDocumentAuditLogsHandler : IRequestHandler<GetDocumentAuditLogsQuery, List<AuditLogDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentAuditLogsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<AuditLogDto>> Handle(GetDocumentAuditLogsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        // Document itself + direct children (comments, replies, approvals, view events) keyed to this doc.
        var commentIds = await _db.Comments.Where(c => c.DocumentId == request.DocumentId)
            .Select(c => c.Id.ToString()).ToListAsync(ct);
        var replyIds = await _db.CommentReplies.Where(r => commentIds.Contains(r.CommentId.ToString()))
            .Select(r => r.Id.ToString()).ToListAsync(ct);
        var approvalIds = await _db.DocumentApprovals.Where(a => a.DocumentId == request.DocumentId)
            .Select(a => a.Id.ToString()).ToListAsync(ct);

        var docIdStr = request.DocumentId.ToString();

        // Filter: entityType=Document && entityId=docIdStr, OR CommentId in comments, OR approvalId, OR CommentReplyId
        var q = _db.AuditLogs.AsQueryable();
        q = q.Where(a =>
            (a.EntityType == "Document" && a.EntityId == docIdStr) ||
            (a.EntityType == "Comment" && a.EntityId != null && commentIds.Contains(a.EntityId)) ||
            (a.EntityType == "CommentReply" && a.EntityId != null && (commentIds.Contains(a.EntityId) || replyIds.Contains(a.EntityId))) ||
            (a.EntityType == "DocumentVersion" && a.EntityId == docIdStr) // backward-compat, in case
        );

        var logs = await q.OrderByDescending(a => a.CreatedAt).Take(Math.Clamp(request.Take, 1, 1000)).ToListAsync(ct);

        var userIds = logs.Where(l => l.UserId.HasValue).Select(l => l.UserId!.Value).Distinct().ToList();
        var users = userIds.Count > 0
            ? await _db.Users.IgnoreQueryFilters().Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => new UserMini(u.DisplayName, u.Email), ct)
            : new Dictionary<Guid, UserMini>();

        return logs.Select(l => new AuditLogDto
        {
            Id = l.Id,
            CreatedAt = l.CreatedAt,
            UserId = l.UserId,
            UserName = l.UserId is Guid uid && users.TryGetValue(uid, out var u) ? u.DisplayName : null,
            UserEmail = l.UserEmail ?? (l.UserId is Guid uid2 && users.TryGetValue(uid2, out var u2) ? u2.Email : null),
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            BeforeJson = l.BeforeJson,
            AfterJson = l.AfterJson,
            IpAddress = l.IpAddress,
            CorrelationId = l.CorrelationId
        }).ToList();
    }
}
