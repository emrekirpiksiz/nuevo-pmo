using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public Guid? DocumentId { get; set; }
    public string? DocumentTitle { get; set; }
    public Guid? CommentId { get; set; }
    public string? ActionUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationListDto
{
    public List<NotificationDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int UnreadCount { get; set; }
}

// ---------- Queries ----------

public record GetNotificationsQuery(bool UnreadOnly, int Skip, int Take) : IRequest<NotificationListDto>;

public class GetNotificationsHandler : IRequestHandler<GetNotificationsQuery, NotificationListDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetNotificationsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<NotificationListDto> Handle(GetNotificationsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var userId = _user.UserId!.Value;

        var baseQ = _db.Notifications
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(n => n.RecipientId == userId && !n.IsDeleted);

        var total = await baseQ.CountAsync(ct);
        var unreadCount = await baseQ.CountAsync(n => !n.IsRead, ct);

        var q = baseQ;
        if (request.UnreadOnly) q = q.Where(n => !n.IsRead);

        var take = request.Take <= 0 ? 50 : Math.Min(request.Take, 200);
        var skip = Math.Max(0, request.Skip);

        var items = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Body = n.Body,
                IsRead = n.IsRead,
                ReadAt = n.ReadAt,
                ProjectId = n.ProjectId,
                ProjectName = n.Project != null ? n.Project.Name : null,
                DocumentId = n.DocumentId,
                DocumentTitle = n.Document != null ? n.Document.Title : null,
                CommentId = n.CommentId,
                ActionUrl = n.ActionUrl,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return new NotificationListDto
        {
            Items = items,
            Total = total,
            UnreadCount = unreadCount
        };
    }
}

public record GetUnreadCountQuery : IRequest<int>;

public class GetUnreadCountHandler : IRequestHandler<GetUnreadCountQuery, int>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetUnreadCountHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<int> Handle(GetUnreadCountQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var userId = _user.UserId!.Value;
        return await _db.Notifications
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(n => n.RecipientId == userId && !n.IsRead && !n.IsDeleted, ct);
    }
}

// ---------- Commands ----------

public record MarkNotificationReadCommand(Guid Id) : IRequest<Unit>;

public class MarkNotificationReadHandler : IRequestHandler<MarkNotificationReadCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public MarkNotificationReadHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(MarkNotificationReadCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var userId = _user.UserId!.Value;

        var n = await _db.Notifications
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.RecipientId == userId && !x.IsDeleted, ct)
            ?? throw new NotFoundException("Notification", request.Id);

        if (!n.IsRead)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return Unit.Value;
    }
}

public record MarkAllNotificationsReadCommand : IRequest<int>;

public class MarkAllNotificationsReadHandler : IRequestHandler<MarkAllNotificationsReadCommand, int>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public MarkAllNotificationsReadHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<int> Handle(MarkAllNotificationsReadCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var userId = _user.UserId!.Value;
        var now = DateTime.UtcNow;

        var unread = await _db.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.RecipientId == userId && !n.IsRead && !n.IsDeleted)
            .ToListAsync(ct);

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        if (unread.Count > 0) await _db.SaveChangesAsync(ct);
        return unread.Count;
    }
}
