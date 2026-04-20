using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class DocumentViewEvent : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public Guid DocumentVersionId { get; set; }
    public DocumentVersion DocumentVersion { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid SessionId { get; set; }

    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastHeartbeatAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public int DurationSeconds { get; set; } = 0;
}
