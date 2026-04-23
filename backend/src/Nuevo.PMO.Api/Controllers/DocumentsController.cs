using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Analytics;
using Nuevo.PMO.Application.Features.AuditLogs;
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
        var r = await _mediator.Send(new CreateDocumentCommand(projectId, body.Title, body.Type), ct);
        return CreatedAtAction(nameof(Get), new { id = r.Id }, r);
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

    // ---------- Content (admin=draft, customer=published) ----------
    [HttpGet("api/documents/{id:guid}/content")]
    public async Task<ActionResult<DocumentContentDto>> Content(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentContentQuery(id), ct));

    public record SaveBody(string ContentJson, string ContentMarkdown);

    /// <summary>Admin taslağını günceller.</summary>
    [HttpPost("api/documents/{id:guid}/save")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<DocumentDto>> Save(Guid id, [FromBody] SaveBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new SaveDocumentCommand(id, body.ContentJson, body.ContentMarkdown), ct));

    public record PublishBody(string? Label);

    /// <summary>Taslağı yeni bir müşteri sürümü olarak yayınlar.</summary>
    [HttpPost("api/documents/{id:guid}/publish")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<DocumentDto>> Publish(Guid id, [FromBody] PublishBody? body, CancellationToken ct)
        => Ok(await _mediator.Send(new PublishCustomerVersionCommand(id, body?.Label), ct));

    // ---------- Changes (değişiklikler paneli) ----------
    [HttpGet("api/documents/{id:guid}/changes")]
    public async Task<ActionResult<List<DocumentBlockChangeDto>>> Changes(Guid id, [FromQuery] Guid? versionId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetBlockChangesQuery(id, versionId), ct));

    // ---------- Approval ----------
    public record ApproveBody(string? Note);

    [HttpPost("api/documents/{id:guid}/approve")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<ActionResult<DocumentApprovalDto>> Approve(Guid id, [FromBody] ApproveBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new ApproveDocumentCommand(id, body.Note), ct));

    [HttpGet("api/documents/{id:guid}/approvals")]
    public async Task<ActionResult<List<DocumentApprovalDto>>> Approvals(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetApprovalsQuery(id), ct));

    // ---------- Export ----------
    [HttpGet("api/documents/{id:guid}/export.docx")]
    public async Task<IActionResult> ExportDocx(Guid id, CancellationToken ct = default)
    {
        var r = await _mediator.Send(new ExportDocumentDocxQuery(id), ct);
        return File(r.Content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", r.FileName);
    }

    // ---------- Analytics & Audit ----------
    [HttpGet("api/admin/documents/{id:guid}/analytics")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<AnalyticsReportDto>> Analytics(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetDocumentAnalyticsQuery(id), ct));

    [HttpGet("api/admin/documents/{id:guid}/audit-logs")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<List<AuditLogDto>>> AuditLogs(Guid id, [FromQuery] int take = 200, CancellationToken ct = default)
        => Ok(await _mediator.Send(new GetDocumentAuditLogsQuery(id, take), ct));
}
