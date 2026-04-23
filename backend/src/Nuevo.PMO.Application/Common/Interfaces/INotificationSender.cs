using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Common.Interfaces;

/// <summary>
/// Bildirim altyapısı. Her alıcı için DB'ye <see cref="Notification"/> satırı ekler
/// ve ayrıca SMTP üzerinden e-posta gönderir. Mail hataları loglanır ve yutulur;
/// böylece ana akış (publish, comment create) bozulmaz.
/// </summary>
public interface INotificationSender
{
    Task SendAsync(
        IEnumerable<User> recipients,
        NotificationType type,
        string title,
        string body,
        string? actionUrl,
        Guid? projectId,
        Guid? documentId,
        Guid? commentId,
        CancellationToken ct = default);
}
