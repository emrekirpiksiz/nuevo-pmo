using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Proje bazlı, plan'dan bağımsız yayınlanan rapor. Haftalık/ara rapor
/// amacıyla N adet yayınlanabilir. Müşteri tarafında salt-okunur listelenir.
/// </summary>
public class ProjectReport : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    /// <summary>Raporun ait olduğu tarih (admin seçer; gün bazlı).</summary>
    public DateTime ReportDate { get; set; }

    /// <summary>0..100, opsiyonel. Admin raporda genel % bildirimini istiyorsa kullanır.</summary>
    public int? OverallProgress { get; set; }

    /// <summary>Rich text içerik (TipTap JSON, jsonb).</summary>
    public string ContentJson { get; set; } = "{}";

    /// <summary>Opsiyonel düz metin özet / highlight.</summary>
    public string? Summary { get; set; }
}
