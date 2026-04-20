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

public record StartViewCommand(Guid DocumentId, Guid VersionId) : IRequest<StartViewResultDto>;

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

        var version = await _db.DocumentVersions.AsNoTracking().FirstOrDefaultAsync(v => v.Id == request.VersionId && v.DocumentId == request.DocumentId, ct)
            ?? throw new NotFoundException("DocumentVersion", request.VersionId);

        var ev = new DocumentViewEvent
        {
            DocumentId = request.DocumentId,
            DocumentVersionId = version.Id,
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
    public List<AnalyticsVersionDto> ByVersion { get; set; } = new();
}

public class AnalyticsVersionDto
{
    public Guid VersionId { get; set; }
    public string VersionNumber { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public int ViewCount { get; set; }
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
            .Include(e => e.DocumentVersion)
            .Include(e => e.User)
            .Where(e => e.DocumentId == request.DocumentId)
            .ToListAsync(ct);

        var report = new AnalyticsReportDto
        {
            DocumentId = request.DocumentId,
            TotalViews = events.Count,
            UniqueViewers = events.Select(e => e.UserId).Distinct().Count(),
            TotalDurationSeconds = events.Sum(e => e.DurationSeconds)
        };

        report.ByVersion = events
            .GroupBy(e => e.DocumentVersion)
            .OrderByDescending(g => g.Key.Major).ThenByDescending(g => g.Key.Minor)
            .Select(g => new AnalyticsVersionDto
            {
                VersionId = g.Key.Id,
                VersionNumber = $"{g.Key.Major}.{g.Key.Minor}",
                IsPublished = g.Key.IsPublished,
                ViewCount = g.Count(),
                UniqueViewers = g.Select(e => e.UserId).Distinct().Count(),
                TotalDurationSeconds = g.Sum(e => e.DurationSeconds),
                Viewers = g.GroupBy(e => e.User)
                    .Select(ug => new AnalyticsViewerDto
                    {
                        UserId = ug.Key.Id,
                        UserName = ug.Key.DisplayName,
                        UserEmail = ug.Key.Email,
                        SessionCount = ug.Count(),
                        TotalDurationSeconds = ug.Sum(e => e.DurationSeconds),
                        LastViewedAt = ug.Max(e => e.LastHeartbeatAt)
                    }).ToList()
            }).ToList();
        return report;
    }
}
