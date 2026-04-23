using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Canlı planın bir kayıt anında alınan tam snapshot'ı. Müşteri tarih bazlı
/// geçmişe bakabilsin diye BodyJson içinde adımlar + milestone'lar donmuş
/// halde saklanır.
/// </summary>
public class ProjectPlanSnapshot : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    /// <summary>Snapshot oluşturulduğu anda hesaplanmış 0..100 yüzde.</summary>
    public int OverallProgress { get; set; }

    /// <summary>
    /// Snapshot gövdesi (jsonb). Steps + milestones + metadata bu alanda
    /// donmuş olarak tutulur — BodyJson şeması zamanla değişebilir.
    /// </summary>
    public string BodyJson { get; set; } = "{}";

    /// <summary>Admin'in opsiyonel "bu versiyonda değişen" notu.</summary>
    public string? ChangeNote { get; set; }
}
