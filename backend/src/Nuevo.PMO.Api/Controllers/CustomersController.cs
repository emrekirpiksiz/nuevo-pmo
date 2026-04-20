using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Customers;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Route("api/admin/customers")]
[Authorize(Policy = "NuevoOnly")]
public class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;
    public CustomersController(IMediator mediator) { _mediator = mediator; }

    [HttpGet]
    public async Task<ActionResult<List<CustomerDto>>> List([FromQuery] string? search, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCustomersQuery(search), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCustomerByIdQuery(id), ct));

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerCommand cmd, CancellationToken ct)
    {
        var result = await _mediator.Send(cmd, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    public record UpdateCustomerBody(string Name, string ContactEmail);

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateCustomerCommand(id, body.Name, body.ContactEmail), ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteCustomerCommand(id), ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/users")]
    public async Task<ActionResult<List<CustomerUserDto>>> GetUsers(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCustomerUsersQuery(id), ct));

    public record InviteBody(string Email);

    [HttpPost("{id:guid}/invitations")]
    public async Task<ActionResult<InvitationResultDto>> Invite(Guid id, [FromBody] InviteBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateInvitationCommand(id, body.Email), ct));
}
