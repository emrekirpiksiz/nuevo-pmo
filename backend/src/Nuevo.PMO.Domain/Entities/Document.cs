using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

public class Document : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public DocumentType Type { get; set; } = DocumentType.Analysis;

    /// <summary>
    /// Şu ana kadar yayınlanmış müşteri sürümlerinin sayısı (her Publish +1).
    /// İlk yayından önce 0 olarak kalır.
    /// </summary>
    public int CurrentMajor { get; set; } = 0;

    /// <summary>Admin'in çalıştığı canlı taslak içeriği (henüz yayınlanmamış).</summary>
    public string DraftContentJson { get; set; } = "{}";
    public string DraftContentMarkdown { get; set; } = string.Empty;
    public DateTime? DraftUpdatedAt { get; set; }
    public Guid? DraftUpdatedBy { get; set; }

    /// <summary>Son yayınlanmış müşteri sürümü.</summary>
    public Guid? CustomerVersionId { get; set; }
    public DocumentVersion? CustomerVersion { get; set; }
    public DateTime? CustomerVersionMarkedAt { get; set; }
    public Guid? CustomerVersionMarkedBy { get; set; }

    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<DocumentApproval> Approvals { get; set; } = new List<DocumentApproval>();
    public ICollection<DocumentViewEvent> ViewEvents { get; set; } = new List<DocumentViewEvent>();
    public ICollection<DocumentBlockChange> BlockChanges { get; set; } = new List<DocumentBlockChange>();
}
