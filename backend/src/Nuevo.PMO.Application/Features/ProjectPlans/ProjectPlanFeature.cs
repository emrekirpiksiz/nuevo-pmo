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

namespace Nuevo.PMO.Application.Features.ProjectPlans;

// ---------- DTO ----------

public class PlanStepDto
{
    public Guid Id { get; set; }
    /// <summary>
    /// Sunucu tarafı kimliği; yeni step eklerken client boş bırakır.
    /// </summary>
    public Guid? ParentStepId { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>ISO year-week, \"2025-W12\".</summary>
    public string? StartYearWeek { get; set; }
    public string? EndYearWeek { get; set; }

    /// <summary>Admin'e döner; müşteri cevabında null'lanır.</summary>
    public decimal? PlannedManDays { get; set; }
    public decimal? ActualManDays { get; set; }

    public int Progress { get; set; }
    public PlanStepStatus Status { get; set; }
}

public class PlanMilestoneDto
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PlanMilestoneType Type { get; set; }
    public PlanMilestoneStatus Status { get; set; }
    public DateTime? Deadline { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class ProjectPlanDto
{
    public Guid ProjectId { get; set; }
    public int OverallProgress { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    public string? UpdatedByName { get; set; }
    public List<PlanStepDto> Steps { get; set; } = new();
    public List<PlanMilestoneDto> Milestones { get; set; } = new();
}

public class PlanSnapshotSummaryDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public int OverallProgress { get; set; }
    public string? ChangeNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
}

public class PlanSnapshotDetailDto : PlanSnapshotSummaryDto
{
    public List<PlanStepDto> Steps { get; set; } = new();
    public List<PlanMilestoneDto> Milestones { get; set; } = new();
}

// ---------- Upsert payload ----------

public class PlanStepInput
{
    /// <summary>
    /// İç referans anahtarı. Client tarafında geçici olarak üretilir; parent
    /// seçiminde `ParentRefKey` ile eşleştirme yapılır. Server'a aktarılmaz.
    /// </summary>
    public string? RefKey { get; set; }

    /// <summary>Üst adımın `RefKey`'i. Root ise null.</summary>
    public string? ParentRefKey { get; set; }

    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public string? StartYearWeek { get; set; }
    public string? EndYearWeek { get; set; }

    public decimal? PlannedManDays { get; set; }
    public decimal? ActualManDays { get; set; }

    public int Progress { get; set; }
    public PlanStepStatus Status { get; set; } = PlanStepStatus.Planned;
}

public class PlanMilestoneInput
{
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PlanMilestoneType Type { get; set; } = PlanMilestoneType.CriticalPath;
    public PlanMilestoneStatus Status { get; set; } = PlanMilestoneStatus.Pending;
    public DateTime? Deadline { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// ---------- Internal snapshot body ----------

internal class SnapshotBody
{
    public List<PlanStepDto> Steps { get; set; } = new();
    public List<PlanMilestoneDto> Milestones { get; set; } = new();
}

// ---------- Helpers ----------

internal static class ProjectPlanMapping
{
    public static int ComputeOverallProgress(IReadOnlyCollection<PlanStep> steps)
    {
        if (steps is null || steps.Count == 0) return 0;
        // Yaprak (leaf) adımlar üzerinden hesap: parent adımların progress'i
        // çocukların ortalaması olsun diye önce leaf'leri filtreliyoruz.
        var parentIds = steps.Where(s => s.ParentStepId.HasValue)
            .Select(s => s.ParentStepId!.Value)
            .ToHashSet();
        var leaves = steps.Where(s => !parentIds.Contains(s.Id)).ToList();
        if (leaves.Count == 0) leaves = steps.ToList();
        var total = leaves.Sum(s => Math.Clamp(s.Progress, 0, 100));
        return (int)Math.Round((double)total / leaves.Count);
    }

    public static int ComputeOverallProgress(IReadOnlyCollection<PlanStepDto> steps)
    {
        if (steps is null || steps.Count == 0) return 0;
        var parentIds = steps.Where(s => s.ParentStepId.HasValue)
            .Select(s => s.ParentStepId!.Value)
            .ToHashSet();
        var leaves = steps.Where(s => !parentIds.Contains(s.Id)).ToList();
        if (leaves.Count == 0) leaves = steps.ToList();
        var total = leaves.Sum(s => Math.Clamp(s.Progress, 0, 100));
        return (int)Math.Round((double)total / leaves.Count);
    }

    public static PlanStepDto ToDto(PlanStep s, bool includeInternal) => new()
    {
        Id = s.Id,
        ParentStepId = s.ParentStepId,
        Order = s.Order,
        Title = s.Title,
        Description = s.Description,
        StartYearWeek = s.StartYearWeek,
        EndYearWeek = s.EndYearWeek,
        PlannedManDays = includeInternal ? s.PlannedManDays : null,
        ActualManDays = includeInternal ? s.ActualManDays : null,
        Progress = s.Progress,
        Status = s.Status
    };

    public static PlanMilestoneDto ToDto(PlanMilestone m) => new()
    {
        Id = m.Id,
        Order = m.Order,
        Title = m.Title,
        Description = m.Description,
        Type = m.Type,
        Status = m.Status,
        Deadline = m.Deadline,
        CompletedAt = m.CompletedAt
    };
}

// ---------- GetCurrentPlan ----------

public record GetCurrentPlanQuery(Guid ProjectId) : IRequest<ProjectPlanDto>;

public class GetCurrentPlanHandler : IRequestHandler<GetCurrentPlanQuery, ProjectPlanDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCurrentPlanHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<ProjectPlanDto> Handle(GetCurrentPlanQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var plan = await _db.ProjectPlans.AsNoTracking()
            .Include(p => p.Steps)
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.ProjectId == request.ProjectId, ct);

        var includeInternal = _user.IsNuevo;

        if (plan is null)
        {
            return new ProjectPlanDto
            {
                ProjectId = request.ProjectId,
                OverallProgress = 0,
                Steps = new(),
                Milestones = new()
            };
        }

        var steps = plan.Steps
            .OrderBy(s => s.ParentStepId.HasValue ? 1 : 0)
            .ThenBy(s => s.Order)
            .ThenBy(s => s.CreatedAt)
            .Select(s => ProjectPlanMapping.ToDto(s, includeInternal))
            .ToList();
        var milestones = plan.Milestones.OrderBy(m => m.Type)
            .ThenBy(m => m.Order)
            .ThenBy(m => m.Deadline ?? DateTime.MaxValue)
            .Select(ProjectPlanMapping.ToDto).ToList();

        string? updatedByName = null;
        if (plan.UpdatedBy is Guid uid)
        {
            updatedByName = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.Id == uid)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(ct);
        }

        return new ProjectPlanDto
        {
            ProjectId = plan.ProjectId,
            OverallProgress = ProjectPlanMapping.ComputeOverallProgress(plan.Steps.ToList()),
            UpdatedAt = plan.UpdatedAt ?? plan.CreatedAt,
            UpdatedBy = plan.UpdatedBy,
            UpdatedByName = updatedByName,
            Steps = steps,
            Milestones = milestones
        };
    }
}

// ---------- GetPlanHistory ----------

public record GetPlanHistoryQuery(Guid ProjectId) : IRequest<List<PlanSnapshotSummaryDto>>;

public class GetPlanHistoryHandler : IRequestHandler<GetPlanHistoryQuery, List<PlanSnapshotSummaryDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetPlanHistoryHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<PlanSnapshotSummaryDto>> Handle(GetPlanHistoryQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var rows = await _db.ProjectPlanSnapshots.AsNoTracking()
            .Where(s => s.ProjectId == request.ProjectId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.ProjectId,
                s.OverallProgress,
                s.ChangeNote,
                s.CreatedAt,
                s.CreatedBy
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

        return rows.Select(r => new PlanSnapshotSummaryDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            OverallProgress = r.OverallProgress,
            ChangeNote = r.ChangeNote,
            CreatedAt = r.CreatedAt,
            CreatedBy = r.CreatedBy,
            CreatedByName = r.CreatedBy is Guid cid && users.TryGetValue(cid, out var n) ? n : null
        }).ToList();
    }
}

// ---------- GetPlanSnapshot ----------

public record GetPlanSnapshotQuery(Guid ProjectId, Guid SnapshotId) : IRequest<PlanSnapshotDetailDto>;

public class GetPlanSnapshotHandler : IRequestHandler<GetPlanSnapshotQuery, PlanSnapshotDetailDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetPlanSnapshotHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<PlanSnapshotDetailDto> Handle(GetPlanSnapshotQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var snap = await _db.ProjectPlanSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.SnapshotId && s.ProjectId == request.ProjectId, ct)
            ?? throw new NotFoundException("ProjectPlanSnapshot", request.SnapshotId);

        var body = DeserializeBody(snap.BodyJson);
        var steps = body.Steps;
        if (!_user.IsNuevo)
        {
            steps = steps.Select(s => new PlanStepDto
            {
                Id = s.Id,
                ParentStepId = s.ParentStepId,
                Order = s.Order,
                Title = s.Title,
                Description = s.Description,
                StartYearWeek = s.StartYearWeek,
                EndYearWeek = s.EndYearWeek,
                PlannedManDays = null,
                ActualManDays = null,
                Progress = s.Progress,
                Status = s.Status
            }).ToList();
        }

        string? createdByName = null;
        if (snap.CreatedBy is Guid cid)
        {
            createdByName = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.Id == cid)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(ct);
        }

        return new PlanSnapshotDetailDto
        {
            Id = snap.Id,
            ProjectId = snap.ProjectId,
            OverallProgress = snap.OverallProgress,
            ChangeNote = snap.ChangeNote,
            CreatedAt = snap.CreatedAt,
            CreatedBy = snap.CreatedBy,
            CreatedByName = createdByName,
            Steps = steps,
            Milestones = body.Milestones
        };
    }

    private static SnapshotBody DeserializeBody(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new SnapshotBody();
        try
        {
            return JsonSerializer.Deserialize<SnapshotBody>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new SnapshotBody();
        }
        catch
        {
            return new SnapshotBody();
        }
    }
}

// ---------- UpsertPlan ----------

public record UpsertPlanCommand(
    Guid ProjectId,
    List<PlanStepInput> Steps,
    List<PlanMilestoneInput> Milestones,
    string? ChangeNote
) : IRequest<ProjectPlanDto>, IAuditableCommand
{
    public string AuditAction => "ProjectPlanUpserted";
    public string? AuditEntityType => "ProjectPlan";
    public string? AuditEntityId => ProjectId.ToString();
}

public class UpsertPlanValidator : AbstractValidator<UpsertPlanCommand>
{
    public UpsertPlanValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Steps).NotNull();
        RuleFor(x => x.Milestones).NotNull();
        RuleFor(x => x.ChangeNote).MaximumLength(1000);

        RuleForEach(x => x.Steps).ChildRules(s =>
        {
            s.RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
            s.RuleFor(x => x.Description).MaximumLength(4000);
            s.RuleFor(x => x.Progress).InclusiveBetween(0, 100);
            s.RuleFor(x => x.StartYearWeek).MaximumLength(16);
            s.RuleFor(x => x.EndYearWeek).MaximumLength(16);
            s.RuleFor(x => x.PlannedManDays)
                .InclusiveBetween(0m, 10000m)
                .When(x => x.PlannedManDays.HasValue);
            s.RuleFor(x => x.ActualManDays)
                .InclusiveBetween(0m, 10000m)
                .When(x => x.ActualManDays.HasValue);
        });

        RuleForEach(x => x.Milestones).ChildRules(m =>
        {
            m.RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
            m.RuleFor(x => x.Description).MaximumLength(4000);
        });
    }
}

public class UpsertPlanHandler : IRequestHandler<UpsertPlanCommand, ProjectPlanDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpsertPlanHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<ProjectPlanDto> Handle(UpsertPlanCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        AuthorizationHelper.EnsureNuevo(_user);
        await AuthorizationHelper.EnsureProjectAccessAsync(_db, _user, request.ProjectId, ct);

        var plan = await _db.ProjectPlans
            .Include(p => p.Steps)
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.ProjectId == request.ProjectId, ct);

        if (plan is null)
        {
            plan = new ProjectPlan { ProjectId = request.ProjectId };
            _db.ProjectPlans.Add(plan);
        }

        // Tam upsert: mevcut adım/milestone kayıtlarını sil, yenisini yaz.
        // Admin tarafı plan'ı her seferinde bütün olarak gönderir.
        if (plan.Steps.Count > 0)
        {
            // Parent-child ilişkisi olabilir; child'ları önce sil.
            foreach (var s in plan.Steps.Where(s => s.ParentStepId.HasValue).ToList())
                _db.PlanSteps.Remove(s);
            foreach (var s in plan.Steps.Where(s => !s.ParentStepId.HasValue).ToList())
                _db.PlanSteps.Remove(s);
        }
        if (plan.Milestones.Count > 0)
        {
            foreach (var m in plan.Milestones.ToList()) _db.PlanMilestones.Remove(m);
        }

        // Önce parent step'ler oluşturulur ve RefKey → Id eşlemesi yapılır,
        // sonra child step'ler ParentStepId bağlanarak eklenir.
        var newSteps = new List<PlanStep>();
        var refKeyToId = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

        // Kararlı sıralama: önce parent refkey'i null olanlar (root).
        var inputsOrdered = request.Steps
            .Select((s, idx) => (Input: s, Idx: idx))
            .OrderBy(t => string.IsNullOrEmpty(t.Input.ParentRefKey) ? 0 : 1)
            .ThenBy(t => t.Input.Order == 0 ? t.Idx : t.Input.Order)
            .ToList();

        foreach (var (input, idx) in inputsOrdered)
        {
            Guid? parentId = null;
            if (!string.IsNullOrWhiteSpace(input.ParentRefKey)
                && refKeyToId.TryGetValue(input.ParentRefKey, out var pid))
            {
                parentId = pid;
            }

            var step = new PlanStep
            {
                ProjectPlanId = plan.Id,
                ProjectPlan = plan,
                ParentStepId = parentId,
                Order = input.Order == 0 ? idx : input.Order,
                Title = input.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim(),
                StartYearWeek = NormalizeYearWeek(input.StartYearWeek),
                EndYearWeek = NormalizeYearWeek(input.EndYearWeek),
                PlannedManDays = input.PlannedManDays,
                ActualManDays = input.ActualManDays,
                Progress = Math.Clamp(input.Progress, 0, 100),
                Status = input.Status
            };

            _db.PlanSteps.Add(step);
            newSteps.Add(step);

            if (!string.IsNullOrWhiteSpace(input.RefKey))
                refKeyToId[input.RefKey] = step.Id;
        }

        var newMilestones = request.Milestones.Select((m, idx) => new PlanMilestone
        {
            ProjectPlanId = plan.Id,
            ProjectPlan = plan,
            Order = m.Order == 0 ? idx : m.Order,
            Title = m.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(m.Description) ? null : m.Description.Trim(),
            Type = m.Type,
            Status = m.Status,
            Deadline = m.Deadline,
            CompletedAt = m.Status == PlanMilestoneStatus.Done ? (m.CompletedAt ?? DateTime.UtcNow) : null
        }).ToList();

        foreach (var m in newMilestones) _db.PlanMilestones.Add(m);

        var overall = ProjectPlanMapping.ComputeOverallProgress(newSteps);

        // Snapshot: canlı planın o anki hali json'laştırılır, ileride body
        // şeması değişse bile geçmişe dokunulmaz. M/D alanları dahil; okurken
        // müşteri için ayrı bir projeksiyonla filtreleniyor.
        var bodyJson = JsonSerializer.Serialize(new SnapshotBody
        {
            Steps = newSteps.Select(s => ProjectPlanMapping.ToDto(s, includeInternal: true)).ToList(),
            Milestones = newMilestones.Select(ProjectPlanMapping.ToDto).ToList()
        });

        var snapshot = new ProjectPlanSnapshot
        {
            ProjectId = request.ProjectId,
            OverallProgress = overall,
            BodyJson = bodyJson,
            ChangeNote = string.IsNullOrWhiteSpace(request.ChangeNote) ? null : request.ChangeNote!.Trim()
        };
        _db.ProjectPlanSnapshots.Add(snapshot);

        await _db.SaveChangesAsync(ct);

        var mediatorDto = new ProjectPlanDto
        {
            ProjectId = request.ProjectId,
            OverallProgress = overall,
            UpdatedAt = plan.UpdatedAt ?? plan.CreatedAt,
            UpdatedBy = _user.UserId,
            Steps = newSteps
                .OrderBy(s => s.ParentStepId.HasValue ? 1 : 0)
                .ThenBy(s => s.Order)
                .Select(s => ProjectPlanMapping.ToDto(s, includeInternal: true))
                .ToList(),
            Milestones = newMilestones.OrderBy(m => m.Type).ThenBy(m => m.Order).Select(ProjectPlanMapping.ToDto).ToList()
        };

        if (_user.UserId is Guid uid)
        {
            mediatorDto.UpdatedByName = await _db.Users.IgnoreQueryFilters()
                .Where(u => u.Id == uid)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(ct);
        }

        return mediatorDto;
    }

    /// <summary>
    /// ISO yıl-hafta etiketini kabul edilebilir bir forma getirir.
    /// "2025-W1", "2025-w1" → "2025-W01". Geçersizse null döner.
    /// </summary>
    private static string? NormalizeYearWeek(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        var s = v.Trim().ToUpperInvariant().Replace(" ", "");
        var m = System.Text.RegularExpressions.Regex.Match(s, @"^(\d{4})-W(\d{1,2})$");
        if (!m.Success) return null;
        var year = int.Parse(m.Groups[1].Value);
        var week = int.Parse(m.Groups[2].Value);
        if (year < 2000 || year > 2100) return null;
        if (week < 1 || week > 53) return null;
        return $"{year}-W{week:00}";
    }
}
