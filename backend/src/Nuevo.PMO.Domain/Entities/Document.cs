using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

public class Document : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public DocumentType Type { get; set; } = DocumentType.Analysis;

    public Guid? CurrentDraftVersionId { get; set; }
    public DocumentVersion? CurrentDraftVersion { get; set; }

    public Guid? PublishedVersionId { get; set; }
    public DocumentVersion? PublishedVersion { get; set; }

    public Guid? ApprovedVersionId { get; set; }
    public DocumentVersion? ApprovedVersion { get; set; }

    public int PublishedCount { get; set; } = 0;

    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<DocumentViewEvent> ViewEvents { get; set; } = new List<DocumentViewEvent>();
}
