namespace Nuevo.PMO.Domain.Enums;

public enum UserType
{
    Nuevo = 1,
    Customer = 2
}

public enum ProjectStatus
{
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

public enum ProjectRole
{
    PMOwner = 1,
    PMOMember = 2,
    CustomerViewer = 10,
    CustomerContributor = 11
}

public enum DocumentType
{
    Analysis = 1,
    Scope = 2,
    Meeting = 3,
    Other = 99
}

public enum CommentStatus
{
    Open = 1,
    Resolved = 2,
    Orphaned = 3
}
