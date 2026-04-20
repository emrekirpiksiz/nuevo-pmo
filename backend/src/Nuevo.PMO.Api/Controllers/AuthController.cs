using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nuevo.PMO.Application.Features.Auth;

namespace Nuevo.PMO.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator) { _mediator = mediator; }

    [HttpPost("o365/login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> O365Login([FromBody] O365LoginCommand cmd, CancellationToken ct)
        => Ok(await _mediator.Send(cmd, ct));

    public class O365RedirectRequest
    {
        public string State { get; set; } = string.Empty;
        public string CodeVerifier { get; set; } = string.Empty;
    }

    [HttpPost("o365/redirect-url")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> O365Redirect([FromBody] O365RedirectRequest req, CancellationToken ct)
    {
        var url = await _mediator.Send(new GetO365RedirectQuery(req.State, req.CodeVerifier), ct);
        return Ok(new { url });
    }

    [HttpPost("customer/login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> CustomerLogin([FromBody] CustomerLoginCommand cmd, CancellationToken ct)
        => Ok(await _mediator.Send(cmd, ct));

    [HttpPost("invite/accept")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> AcceptInvite([FromBody] AcceptInvitationCommand cmd, CancellationToken ct)
        => Ok(await _mediator.Send(cmd, ct));

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserSummaryDto>> Me(CancellationToken ct)
        => Ok(await _mediator.Send(new GetMeQuery(), ct));

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();

    [HttpPost("dev/login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> DevLogin([FromBody] DevLoginCommand cmd, IWebHostEnvironment env, CancellationToken ct)
    {
        if (!env.IsDevelopment()) return NotFound();
        return Ok(await _mediator.Send(cmd, ct));
    }
}
