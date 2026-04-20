using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Application.Features.Documents;

public class DocumentDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DocumentType Type { get; set; }

    public Guid? CurrentDraftVersionId { get; set; }
    public string? CurrentDraftVersionNumber { get; set; }

    public Guid? PublishedVersionId { get; set; }
    public string? PublishedVersionNumber { get; set; }
    public DateTime? PublishedAt { get; set; }

    public Guid? ApprovedVersionId { get; set; }
    public string? ApprovedVersionNumber { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public int OpenCommentCount { get; set; }
}

public class DocumentVersionDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int Major { get; set; }
    public int Minor { get; set; }
    public string VersionNumber { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public bool IsDraft { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
}

public class DocumentVersionContentDto : DocumentVersionDto
{
    public string ContentJson { get; set; } = "{}";
    public string ContentMarkdown { get; set; } = string.Empty;
}

public class DocumentApprovalDto
{
    public Guid Id { get; set; }
    public Guid DocumentVersionId { get; set; }
    public string VersionNumber { get; set; } = string.Empty;
    public Guid ApprovedBy { get; set; }
    public string ApprovedByName { get; set; } = string.Empty;
    public DateTime ApprovedAt { get; set; }
    public string? Note { get; set; }
}
