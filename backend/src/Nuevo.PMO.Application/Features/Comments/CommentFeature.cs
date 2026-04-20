using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nuevo.PMO.Application.Common.Behaviors;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Application.Common.Security;
using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Entities;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Comments;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public Guid VersionId { get; set; }
    public string VersionNumber { get; set; } = string.Empty;
    public string BlockId { get; set; } = string.Empty;
    public string AnchorText { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public CommentStatus Status { get; set; }
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedBy { get; set; }
    public string? ResolvedByName { get; set; }
    public List<CommentReplyDto> Replies { get; set; } = new();
}

public class CommentReplyDto
{
    public Guid Id { get; set; }
    public Guid CommentId { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public record GetCommentsQuery(Guid DocumentId, CommentStatus[]? Statuses) : IRequest<List<CommentDto>>;

public class GetCommentsHandler : IRequestHandler<GetCommentsQuery, List<CommentDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public GetCommentsHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<List<CommentDto>> Handle(GetCommentsQuery request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var q = _db.Comments
            .Include(c => c.Version)
            .Include(c => c.Replies)
            .Where(c => c.DocumentId == request.DocumentId);

        if (request.Statuses is { Length: > 0 })
            q = q.Where(c => request.Statuses.Contains(c.Status));

        var list = await q.OrderByDescending(c => c.CreatedAt).ToListAsync(ct);

        var userIds = list.Select(c => c.CreatedBy ?? Guid.Empty)
            .Concat(list.Select(c => c.ResolvedBy ?? Guid.Empty))
            .Concat(list.SelectMany(c => c.Replies.Select(r => r.CreatedBy ?? Guid.Empty)))
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var userMap = await _db.Users.IgnoreQueryFilters()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct);

        return list.Select(c => new CommentDto
        {
            Id = c.Id,
            DocumentId = c.DocumentId,
            VersionId = c.VersionId,
            VersionNumber = $"{c.Version.Major}.{c.Version.Minor}",
            BlockId = c.BlockId,
            AnchorText = c.AnchorText,
            Body = c.Body,
            Status = c.Status,
            CreatedBy = c.CreatedBy ?? Guid.Empty,
            CreatedByName = c.CreatedBy is Guid id && userMap.TryGetValue(id, out var n) ? n : "",
            CreatedAt = c.CreatedAt,
            ResolvedAt = c.ResolvedAt,
            ResolvedBy = c.ResolvedBy,
            ResolvedByName = c.ResolvedBy is Guid rid && userMap.TryGetValue(rid, out var rn) ? rn : null,
            Replies = c.Replies.OrderBy(r => r.CreatedAt).Select(r => new CommentReplyDto
            {
                Id = r.Id,
                CommentId = r.CommentId,
                Body = r.Body,
                CreatedBy = r.CreatedBy ?? Guid.Empty,
                CreatedByName = r.CreatedBy is Guid rcid && userMap.TryGetValue(rcid, out var rcn) ? rcn : "",
                CreatedAt = r.CreatedAt
            }).ToList()
        }).ToList();
    }
}

public record CreateCommentCommand(Guid DocumentId, Guid VersionId, string BlockId, string AnchorText, string Body) : IRequest<CommentDto>, IAuditableCommand
{
    public string AuditAction => "CommentCreated";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId { get; set; }
}

public class CreateCommentValidator : AbstractValidator<CreateCommentCommand>
{
    public CreateCommentValidator()
    {
        RuleFor(x => x.DocumentId).NotEmpty();
        RuleFor(x => x.VersionId).NotEmpty();
        RuleFor(x => x.BlockId).NotEmpty().MaximumLength(64);
        RuleFor(x => x.AnchorText).MaximumLength(1024);
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

public class CreateCommentHandler : IRequestHandler<CreateCommentCommand, CommentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public CreateCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<CommentDto> Handle(CreateCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, request.DocumentId, ct);

        var version = await _db.DocumentVersions.FirstOrDefaultAsync(v => v.Id == request.VersionId && v.DocumentId == request.DocumentId, ct)
            ?? throw new NotFoundException("DocumentVersion", request.VersionId);

        if (_user.IsCustomer && !version.IsPublished)
            throw new ForbiddenException("Customers can only comment on published versions.");

        var cmt = new Comment
        {
            DocumentId = request.DocumentId,
            VersionId = version.Id,
            BlockId = request.BlockId.Trim(),
            AnchorText = (request.AnchorText ?? string.Empty).Trim(),
            Body = request.Body.Trim(),
            Status = CommentStatus.Open
        };
        _db.Comments.Add(cmt);
        await _db.SaveChangesAsync(ct);

        var me = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == _user.UserId, ct);
        return new CommentDto
        {
            Id = cmt.Id,
            DocumentId = cmt.DocumentId,
            VersionId = cmt.VersionId,
            VersionNumber = $"{version.Major}.{version.Minor}",
            BlockId = cmt.BlockId,
            AnchorText = cmt.AnchorText,
            Body = cmt.Body,
            Status = cmt.Status,
            CreatedBy = _user.UserId ?? Guid.Empty,
            CreatedByName = me?.DisplayName ?? "",
            CreatedAt = cmt.CreatedAt
        };
    }
}

public record UpdateCommentCommand(Guid Id, string Body) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentUpdated";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class UpdateCommentValidator : AbstractValidator<UpdateCommentCommand>
{
    public UpdateCommentValidator()
    {
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

public class UpdateCommentHandler : IRequestHandler<UpdateCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public UpdateCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(UpdateCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        if (cmt.CreatedBy != _user.UserId && !_user.IsNuevo)
            throw new ForbiddenException("You can only edit your own comments.");

        cmt.Body = request.Body.Trim();
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record DeleteCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentDeleted";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class DeleteCommentHandler : IRequestHandler<DeleteCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public DeleteCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(DeleteCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        if (cmt.CreatedBy != _user.UserId && !_user.IsNuevo)
            throw new ForbiddenException("You can only delete your own comments.");

        _db.Comments.Remove(cmt);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record AddReplyCommand(Guid CommentId, string Body) : IRequest<CommentReplyDto>, IAuditableCommand
{
    public string AuditAction => "CommentReplyAdded";
    public string? AuditEntityType => "CommentReply";
    public string? AuditEntityId => CommentId.ToString();
}

public class AddReplyValidator : AbstractValidator<AddReplyCommand>
{
    public AddReplyValidator()
    {
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

public class AddReplyHandler : IRequestHandler<AddReplyCommand, CommentReplyDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public AddReplyHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<CommentReplyDto> Handle(AddReplyCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureAuthenticated(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.CommentId, ct)
            ?? throw new NotFoundException("Comment", request.CommentId);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        var reply = new CommentReply
        {
            CommentId = cmt.Id,
            Body = request.Body.Trim()
        };
        _db.CommentReplies.Add(reply);
        if (cmt.Status == CommentStatus.Resolved)
        {
            cmt.Status = CommentStatus.Open;
            cmt.ResolvedAt = null;
            cmt.ResolvedBy = null;
        }
        await _db.SaveChangesAsync(ct);

        var me = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == _user.UserId, ct);
        return new CommentReplyDto
        {
            Id = reply.Id,
            CommentId = reply.CommentId,
            Body = reply.Body,
            CreatedBy = _user.UserId ?? Guid.Empty,
            CreatedByName = me?.DisplayName ?? "",
            CreatedAt = reply.CreatedAt
        };
    }
}

public record ResolveCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentResolved";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class ResolveCommentHandler : IRequestHandler<ResolveCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ResolveCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(ResolveCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        cmt.Status = CommentStatus.Resolved;
        cmt.ResolvedAt = DateTime.UtcNow;
        cmt.ResolvedBy = _user.UserId;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public record ReopenCommentCommand(Guid Id) : IRequest<Unit>, IAuditableCommand
{
    public string AuditAction => "CommentReopened";
    public string? AuditEntityType => "Comment";
    public string? AuditEntityId => Id.ToString();
}

public class ReopenCommentHandler : IRequestHandler<ReopenCommentCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _user;

    public ReopenCommentHandler(IAppDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Unit> Handle(ReopenCommentCommand request, CancellationToken ct)
    {
        AuthorizationHelper.EnsureNuevo(_user);
        var cmt = await _db.Comments.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Comment", request.Id);
        await AuthorizationHelper.EnsureDocumentAccessAsync(_db, _user, cmt.DocumentId, ct);

        cmt.Status = CommentStatus.Open;
        cmt.ResolvedAt = null;
        cmt.ResolvedBy = null;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
