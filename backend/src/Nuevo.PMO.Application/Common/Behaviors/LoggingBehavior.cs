using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;
using Nuevo.PMO.Application.Common.Interfaces;

namespace Nuevo.PMO.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUser _currentUser;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger, ICurrentUser currentUser)
    {
        _logger = logger;
        _currentUser = currentUser;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var name = typeof(TRequest).Name;
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("[MediatR] Handling {Request} User={UserId} Corr={CorrelationId}",
            name, _currentUser.UserId, _currentUser.CorrelationId);
        try
        {
            var response = await next(cancellationToken);
            _logger.LogInformation("[MediatR] Handled {Request} in {Elapsed}ms", name, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[MediatR] Failed {Request} after {Elapsed}ms", name, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
