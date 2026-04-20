using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

public class ProjectMember : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ProjectRole Role { get; set; }
}
