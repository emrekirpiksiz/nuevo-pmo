using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Kullanıcıya gönderilen uygulama içi bildirim. Hem inbox'ta listelenir
/// hem de çan ikonunda sayaç olarak gösterilir. Mail gönderimi ayrıca
/// <see cref="Nuevo.PMO.Application.Common.Interfaces.IEmailSender"/> ile yapılır.
/// </summary>
public class Notification : BaseEntity
{
    public Guid RecipientId { get; set; }
    public User Recipient { get; set; } = null!;

    public NotificationType Type { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid? DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid? CommentId { get; set; }
    public Comment? Comment { get; set; }

    /// <summary>Tıklandığında yönlendirilecek deep-link (örn. /admin/... veya /portal/...).</summary>
    public string? ActionUrl { get; set; }
}
