using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("users");
        b.HasKey(x => x.Id);
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
        b.Property(x => x.ExternalId).HasMaxLength(128);
        b.Property(x => x.PasswordHash).HasMaxLength(512);
        b.Property(x => x.UserType).HasConversion<int>();

        b.HasIndex(x => x.Email).IsUnique();
        b.HasIndex(x => x.ExternalId);

        b.HasOne(x => x.Customer)
            .WithMany(c => c.Users)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
