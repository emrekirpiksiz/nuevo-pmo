using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Kritik yol üzerindeki veya müşteriden beklenen iş kalemlerini temsil eden
/// milestone. Plan timeline'ından ayrı olarak kendi panelinde listelenir.
/// </summary>
public class PlanMilestone : BaseEntity
{
    public Guid ProjectPlanId { get; set; }
    public ProjectPlan ProjectPlan { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public PlanMilestoneType Type { get; set; } = PlanMilestoneType.CriticalPath;
    public PlanMilestoneStatus Status { get; set; } = PlanMilestoneStatus.Pending;

    public DateTime? Deadline { get; set; }
    public DateTime? CompletedAt { get; set; }

    public int Order { get; set; }
}
