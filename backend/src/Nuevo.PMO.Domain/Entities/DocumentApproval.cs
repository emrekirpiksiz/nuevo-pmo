using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class DocumentApproval : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    /// <summary>Hangi DocumentVersion onaylandı — snapshot.</summary>
    public Guid DocumentVersionId { get; set; }
    public DocumentVersion DocumentVersion { get; set; } = null!;

    public Guid ApprovedBy { get; set; }
    public User ApprovedByUser { get; set; } = null!;

    public DateTime ApprovedAt { get; set; } = DateTime.UtcNow;

    public string? Note { get; set; }
}
