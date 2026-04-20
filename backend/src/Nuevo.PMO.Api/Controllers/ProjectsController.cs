using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Projects;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IMediator _mediator;
    public ProjectsController(IMediator mediator) { _mediator = mediator; }

    [HttpGet("api/projects")]
    public async Task<ActionResult<List<ProjectDto>>> List([FromQuery] Guid? customerId, [FromQuery] string? search, CancellationToken ct)
        => Ok(await _mediator.Send(new GetProjectsQuery(customerId, search), ct));

    [HttpGet("api/projects/{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetProjectByIdQuery(id), ct));

    [HttpGet("api/projects/{id:guid}/members")]
    public async Task<ActionResult<List<ProjectMemberDto>>> Members(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetProjectMembersQuery(id), ct));

    [HttpPost("api/admin/projects")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectCommand cmd, CancellationToken ct)
    {
        var result = await _mediator.Send(cmd, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    public record UpdateProjectBody(string Name, string? Description, ProjectStatus Status);

    [HttpPatch("api/admin/projects/{id:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateProjectCommand(id, body.Name, body.Description, body.Status), ct);
        return NoContent();
    }

    [HttpDelete("api/admin/projects/{id:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteProjectCommand(id), ct);
        return NoContent();
    }

    public record AddMemberBody(Guid UserId, ProjectRole Role);

    [HttpPost("api/admin/projects/{id:guid}/members")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<ProjectMemberDto>> AddMember(Guid id, [FromBody] AddMemberBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new AddProjectMemberCommand(id, body.UserId, body.Role), ct));

    [HttpDelete("api/admin/projects/{id:guid}/members/{userId:guid}")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await _mediator.Send(new RemoveProjectMemberCommand(id, userId), ct);
        return NoContent();
    }

    [HttpGet("api/admin/projects/{id:guid}/available-users")]
    [Authorize(Policy = "NuevoOnly")]
    public async Task<ActionResult<List<AvailableUserDto>>> AvailableUsers(Guid id, [FromQuery] string? search, CancellationToken ct)
        => Ok(await _mediator.Send(new SearchUsersForProjectQuery(id, search), ct));
}
