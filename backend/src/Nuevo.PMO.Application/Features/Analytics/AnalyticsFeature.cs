using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Application.Features.Analytics;

public class AnalyticsOptions
{
    public int HeartbeatIntervalSeconds { get; set; } = 30;
}

public class StartViewResultDto
{
    public Guid SessionId { get; set; }
    public int HeartbeatIntervalSec { get; set; }
}

public record StartViewCommand(Guid DocumentId) : IRequest<StartViewResultDto>;

public class StartViewHandler : IRequestHandler<StartViewCommand, StartViewResultDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IOptions<AnalyticsOptions> _opt;

    public StartViewHandler(IAppDbContext db, ICurrentUser user, IOptions<AnalyticsOptions> opt)
    {
        _db = db; _user = user; _opt = opt;
    }

    public async Task<StartViewResultDto> Handle(StartViewCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var ev = new DocumentViewEvent
        {
            DocumentId = request.DocumentId,
            UserId = _user.UserId!.Value,
            SessionId = Guid.NewGuid(),
            OpenedAt = DateTime.UtcNow,
            LastHeartbeatAt = DateTime.UtcNow,
            DurationSeconds = 0
        };
        _db.DocumentViewEvents.Add(ev);
        await _db.SaveChangesAsync(ct);

        return new StartViewResultDto { SessionId = ev.SessionId, HeartbeatIntervalSec = _opt.Value.HeartbeatIntervalSeconds };
    }
}

public record HeartbeatCommand(Guid DocumentId, Guid SessionId) : IRequest<Unit>;

public class HeartbeatHandler : IRequestHandler<HeartbeatCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public HeartbeatHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(HeartbeatCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var ev = await _db.DocumentViewEvents.FirstOrDefaultAsync(e => e.SessionId == request.SessionId && e.DocumentId == request.DocumentId, ct);
        if (ev is null) return Unit.Value;
        if (ev.UserId != _user.UserId) throw new ForbiddenException();

        var now = DateTime.UtcNow;
        ev.LastHeartbeatAt = now;
        ev.DurationSeconds = (int)Math.Round((now - ev.OpenedAt).TotalSeconds);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record CloseViewCommand(Guid DocumentId, Guid SessionId) : IRequest<Unit>;

public class CloseViewHandler : IRequestHandler<CloseViewCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public CloseViewHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(CloseViewCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var ev = await _db.DocumentViewEvents.FirstOrDefaultAsync(e => e.SessionId == request.SessionId && e.DocumentId == request.DocumentId, ct);
        if (ev is null) return Unit.Value;
        if (ev.UserId != _user.UserId) throw new ForbiddenException();

        var now = DateTime.UtcNow;
        ev.ClosedAt = now;
        ev.LastHeartbeatAt = now;
        ev.DurationSeconds = (int)Math.Round((now - ev.OpenedAt).TotalSeconds);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public class AnalyticsReportDto
{
    public Guid DocumentId { get; set; }
    public int TotalViews { get; set; }
    public int UniqueViewers { get; set; }
    public int TotalDurationSeconds { get; set; }
    public List<AnalyticsViewerDto> Viewers { get; set; } = new();
}

public class AnalyticsViewerDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public int SessionCount { get; set; }
    public int TotalDurationSeconds { get; set; }
    public DateTime? LastViewedAt { get; set; }
}

public record GetDocumentAnalyticsQuery(Guid DocumentId) : IRequest<AnalyticsReportDto>;

public class GetDocumentAnalyticsHandler : IRequestHandler<GetDocumentAnalyticsQuery, AnalyticsReportDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetDocumentAnalyticsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<AnalyticsReportDto> Handle(GetDocumentAnalyticsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var events = await _db.DocumentViewEvents
            .Include(e => e.User)
            .Where(e => e.DocumentId == request.DocumentId)
            .ToListAsync(ct);

        var report = new AnalyticsReportDto
        {
            DocumentId = request.DocumentId,
            TotalViews = events.Count,
            UniqueViewers = events.Select(e => e.UserId).Distinct().Count(),
            TotalDurationSeconds = events.Sum(e => e.DurationSeconds),
            Viewers = events.GroupBy(e => e.User)
                .Select(g => new AnalyticsViewerDto
                {
                    UserId = g.Key.Id,
                    UserName = g.Key.DisplayName,
                    UserEmail = g.Key.Email,
                    SessionCount = g.Count(),
                    TotalDurationSeconds = g.Sum(e => e.DurationSeconds),
                    LastViewedAt = g.Max(e => e.LastHeartbeatAt)
                }).OrderByDescending(x => x.TotalDurationSeconds).ToList()
        };
        return report;
    }
}
