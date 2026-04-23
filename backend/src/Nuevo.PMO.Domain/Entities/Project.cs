using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

public class Project : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();

    public ProjectPlan? Plan { get; set; }
    public ICollection<ProjectPlanSnapshot> PlanSnapshots { get; set; } = new List<ProjectPlanSnapshot>();
    public ICollection<ProjectReport> Reports { get; set; } = new List<ProjectReport>();
}
