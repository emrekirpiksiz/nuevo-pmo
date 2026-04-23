using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Infrastructure.Persistence.Configurations;

public class ProjectPlanConfiguration : IEntityTypeConfiguration<ProjectPlan>
{
    public void Configure(EntityTypeBuilder<ProjectPlan> b)
    {
        b.ToTable("project_plans");
        b.HasKey(x => x.Id);

        b.HasIndex(x => x.ProjectId).IsUnique();

        b.HasOne(x => x.Project)
            .WithOne(p => p.Plan)
            .HasForeignKey<ProjectPlan>(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PlanStepConfiguration : IEntityTypeConfiguration<PlanStep>
{
    public void Configure(EntityTypeBuilder<PlanStep> b)
    {
        b.ToTable("plan_steps");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(256).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.Status).HasConversion<int>();
        b.Property(x => x.StartYearWeek).HasMaxLength(16);
        b.Property(x => x.EndYearWeek).HasMaxLength(16);
        b.Property(x => x.PlannedManDays).HasColumnType("numeric(8,2)");
        b.Property(x => x.ActualManDays).HasColumnType("numeric(8,2)");

        b.HasIndex(x => new { x.ProjectPlanId, x.Order });
        b.HasIndex(x => x.ParentStepId);

        b.HasOne(x => x.ProjectPlan)
            .WithMany(p => p.Steps)
            .HasForeignKey(x => x.ProjectPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Parent)
            .WithMany(x => x.Children)
            .HasForeignKey(x => x.ParentStepId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PlanMilestoneConfiguration : IEntityTypeConfiguration<PlanMilestone>
{
    public void Configure(EntityTypeBuilder<PlanMilestone> b)
    {
        b.ToTable("plan_milestones");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(256).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.Type).HasConversion<int>();
        b.Property(x => x.Status).HasConversion<int>();

        b.HasIndex(x => new { x.ProjectPlanId, x.Type, x.Order });

        b.HasOne(x => x.ProjectPlan)
            .WithMany(p => p.Milestones)
            .HasForeignKey(x => x.ProjectPlanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProjectPlanSnapshotConfiguration : IEntityTypeConfiguration<ProjectPlanSnapshot>
{
    public void Configure(EntityTypeBuilder<ProjectPlanSnapshot> b)
    {
        b.ToTable("project_plan_snapshots");
        b.HasKey(x => x.Id);
        b.Property(x => x.BodyJson).HasColumnType("jsonb").IsRequired();
        b.Property(x => x.ChangeNote).HasMaxLength(1000);

        b.HasIndex(x => new { x.ProjectId, x.CreatedAt });

        b.HasOne(x => x.Project)
            .WithMany(p => p.PlanSnapshots)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProjectReportConfiguration : IEntityTypeConfiguration<ProjectReport>
{
    public void Configure(EntityTypeBuilder<ProjectReport> b)
    {
        b.ToTable("project_reports");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(256).IsRequired();
        b.Property(x => x.Summary).HasMaxLength(2000);
        b.Property(x => x.ContentJson).HasColumnType("jsonb").IsRequired();

        b.HasIndex(x => new { x.ProjectId, x.ReportDate });

        b.HasOne(x => x.Project)
            .WithMany(p => p.Reports)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
