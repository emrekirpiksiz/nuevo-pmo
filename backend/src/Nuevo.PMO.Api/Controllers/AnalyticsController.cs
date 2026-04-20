using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Analytics;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
public class ViewEventsController : ControllerBase
{
    private readonly IMediator _mediator;
    public ViewEventsController(IMediator mediator) { _mediator = mediator; }

    public record StartViewBody(Guid VersionId);

    [HttpPost("api/documents/{documentId:guid}/views")]
    public async Task<ActionResult<StartViewResultDto>> Start(Guid documentId, [FromBody] StartViewBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new StartViewCommand(documentId, body.VersionId), ct));

    [HttpPost("api/documents/{documentId:guid}/views/{sessionId:guid}/heartbeat")]
    public async Task<IActionResult> Heartbeat(Guid documentId, Guid sessionId, CancellationToken ct)
    {
        await _mediator.Send(new HeartbeatCommand(documentId, sessionId), ct);
        return NoContent();
    }

    [HttpPost("api/documents/{documentId:guid}/views/{sessionId:guid}/close")]
    public async Task<IActionResult> Close(Guid documentId, Guid sessionId, CancellationToken ct)
    {
        await _mediator.Send(new CloseViewCommand(documentId, sessionId), ct);
        return NoContent();
    }
}
