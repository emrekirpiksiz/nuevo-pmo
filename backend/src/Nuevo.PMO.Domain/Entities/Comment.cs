using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

public class Comment : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public string BlockId { get; set; } = string.Empty;
    public string AnchorText { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public CommentStatus Status { get; set; } = CommentStatus.Open;

    /// <summary>
    /// Yorumun yapıldığı müşteri sürümü. Bilgi amaçlıdır — sürüm etiketi olarak
    /// gösterilir. Yayın akışı yorum durumunu değiştirmez.
    /// </summary>
    public Guid? ForVersionId { get; set; }
    public DocumentVersion? ForVersion { get; set; }

    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedBy { get; set; }

    public ICollection<CommentReply> Replies { get; set; } = new List<CommentReply>();
}
