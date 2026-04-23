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

        b.Property(x => x.DraftContentJson).HasColumnType("jsonb").IsRequired();
        b.Property(x => x.DraftContentMarkdown).HasColumnType("text").IsRequired();

        b.HasIndex(x => x.ProjectId);

        b.HasOne(x => x.Project)
            .WithMany(p => p.Documents)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.CustomerVersion)
            .WithMany()
            .HasForeignKey(x => x.CustomerVersionId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

public class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> b)
    {
        b.ToTable("document_versions");
        b.HasKey(x => x.Id);

        b.Property(x => x.ContentJson).HasColumnType("jsonb").IsRequired();
        b.Property(x => x.ContentMarkdown).HasColumnType("text").IsRequired();
        b.Property(x => x.Label).HasMaxLength(256);

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

        b.HasIndex(x => x.DocumentId);
        b.HasIndex(x => new { x.DocumentVersionId, x.ApprovedBy }).IsUnique();

        b.HasOne(x => x.Document)
            .WithMany(d => d.Approvals)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.DocumentVersion)
            .WithMany()
            .HasForeignKey(x => x.DocumentVersionId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.ApprovedByUser)
            .WithMany()
            .HasForeignKey(x => x.ApprovedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
