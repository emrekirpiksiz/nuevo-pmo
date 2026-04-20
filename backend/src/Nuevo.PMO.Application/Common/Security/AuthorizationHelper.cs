using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Common.Security;

public static class AuthorizationHelper
{
    public static async Task<bool> CanAccessProjectAsync(IAppDbContext db, ICurrentUser user, Guid projectId, CancellationToken ct = default)
    {
        if (!user.IsAuthenticated || user.UserId is null) return false;
        if (user.IsNuevo)
        {
            return await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.UserId, ct)
                || await db.Projects.IgnoreQueryFilters().AnyAsync(p => p.Id == projectId && !p.IsDeleted, ct);
        }
        if (user.IsCustomer)
        {
            var project = await db.Projects.IgnoreQueryFilters()
                .Where(p => p.Id == projectId && !p.IsDeleted)
                .Select(p => new { p.CustomerId })
                .FirstOrDefaultAsync(ct);
            if (project is null || project.CustomerId != user.CustomerId) return false;
            return await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.UserId, ct);
        }
        return false;
    }

    public static void EnsureNuevo(ICurrentUser user)
    {
        if (!user.IsAuthenticated || !user.IsNuevo)
            throw new ForbiddenException("Nuevo user required.");
    }

    public static void EnsureAuthenticated(ICurrentUser user)
    {
        if (!user.IsAuthenticated)
            throw new ForbiddenException("Authentication required.");
    }

    public static async Task EnsureProjectAccessAsync(IAppDbContext db, ICurrentUser user, Guid projectId, CancellationToken ct = default)
    {
        if (!await CanAccessProjectAsync(db, user, projectId, ct))
            throw new ForbiddenException("You do not have access to this project.");
    }

    public static async Task EnsureDocumentAccessAsync(IAppDbContext db, ICurrentUser user, Guid documentId, CancellationToken ct = default)
    {
        var projectId = await db.Documents.IgnoreQueryFilters()
            .Where(d => d.Id == documentId && !d.IsDeleted)
            .Select(d => d.ProjectId)
            .FirstOrDefaultAsync(ct);
        if (projectId == Guid.Empty) throw new NotFoundException("Document", documentId);
        await EnsureProjectAccessAsync(db, user, projectId, ct);
    }
}
