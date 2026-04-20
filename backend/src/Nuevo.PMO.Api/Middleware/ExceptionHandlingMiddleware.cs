using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Domain.Common;

namespace Nuevo.PMO.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException vex)
        {
            await WriteProblem(context, StatusCodes.Status400BadRequest, "Validation failed",
                "One or more validation errors occurred.", errors: vex.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray()));
        }
        catch (NotFoundException nex)
        {
            await WriteProblem(context, StatusCodes.Status404NotFound, "Not Found", nex.Message);
        }
        catch (ForbiddenException fex)
        {
            await WriteProblem(context, StatusCodes.Status403Forbidden, "Forbidden", fex.Message);
        }
        catch (DomainException dex)
        {
            await WriteProblem(context, StatusCodes.Status422UnprocessableEntity, dex.Code, dex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteProblem(context, StatusCodes.Status500InternalServerError, "Server Error",
                _env.IsDevelopment() ? ex.ToString() : "Internal server error.");
        }
    }

    private static async Task WriteProblem(HttpContext context, int status, string title, string detail, IDictionary<string, string[]>? errors = null)
    {
        if (context.Response.HasStarted) return;
        var traceId = context.Items["CorrelationId"] as string ?? context.TraceIdentifier;
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["traceId"] = traceId;
        if (errors is not null) problem.Extensions["errors"] = errors;

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}
