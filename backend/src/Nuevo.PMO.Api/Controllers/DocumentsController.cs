using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Analytics;
using Nuevo.PMO.Application.Features.Documents;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IMediator _mediator;
    public DocumentsController(IMediator mediator) { _mediator = mediator; }

    [HttpGet("api/projects/{projectId:guid}/documents")]
    public async Task<ActionResult<List<DocumentDto>>> List(Guid projectId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentsByProjectQuery(projectId), ct));

    [HttpGet("api/documents/{id:guid}")]
    public async Task<ActionResult<DocumentDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentByIdQuery(id), ct));

    public record CreateDocumentBody(string Title, DocumentType Type);

    [HttpPost("api/projects/{projectId:guid}/documents")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<DocumentDto>> Create(Guid projectId, [FromBody] CreateDocumentBody body, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateDocumentCommand(projectId, body.Title, body.Type), ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    public record UpdateDocumentBody(string Title, DocumentType Type);

    [HttpPatch("api/documents/{id:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocumentBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateDocumentMetaCommand(id, body.Title, body.Type), ct);
        return NoContent();
    }

    [HttpDelete("api/documents/{id:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteDocumentCommand(id), ct);
        return NoContent();
    }

    [HttpGet("api/documents/{id:guid}/versions")]
    public async Task<ActionResult<List<DocumentVersionDto>>> Versions(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentVersionsQuery(id), ct));

    [HttpGet("api/documents/{id:guid}/versions/{versionId:guid}")]
    public async Task<ActionResult<DocumentVersionContentDto>> Version(Guid id, Guid versionId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentVersionContentQuery(id, versionId), ct));

    public record SaveContentBody(string ContentJson, string ContentMarkdown);

    [HttpPut("api/documents/{id:guid}/content")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<DocumentVersionDto>> SaveContent(Guid id, [FromBody] SaveContentBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SaveDocumentContentCommand(id, body.ContentJson, body.ContentMarkdown), ct));

    [HttpPost("api/documents/{id:guid}/versions/{versionId:guid}/publish")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Publish(Guid id, Guid versionId, CancellationToken ct)
    {
        await _mediator.Send(new PublishDocumentCommand(id, versionId), ct);
        return NoContent();
    }

    public record ApproveBody(string? Note);

    [HttpPost("api/documents/{id:guid}/versions/{versionId:guid}/approve")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<ActionResult<DocumentApprovalDto>> Approve(Guid id, Guid versionId, [FromBody] ApproveBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new ApproveDocumentVersionCommand(id, versionId, body.Note), ct));

    [HttpGet("api/documents/{id:guid}/approvals")]
    public async Task<ActionResult<List<DocumentApprovalDto>>> Approvals(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetApprovalsQuery(id), ct));

    [HttpGet("api/documents/{id:guid}/export.docx")]
    public async Task<IActionResult> ExportDocx(Guid id, [FromQuery] Guid? versionId, CancellationToken ct)
    {
        var r = await _mediator.Send(new ExportDocumentDocxQuery(id, versionId), ct);
        return File(r.Content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", r.FileName);
    }

    [HttpGet("api/admin/documents/{id:guid}/analytics")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<AnalyticsReportDto>> Analytics(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentAnalyticsQuery(id), ct));
}
