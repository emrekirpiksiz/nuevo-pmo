using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Project> Projects { get; }
    DbSet<ProjectMember> ProjectMembers { get; }
    DbSet<Document> Documents { get; }
    DbSet<DocumentVersion> DocumentVersions { get; }
    DbSet<DocumentApproval> DocumentApprovals { get; }
    DbSet<Comment> Comments { get; }
    DbSet<CommentReply> CommentReplies { get; }
    DbSet<DocumentViewEvent> DocumentViewEvents { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
