using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class DocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public int Major { get; set; }
    public int Minor { get; set; }
    public string VersionNumber => $"{Major}.{Minor}";

    public string ContentJson { get; set; } = "{}";
    public string ContentMarkdown { get; set; } = string.Empty;

    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid? PublishedBy { get; set; }

    public ICollection<DocumentApproval> Approvals { get; set; } = new List<DocumentApproval>();
}
