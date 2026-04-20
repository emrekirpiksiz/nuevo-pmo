using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class Invitation : BaseEntity
{
    public string Email { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public Guid? AcceptedUserId { get; set; }
    public User? AcceptedUser { get; set; }
}
