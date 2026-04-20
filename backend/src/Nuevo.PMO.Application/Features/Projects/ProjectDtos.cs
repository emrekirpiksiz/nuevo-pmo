using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Projects;

public class ProjectDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int DocumentCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectMemberDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public UserType UserType { get; set; }
    public ProjectRole Role { get; set; }
}
