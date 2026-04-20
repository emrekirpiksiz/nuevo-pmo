using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Domain.Entities;

public class CommentReply : BaseEntity
{
    public Guid CommentId { get; set; }
    public Comment Comment { get; set; } = null!;

    public string Body { get; set; } = string.Empty;
}
