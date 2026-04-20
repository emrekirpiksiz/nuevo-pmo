using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Infrastructure.Persistence.Configurations;

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.ToTable("documents");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(256).IsRequired();
        b.Property(x => x.Type).HasConversion<int>();

        b.HasIndex(x => x.ProjectId);

        b.HasOne(x => x.Project)
            .WithMany(p => p.Documents)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.CurrentDraftVersion)
            .WithMany()
            .HasForeignKey(x => x.CurrentDraftVersionId)
            .OnDelete(DeleteBehavior.NoAction);

        b.HasOne(x => x.PublishedVersion)
            .WithMany()
            .HasForeignKey(x => x.PublishedVersionId)
            .OnDelete(DeleteBehavior.NoAction);

        b.HasOne(x => x.ApprovedVersion)
            .WithMany()
            .HasForeignKey(x => x.ApprovedVersionId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

public class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> b)
    {
        b.ToTable("document_versions");
        b.HasKey(x => x.Id);
        b.Property(x => x.ContentJson).HasColumnType("jsonb");
        b.Property(x => x.ContentMarkdown).HasColumnType("text");
        b.Ignore(x => x.VersionNumber);

        b.HasIndex(x => new { x.DocumentId, x.Major, x.Minor }).IsUnique();

        b.HasOne(x => x.Document)
            .WithMany(d => d.Versions)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DocumentApprovalConfiguration : IEntityTypeConfiguration<DocumentApproval>
{
    public void Configure(EntityTypeBuilder<DocumentApproval> b)
    {
        b.ToTable("document_approvals");
        b.HasKey(x => x.Id);
        b.Property(x => x.Note).HasMaxLength(2000);

        b.HasIndex(x => new { x.DocumentVersionId, x.ApprovedBy }).IsUnique();

        b.HasOne(x => x.DocumentVersion)
            .WithMany(v => v.Approvals)
            .HasForeignKey(x => x.DocumentVersionId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.ApprovedByUser)
            .WithMany()
            .HasForeignKey(x => x.ApprovedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
