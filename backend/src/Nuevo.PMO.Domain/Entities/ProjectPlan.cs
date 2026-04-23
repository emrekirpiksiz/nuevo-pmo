using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Proje için tek canlı (düzenlenebilir) plan. Her proje 1:1 bir ProjectPlan'a
/// sahip olur. Her kaydetmede plan'dan bir ProjectPlanSnapshot üretilir.
/// </summary>
public class ProjectPlan : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public ICollection<PlanStep> Steps { get; set; } = new List<PlanStep>();
    public ICollection<PlanMilestone> Milestones { get; set; } = new List<PlanMilestone>();
}
