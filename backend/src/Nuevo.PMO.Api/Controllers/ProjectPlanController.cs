using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.ProjectPlans;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/plan")]
public class ProjectPlanController : ControllerBase
{
    private readonly IMediator _mediator;
    public ProjectPlanController(IMediator mediator) { _mediator = mediator; }

    /// <summary>Projenin canlı plan halini (step + milestone) döndürür.</summary>
    [HttpGet]
    public async Task<ActionResult<ProjectPlanDto>> GetCurrent(Guid projectId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCurrentPlanQuery(projectId), ct));

    public record UpsertPlanBody(
        List<PlanStepInput> Steps,
        List<PlanMilestoneInput> Milestones,
        string? ChangeNote
    );

    /// <summary>
    /// Planı tam upsert eder: adım ve milestone listesi bütün olarak gelir,
    /// mevcut kayıtlar silinir, yenileri yazılır ve bir snapshot üretilir.
    /// </summary>
    [HttpPut]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<ProjectPlanDto>> Upsert(Guid projectId, [FromBody] UpsertPlanBody body, CancellationToken ct)
    {
        var r = await _mediator.Send(new UpsertPlanCommand(
            projectId,
            body.Steps ?? new List<PlanStepInput>(),
            body.Milestones ?? new List<PlanMilestoneInput>(),
            body.ChangeNote
        ), ct);
        return Ok(r);
    }

    /// <summary>Tarih bazlı plan snapshot özet listesi.</summary>
    [HttpGet("history")]
    public async Task<ActionResult<List<PlanSnapshotSummaryDto>>> History(Guid projectId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetPlanHistoryQuery(projectId), ct));

    /// <summary>Tek bir snapshot'ın tam detayı (donmuş step + milestone).</summary>
    [HttpGet("history/{snapshotId:guid}")]
    public async Task<ActionResult<PlanSnapshotDetailDto>> Snapshot(Guid projectId, Guid snapshotId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetPlanSnapshotQuery(projectId, snapshotId), ct));
}
