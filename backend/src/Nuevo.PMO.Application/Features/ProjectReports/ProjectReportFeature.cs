using System.Globalization;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.ProjectReports;

// ---------- DTO ----------

public class ProjectReportSummaryDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public int? OverallProgress { get; set; }
    public string? Summary { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ProjectReportDetailDto : ProjectReportSummaryDto
{
    /// <summary>TipTap JSON (object). Client taraf\u0131nda parse edilir.</summary>
    public object? ContentJson { get; set; }
}

// ---------- List ----------

public record ListProjectReportsQuery(Guid ProjectId) : IRequest<List<ProjectReportSummaryDto>>;

public class ListProjectReportsHandler : IRequestHandler<ListProjectReportsQuery, List<ProjectReportSummaryDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ListProjectReportsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<ProjectReportSummaryDto>> Handle(ListProjectReportsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var rows = await _db.ProjectReports.AsNoTracking()
            .Where(r => r.ProjectId == request.ProjectId)
            .OrderByDescending(r => r.ReportDate)
            .ThenByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.ProjectId,
                r.Title,
                r.ReportDate,
                r.OverallProgress,
                r.Summary,
                r.CreatedAt,
                r.CreatedBy,
                r.UpdatedAt
            })
            .ToListAsync(ct);

        if (rows.Count == 0) return new();

        var userIds = rows.Where(r => r.CreatedBy.HasValue).Select(r => r.CreatedBy!.Value).Distinct().ToList();
        var users = userIds.Count > 0
            ? await _db.Users.IgnoreQueryFilters()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.DisplayName })
                .ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct)
            : new Dictionary<Guid, string>();

        return rows.Select(r => new ProjectReportSummaryDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            Title = r.Title,
            ReportDate = r.ReportDate,
            OverallProgress = r.OverallProgress,
            Summary = r.Summary,
            CreatedAt = r.CreatedAt,
            CreatedBy = r.CreatedBy,
            CreatedByName = r.CreatedBy is Guid cid && users.TryGetValue(cid, out var n) ? n : null,
            UpdatedAt = r.UpdatedAt
        }).ToList();
    }
}

// ---------- Get ----------

public record GetProjectReportQuery(Guid ProjectId, Guid ReportId) : IRequest<ProjectReportDetailDto>;

public class GetProjectReportHandler : IRequestHandler<GetProjectReportQuery, ProjectReportDetailDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetProjectReportHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<ProjectReportDetailDto> Handle(GetProjectReportQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var r = await _db.ProjectReports.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ReportId && x.ProjectId == request.ProjectId, ct)
            ?? throw new NotFoundException("ProjectReport", request.ReportId);

        string? createdByName = null;
        if (r.CreatedBy is Guid cid)
        {
            createdByName = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.Id == cid)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(ct);
        }

        return new ProjectReportDetailDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            Title = r.Title,
            ReportDate = r.ReportDate,
            OverallProgress = r.OverallProgress,
            Summary = r.Summary,
            CreatedAt = r.CreatedAt,
            CreatedBy = r.CreatedBy,
            CreatedByName = createdByName,
            UpdatedAt = r.UpdatedAt,
            ContentJson = string.IsNullOrWhiteSpace(r.ContentJson)
                ? null
                : System.Text.Json.JsonSerializer.Deserialize<object>(r.ContentJson)
        };
    }
}

// ---------- Create ----------

public record CreateProjectReportCommand(
    Guid ProjectId,
    string Title,
    DateTime ReportDate,
    int? OverallProgress,
    string? Summary,
    string ContentJson
) : IRequest<ProjectReportDetailDto>, IAuditableCommand
{
    public string AuditAction => "ProjectReportCreated";
    public string? AuditEntityType => "ProjectReport";
    public string? AuditEntityId { get; set; }
}

public class CreateProjectReportValidator : AbstractValidator<CreateProjectReportCommand>
{
    public CreateProjectReportValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
        RuleFor(x => x.OverallProgress).InclusiveBetween(0, 100).When(x => x.OverallProgress.HasValue);
        RuleFor(x => x.Summary).MaximumLength(2000);
        RuleFor(x => x.ContentJson).NotEmpty();
    }
}

public class CreateProjectReportHandler : IRequestHandler<CreateProjectReportCommand, ProjectReportDetailDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IMediator _mediator;

    public CreateProjectReportHandler(IAppDbContext db, ICurrentUser user, IMediator mediator)
    {
        _db = db; _user = user; _mediator = mediator;
    }

    public async Task<ProjectReportDetailDto> Handle(CreateProjectReportCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var report = new ProjectReport
        {
            ProjectId = request.ProjectId,
            Title = request.Title.Trim(),
            ReportDate = request.ReportDate.Date,
            OverallProgress = request.OverallProgress,
            Summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary!.Trim(),
            ContentJson = string.IsNullOrWhiteSpace(request.ContentJson) ? "{}" : request.ContentJson
        };
        _db.ProjectReports.Add(report);
        await _db.SaveChangesAsync(ct);

        request.AuditEntityId = report.Id.ToString();

        return await _mediator.Send(new GetProjectReportQuery(request.ProjectId, report.Id), ct);
    }
}

// ---------- Update ----------

public record UpdateProjectReportCommand(
    Guid ProjectId,
    Guid ReportId,
    string Title,
    DateTime ReportDate,
    int? OverallProgress,
    string? Summary,
    string ContentJson
) : IRequest<ProjectReportDetailDto>, IAuditableCommand
{
    public string AuditAction => "ProjectReportUpdated";
    public string? AuditEntityType => "ProjectReport";
    public string? AuditEntityId => ReportId.ToString();
}

public class UpdateProjectReportValidator : AbstractValidator<UpdateProjectReportCommand>
{
    public UpdateProjectReportValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.ReportId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
        RuleFor(x => x.OverallProgress).InclusiveBetween(0, 100).When(x => x.OverallProgress.HasValue);
        RuleFor(x => x.Summary).MaximumLength(2000);
        RuleFor(x => x.ContentJson).NotEmpty();
    }
}

public class UpdateProjectReportHandler : IRequestHandler<UpdateProjectReportCommand, ProjectReportDetailDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IMediator _mediator;

    public UpdateProjectReportHandler(IAppDbContext db, ICurrentUser user, IMediator mediator)
    {
        _db = db; _user = user; _mediator = mediator;
    }

    public async Task<ProjectReportDetailDto> Handle(UpdateProjectReportCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var r = await _db.ProjectReports.FirstOrDefaultAsync(
                x => x.Id == request.ReportId && x.ProjectId == request.ProjectId, ct)
            ?? throw new NotFoundException("ProjectReport", request.ReportId);

        r.Title = request.Title.Trim();
        r.ReportDate = request.ReportDate.Date;
        r.OverallProgress = request.OverallProgress;
        r.Summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary!.Trim();
        r.ContentJson = string.IsNullOrWhiteSpace(request.ContentJson) ? "{}" : request.ContentJson;

        await _db.SaveChangesAsync(ct);

        return await _mediator.Send(new GetProjectReportQuery(request.ProjectId, r.Id), ct);
    }
}

// ---------- Delete ----------

public record DeleteProjectReportCommand(Guid ProjectId, Guid ReportId) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "ProjectReportDeleted";
    public string? AuditEntityType => "ProjectReport";
    public string? AuditEntityId => ReportId.ToString();
}

public class DeleteProjectReportHandler : IRequestHandler<DeleteProjectReportCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteProjectReportHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(DeleteProjectReportCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var r = await _db.ProjectReports.FirstOrDefaultAsync(
                x => x.Id == request.ReportId && x.ProjectId == request.ProjectId, ct)
            ?? throw new NotFoundException("ProjectReport", request.ReportId);

        _db.ProjectReports.Remove(r);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

// ---------- Generate Weekly Report Template ----------

public class WeeklyReportTemplateDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public int OverallProgress { get; set; }
    public string Summary { get; set; } = string.Empty;
    /// <summary>Markdown içerik. Frontend `{"markdown": "..."}` olarak sarmalayıp ContentJson gönderir.</summary>
    public string Markdown { get; set; } = string.Empty;
}

public record GenerateWeeklyReportTemplateQuery(Guid ProjectId) : IRequest<WeeklyReportTemplateDto>;

public class GenerateWeeklyReportTemplateHandler : IRequestHandler<GenerateWeeklyReportTemplateQuery, WeeklyReportTemplateDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GenerateWeeklyReportTemplateHandler(IAppDbContext db, ICurrentUser user)
    {
        _db = db; _user = user;
    }

    public async Task<WeeklyReportTemplateDto> Handle(GenerateWeeklyReportTemplateQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var project = await _db.Projects.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var plan = await _db.ProjectPlans.AsNoTracking()
            .Include(p => p.Steps)
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.ProjectId == request.ProjectId, ct);

        var steps = plan?.Steps.ToList() ?? new List<PlanStep>();
        var milestones = plan?.Milestones.ToList() ?? new List<PlanMilestone>();

        var parentIds = steps.Where(s => s.ParentStepId.HasValue).Select(s => s.ParentStepId!.Value).ToHashSet();
        var leaves = steps.Where(s => !parentIds.Contains(s.Id)).ToList();
        if (leaves.Count == 0) leaves = steps;

        var overall = leaves.Count == 0
            ? 0
            : (int)Math.Round((double)leaves.Sum(s => Math.Clamp(s.Progress, 0, 100)) / leaves.Count);

        var today = DateTime.UtcNow;
        var (year, weekNo) = GetIsoYearWeek(today);
        var title = $"{year}-W{weekNo:00} Haftalık Rapor — {project.Name}";

        var completedThisWeek = steps
            .Where(s => s.Status == PlanStepStatus.Done)
            .OrderByDescending(s => s.UpdatedAt ?? s.CreatedAt)
            .Take(8)
            .ToList();
        var inProgress = steps
            .Where(s => s.Status == PlanStepStatus.InProgress)
            .OrderBy(s => s.Order)
            .ToList();
        var blocked = steps.Where(s => s.Status == PlanStepStatus.Blocked).ToList();

        var openCritical = milestones
            .Where(m => m.Type == PlanMilestoneType.CriticalPath && m.Status != PlanMilestoneStatus.Done)
            .OrderBy(m => m.Deadline ?? DateTime.MaxValue)
            .ToList();
        var openCustomer = milestones
            .Where(m => m.Type == PlanMilestoneType.CustomerPending && m.Status != PlanMilestoneStatus.Done)
            .OrderBy(m => m.Deadline ?? DateTime.MaxValue)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine($"# {year}-W{weekNo:00} Haftalık Rapor");
        sb.AppendLine();
        sb.AppendLine($"**Proje:** {project.Name}  ");
        sb.AppendLine($"**Rapor tarihi:** {today:dd.MM.yyyy}  ");
        sb.AppendLine($"**Genel ilerleme:** %{overall}");
        sb.AppendLine();

        sb.AppendLine("## Özet");
        sb.AppendLine();
        sb.AppendLine($"Bu hafta proje genel ilerlemesi **%{overall}** seviyesinde. "
            + $"Tamamlanan {completedThisWeek.Count} adım, devam eden {inProgress.Count} adım ve "
            + $"{openCritical.Count} açık kritik kalem bulunuyor.");
        sb.AppendLine();

        sb.AppendLine("## Tamamlanan İşler");
        sb.AppendLine();
        if (completedThisWeek.Count == 0)
        {
            sb.AppendLine("- _Bu hafta tamamlanan adım yok._");
        }
        else
        {
            foreach (var s in completedThisWeek)
                sb.AppendLine($"- **{Escape(s.Title)}** — %{s.Progress}{FormatRange(s)}");
        }
        sb.AppendLine();

        sb.AppendLine("## Devam Eden İşler");
        sb.AppendLine();
        if (inProgress.Count == 0)
        {
            sb.AppendLine("- _Şu an devam eden kalem yok._");
        }
        else
        {
            foreach (var s in inProgress)
                sb.AppendLine($"- **{Escape(s.Title)}** — %{s.Progress}{FormatRange(s)}");
        }
        sb.AppendLine();

        if (blocked.Count > 0)
        {
            sb.AppendLine("## Blokajlar");
            sb.AppendLine();
            foreach (var s in blocked)
                sb.AppendLine($"- **{Escape(s.Title)}**{FormatRange(s)}");
            sb.AppendLine();
        }

        sb.AppendLine("## Kritik Noktalar");
        sb.AppendLine();
        if (openCritical.Count == 0)
        {
            sb.AppendLine("- _Açık kritik kalem yok._");
        }
        else
        {
            foreach (var m in openCritical)
                sb.AppendLine($"- **{Escape(m.Title)}** — {FormatDeadline(m.Deadline)}");
        }
        sb.AppendLine();

        sb.AppendLine("## Müşteriden Beklenenler");
        sb.AppendLine();
        if (openCustomer.Count == 0)
        {
            sb.AppendLine("- _Müşteri tarafında bekleyen kalem yok._");
        }
        else
        {
            foreach (var m in openCustomer)
                sb.AppendLine($"- **{Escape(m.Title)}** — {FormatDeadline(m.Deadline)}");
        }
        sb.AppendLine();

        sb.AppendLine("## PMO Yorumu");
        sb.AppendLine();
        sb.AppendLine("> _PMO yorumunuzu buraya yazın — takımın odaklanması gereken konular, "
            + "riskler ve önümüzdeki hafta için öncelikler._");
        sb.AppendLine();

        var summaryLine = $"Genel ilerleme %{overall} · {completedThisWeek.Count} tamamlandı · "
            + $"{inProgress.Count} devam ediyor · {openCritical.Count} kritik açık";

        return new WeeklyReportTemplateDto
        {
            Title = title,
            ReportDate = today.Date,
            OverallProgress = overall,
            Summary = summaryLine,
            Markdown = sb.ToString()
        };
    }

    private static string Escape(string? s) => (s ?? string.Empty).Replace("*", "\\*");

    private static string FormatRange(PlanStep s)
    {
        if (string.IsNullOrWhiteSpace(s.StartYearWeek) && string.IsNullOrWhiteSpace(s.EndYearWeek)) return "";
        var range = $"{s.StartYearWeek ?? "?"} → {s.EndYearWeek ?? "?"}";
        return $" ({range})";
    }

    private static string FormatDeadline(DateTime? d)
    {
        if (!d.HasValue) return "deadline yok";
        var overdue = d.Value < DateTime.UtcNow.Date;
        return overdue
            ? $"**gecikmiş**, hedef {d.Value:dd.MM.yyyy}"
            : $"hedef {d.Value:dd.MM.yyyy}";
    }

    private static (int year, int weekNo) GetIsoYearWeek(DateTime date)
    {
        // ISO 8601: haftanın Perşembe günü hangi yıla ait ise o yıla sayılır.
        var day = ISOWeek.GetWeekOfYear(date);
        var year = ISOWeek.GetYear(date);
        return (year, day);
    }
}
