using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Comments;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly IMediator _mediator;
    public CommentsController(IMediator mediator) { _mediator = mediator; }

    [HttpGet("api/documents/{documentId:guid}/comments")]
    public async Task<ActionResult<List<CommentDto>>> List(Guid documentId, [FromQuery] string? status, CancellationToken ct)
    {
        CommentStatus[]? statuses = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            statuses = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => Enum.TryParse<CommentStatus>(s, true, out var v) ? v : (CommentStatus?)null)
                .Where(v => v.HasValue).Select(v => v!.Value).ToArray();
        }
        return Ok(await _mediator.Send(new GetCommentsQuery(documentId, statuses), ct));
    }

    public record CreateCommentBody(Guid VersionId, string BlockId, string AnchorText, string Body);

    [HttpPost("api/documents/{documentId:guid}/comments")]
    public async Task<ActionResult<CommentDto>> Create(Guid documentId, [FromBody] CreateCommentBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateCommentCommand(documentId, body.VersionId, body.BlockId, body.AnchorText, body.Body), ct));

    public record UpdateBody(string Body);

    [HttpPatch("api/comments/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateCommentCommand(id, body.Body), ct);
        return NoContent();
    }

    [HttpDelete("api/comments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteCommentCommand(id), ct);
        return NoContent();
    }

    public record ReplyBody(string Body);

    [HttpPost("api/comments/{id:guid}/replies")]
    public async Task<ActionResult<CommentReplyDto>> Reply(Guid id, [FromBody] ReplyBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new AddReplyCommand(id, body.Body), ct));

    [HttpPatch("api/comments/{id:guid}/resolve")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ResolveCommentCommand(id), ct);
        return NoContent();
    }

    [HttpPatch("api/comments/{id:guid}/reopen")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Reopen(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new ReopenCommentCommand(id), ct);
        return NoContent();
    }
}
