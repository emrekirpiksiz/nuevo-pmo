using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public enum BlockChangeKind
{
    Added = 1,
    Modified = 2,
    Removed = 3
}

/// <summary>
/// Bir müşteri sürümü yayınlandığında, önceki sürüme göre doküman içinde
/// eklenen / değiştirilen / silinen her blok için bir audit kaydı.
/// "Değişiklikler" paneli bu tabloyu okur.
/// </summary>
public class DocumentBlockChange : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    /// <summary>Karşılaştırmanın "önceki" tarafı — önceki müşteri sürümü.</summary>
    public Guid? FromVersionId { get; set; }
    public DocumentVersion? FromVersion { get; set; }

    /// <summary>Karşılaştırmanın "yeni" tarafı — bu değişikliklerin çıktığı yayınlanan sürüm.</summary>
    public Guid ToVersionId { get; set; }
    public DocumentVersion ToVersion { get; set; } = null!;

    /// <summary>Added/Modified için yeni bloğun ID'si; Removed için önceki bloğun ID'si.</summary>
    public string BlockId { get; set; } = string.Empty;

    /// <summary>Önceki sürümdeki metin. Added için null/boş.</summary>
    public string? OldText { get; set; }

    /// <summary>Yeni sürümdeki metin. Removed için null/boş.</summary>
    public string? NewText { get; set; }

    public BlockChangeKind Kind { get; set; }

    /// <summary>Bu değişikliğin bir yorumu "addressed" ettiği durumlarda yorumun referansı.</summary>
    public Guid? RelatedCommentId { get; set; }
    public Comment? RelatedComment { get; set; }
}
