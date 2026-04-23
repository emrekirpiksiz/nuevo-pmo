using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.ProjectReports;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/reports")]
public class ProjectReportsController : ControllerBase
{
    private readonly IMediator _mediator;
    public ProjectReportsController(IMediator mediator) { _mediator = mediator; }

    [HttpGet]
    public async Task<ActionResult<List<ProjectReportSummaryDto>>> List(Guid projectId, CancellationToken ct)
        => Ok(await _mediator.Send(new ListProjectReportsQuery(projectId), ct));

    [HttpGet("{reportId:guid}")]
    public async Task<ActionResult<ProjectReportDetailDto>> Get(Guid projectId, Guid reportId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetProjectReportQuery(projectId, reportId), ct));

    public record CreateReportBody(
        string Title,
        DateTime ReportDate,
        int? OverallProgress,
        string? Summary,
        string ContentJson
    );

    [HttpPost]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<ProjectReportDetailDto>> Create(Guid projectId, [FromBody] CreateReportBody body, CancellationToken ct)
    {
        var r = await _mediator.Send(new CreateProjectReportCommand(
            projectId,
            body.Title,
            body.ReportDate,
            body.OverallProgress,
            body.Summary,
            body.ContentJson
        ), ct);
        return CreatedAtAction(nameof(Get), new { projectId, reportId = r.Id }, r);
    }

    public record UpdateReportBody(
        string Title,
        DateTime ReportDate,
        int? OverallProgress,
        string? Summary,
        string ContentJson
    );

    [HttpPut("{reportId:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<ProjectReportDetailDto>> Update(Guid projectId, Guid reportId, [FromBody] UpdateReportBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateProjectReportCommand(
            projectId,
            reportId,
            body.Title,
            body.ReportDate,
            body.OverallProgress,
            body.Summary,
            body.ContentJson
        ), ct));

    [HttpDelete("{reportId:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Delete(Guid projectId, Guid reportId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteProjectReportCommand(projectId, reportId), ct);
        return NoContent();
    }

    /// <summary>
    /// Mevcut plan ve milestone durumundan haftalık rapor için doldurulmuş
    /// markdown şablonu döndürür. Rapor kaydedilmez — admin gerekirse düzenleyip
    /// normal create endpoint'iyle kaydeder.
    /// </summary>
    [HttpGet("template/weekly")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<WeeklyReportTemplateDto>> WeeklyTemplate(Guid projectId, CancellationToken ct)
        => Ok(await _mediator.Send(new GenerateWeeklyReportTemplateQuery(projectId), ct));
}
