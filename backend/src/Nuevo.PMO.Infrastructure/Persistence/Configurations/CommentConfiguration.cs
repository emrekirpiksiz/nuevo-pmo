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

        b.HasOne(x => x.Document)
            .WithMany(d => d.Comments)
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Version)
            .WithMany()
            .HasForeignKey(x => x.VersionId)
            .OnDelete(DeleteBehavior.Restrict);
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
