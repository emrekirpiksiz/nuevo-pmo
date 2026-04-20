using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ICurrentUser? _currentUser;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser? currentUser = null)
        : base(options)
    {
        _currentUser = currentUser;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<DocumentApproval> DocumentApprovals => Set<DocumentApproval>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentReply> CommentReplies => Set<CommentReply>();
    public DbSet<DocumentViewEvent> DocumentViewEvents => Set<DocumentViewEvent>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("pmo");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        ApplyGlobalFilters(modelBuilder);

        base.OnModelCreating(modelBuilder);
    }

    private void ApplyGlobalFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                Expression body = Expression.Equal(
                    Expression.Property(parameter, nameof(BaseEntity.IsDeleted)),
                    Expression.Constant(false));

                if (typeof(Project).IsAssignableFrom(entityType.ClrType))
                {
                    body = Expression.AndAlso(body, BuildProjectTenantFilter(parameter));
                }
                else if (typeof(User).IsAssignableFrom(entityType.ClrType))
                {
                    body = Expression.AndAlso(body, BuildUserTenantFilter(parameter));
                }
                else if (typeof(Invitation).IsAssignableFrom(entityType.ClrType))
                {
                    body = Expression.AndAlso(body, BuildInvitationTenantFilter(parameter));
                }
                else if (typeof(Customer).IsAssignableFrom(entityType.ClrType))
                {
                    body = Expression.AndAlso(body, BuildCustomerTenantFilter(parameter));
                }

                var lambda = Expression.Lambda(body, parameter);
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }
    }

    private Expression BuildProjectTenantFilter(ParameterExpression parameter)
    {
        var customerIdProp = Expression.Property(parameter, nameof(Project.CustomerId));
        return BuildTenantScopeExpression(customerIdProp);
    }

    private Expression BuildUserTenantFilter(ParameterExpression parameter)
    {
        var customerIdProp = Expression.Property(parameter, nameof(User.CustomerId));
        var isCustomer = _currentUser?.IsCustomer == true;
        if (!isCustomer) return Expression.Constant(true);
        var currentCustomerId = Expression.Constant(_currentUser?.CustomerId, typeof(Guid?));
        return Expression.Equal(customerIdProp, currentCustomerId);
    }

    private Expression BuildInvitationTenantFilter(ParameterExpression parameter)
    {
        var customerIdProp = Expression.Property(parameter, nameof(Invitation.CustomerId));
        return BuildTenantScopeExpression(customerIdProp, isNullable: false);
    }

    private Expression BuildCustomerTenantFilter(ParameterExpression parameter)
    {
        var idProp = Expression.Property(parameter, nameof(Customer.Id));
        var isCustomer = _currentUser?.IsCustomer == true;
        if (!isCustomer) return Expression.Constant(true);
        var currentCustomerId = Expression.Constant(_currentUser?.CustomerId ?? Guid.Empty, typeof(Guid));
        return Expression.Equal(idProp, currentCustomerId);
    }

    private Expression BuildTenantScopeExpression(Expression customerIdProp, bool isNullable = false)
    {
        var isCustomer = _currentUser?.IsCustomer == true;
        if (!isCustomer) return Expression.Constant(true);
        var currentCustomerId = _currentUser?.CustomerId ?? Guid.Empty;
        if (isNullable)
        {
            var target = Expression.Constant((Guid?)currentCustomerId, typeof(Guid?));
            return Expression.Equal(customerIdProp, target);
        }
        else
        {
            var target = Expression.Constant(currentCustomerId, typeof(Guid));
            return Expression.Equal(customerIdProp, target);
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditFields()
    {
        var now = DateTime.UtcNow;
        var userId = _currentUser?.UserId;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    if (entry.Entity.CreatedAt == default) entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy ??= userId;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userId;
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedAt = now;
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userId;
                    break;
            }
        }
    }
}
