using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();
}
