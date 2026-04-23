using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Infrastructure.Persistence.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> b)
    {
        b.ToTable("comments");
        b.HasKey(x => x.Id);
        b.Property(x => x.BlockId).HasMaxLength(64).IsRequired();
        b.Property(x => x.AnchorText).HasMaxLength(1024);
        b.Property(x => x.Body).HasMaxLength(4000).IsRequired();
        b.Property(x => x.Status).HasConversion<int>();

        b.HasIndex(x => new { x.DocumentId, x.BlockId });
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.ForVersionId);

        b.HasOne(x => x.Document)
            .WithMany(d => d.Comments)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.ForVersion)
            .WithMany()
            .HasForeignKey(x => x.ForVersionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class CommentReplyConfiguration : IEntityTypeConfiguration<CommentReply>
{
    public void Configure(EntityTypeBuilder<CommentReply> b)
    {
        b.ToTable("comment_replies");
        b.HasKey(x => x.Id);
        b.Property(x => x.Body).HasMaxLength(4000).IsRequired();

        b.HasOne(x => x.Comment)
            .WithMany(c => c.Replies)
            .HasForeignKey(x => x.CommentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DocumentBlockChangeConfiguration : IEntityTypeConfiguration<DocumentBlockChange>
{
    public void Configure(EntityTypeBuilder<DocumentBlockChange> b)
    {
        b.ToTable("document_block_changes");
        b.HasKey(x => x.Id);

        b.Property(x => x.BlockId).HasMaxLength(64).IsRequired();
        b.Property(x => x.Kind).HasConversion<int>();
        // Tam blok metni saklanır (trim edilerek). Sayfa uzun olabileceği için
        // boyut limitini yüksek tutuyoruz.
        b.Property(x => x.OldText).HasMaxLength(8192);
        b.Property(x => x.NewText).HasMaxLength(8192);

        b.HasIndex(x => new { x.DocumentId, x.ToVersionId });
        b.HasIndex(x => x.RelatedCommentId);

        b.HasOne(x => x.Document)
            .WithMany(d => d.BlockChanges)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.FromVersion)
            .WithMany()
            .HasForeignKey(x => x.FromVersionId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne(x => x.ToVersion)
            .WithMany()
            .HasForeignKey(x => x.ToVersionId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.RelatedComment)
            .WithMany()
            .HasForeignKey(x => x.RelatedCommentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
