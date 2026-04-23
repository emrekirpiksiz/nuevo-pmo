using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Documents;

public class DocumentDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DocumentType Type { get; set; }

    /// <summary>
    /// Şu ana kadar yayınlanmış müşteri sürümlerinin sayısı (her Publish +1).
    /// İlk yayın öncesi 0 olarak kalır.
    /// </summary>
    public int CurrentMajor { get; set; }

    /// <summary>Müşterinin göreceği sürüm (yayınlanmış). İlk yayın öncesi null.</summary>
    public Guid? CustomerVersionId { get; set; }
    public int? CustomerMajor { get; set; }
    public string? CustomerDisplay => CustomerMajor is null ? null : $"v{CustomerMajor}.0";
    public DateTime? CustomerVersionMarkedAt { get; set; }

    /// <summary>Taslak, ilk yayından sonra yayınlanan sürümden farklı içerik barındırabilir.</summary>
    public bool HasDraftChanges { get; set; }
    public DateTime? DraftUpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public int OpenCommentCount { get; set; }
    public int ApprovalCount { get; set; }
    public DateTime? LastApprovedAt { get; set; }
}

/// <summary>
/// Yayınlanmış bir müşteri sürümü (Major.0). Minor sürüm kavramı UI'dan kaldırıldı.
/// </summary>
public class DocumentVersionDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int Major { get; set; }
    public string Display => $"v{Major}.0";
    public string? Label { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
}

/// <summary>
/// Admin için taslak içeriği; customer için en son yayın içeriği döner.
/// </summary>
public class DocumentContentDto
{
    public Guid DocumentId { get; set; }
    /// <summary>Döndürülen içerik yayınlanmış bir sürüme mi (customer) yoksa taslağa mı (admin) ait.</summary>
    public bool IsDraft { get; set; }
    public Guid? VersionId { get; set; }
    public int? VersionMajor { get; set; }
    public string ContentJson { get; set; } = "{}";
    public string ContentMarkdown { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
}

public class DocumentApprovalDto
{
    public Guid Id { get; set; }
    public Guid DocumentVersionId { get; set; }
    public int VersionMajor { get; set; }
    public string VersionDisplay => $"v{VersionMajor}.0";
    public Guid ApprovedBy { get; set; }
    public string ApprovedByName { get; set; } = string.Empty;
    public DateTime ApprovedAt { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Bir müşteri sürümü yayınlandığında kaydedilen blok değişiklikleri.
/// "Değişiklikler" sekmesi bu listeyi gösterir.
/// </summary>
public class DocumentBlockChangeDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public Guid? FromVersionId { get; set; }
    public int? FromVersionMajor { get; set; }
    public Guid ToVersionId { get; set; }
    public int ToVersionMajor { get; set; }
    /// <summary>Bu yayını gerçekleştiren kullanıcı (ToVersion.CreatedBy).</summary>
    public Guid? PublishedBy { get; set; }
    public string? PublishedByName { get; set; }
    /// <summary>Yayın zamanı (ToVersion.CreatedAt).</summary>
    public DateTime PublishedAt { get; set; }
    public string BlockId { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty; // Added/Modified/Removed
    public string? OldText { get; set; }
    public string? NewText { get; set; }
    public Guid? RelatedCommentId { get; set; }
    public string? RelatedCommentBody { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
}
