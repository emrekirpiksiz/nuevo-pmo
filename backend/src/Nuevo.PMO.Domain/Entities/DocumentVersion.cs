using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Doküman sürümü. Numara gösterimi: "{Major}.{Minor}" (ör. 0.12, 1.0, 1.3).
/// - İç (admin) sürümler: Major = mevcut CurrentMajor, Minor = 1,2,3...
/// - Müşteri versiyonu olarak işaretlendiğinde: o sürümün Major/Minor'ü yeniden
///   yazılır → Major = CurrentMajor+1, Minor = 0 (ör. 1.0, 2.0).
/// </summary>
public class DocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public int Major { get; set; }
    public int Minor { get; set; }

    public string ContentJson { get; set; } = "{}";
    public string ContentMarkdown { get; set; } = string.Empty;

    /// <summary>Opsiyonel açıklama.</summary>
    public string? Label { get; set; }
}
