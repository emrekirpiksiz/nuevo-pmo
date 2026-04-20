using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Infrastructure.Persistence.Configurations;

public class DocumentViewEventConfiguration : IEntityTypeConfiguration<DocumentViewEvent>
{
    public void Configure(EntityTypeBuilder<DocumentViewEvent> b)
    {
        b.ToTable("document_view_events");
        b.HasKey(x => x.Id);

        b.HasIndex(x => new { x.DocumentId, x.DocumentVersionId });
        b.HasIndex(x => x.SessionId).IsUnique();
        b.HasIndex(x => x.UserId);

        b.HasOne(x => x.Document)
            .WithMany(d => d.ViewEvents)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.DocumentVersion)
            .WithMany()
            .HasForeignKey(x => x.DocumentVersionId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
