using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Domain.Entities;

namespace Nuevo.PMO.Application.Common.Behaviors;

public interface IAuditableCommand
{
    string AuditAction { get; }
    string? AuditEntityType { get; }
    string? AuditEntityId { get; }
}

public class AuditBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<AuditBehavior<TRequest, TResponse>> _logger;

    public AuditBehavior(IAppDbContext db, ICurrentUser currentUser, ILogger<AuditBehavior<TRequest, TResponse>> logger)
    {
        _db = db;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is not IAuditableCommand auditable)
        {
            return await next(cancellationToken);
        }

        var response = await next(cancellationToken);
        try
        {
            var log = new AuditLog
            {
                UserId = _currentUser.UserId,
                UserEmail = _currentUser.Email,
                Action = auditable.AuditAction,
                EntityType = auditable.AuditEntityType ?? typeof(TRequest).Name,
                EntityId = auditable.AuditEntityId,
                AfterJson = SafeSerialize(request),
                IpAddress = _currentUser.IpAddress,
                UserAgent = _currentUser.UserAgent,
                CorrelationId = _currentUser.CorrelationId
            };
            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Audit log write failed for {Action}", auditable.AuditAction);
        }
        return response;
    }

    private static string? SafeSerialize(object obj)
    {
        try
        {
            return JsonSerializer.Serialize(obj, new JsonSerializerOptions { WriteIndented = false });
        }
        catch
        {
            return null;
        }
    }
}
