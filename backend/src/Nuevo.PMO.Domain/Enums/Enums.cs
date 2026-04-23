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
    /// <summary>
    /// Yorumun manuel olarak "çözüldü" işaretlendiği durum. Nuevo
    /// kullanıcıları çözümler, müşteri (ya da Nuevo) yeniden açabilir.
    /// Yayın akışı bu durumu etkilemez — sorumluluk kullanıcılara aittir.
    /// </summary>
    Resolved = 2,
    Orphaned = 3
}

public enum PlanStepStatus
{
    Planned = 1,
    InProgress = 2,
    Done = 3,
    Blocked = 4
}

public enum PlanMilestoneType
{
    CriticalPath = 1,
    CustomerPending = 2
}

public enum PlanMilestoneStatus
{
    Pending = 1,
    Done = 2
}

public enum NotificationType
{
    DocumentPublished = 1,
    CommentCreated = 2,
    CommentReplied = 3
}

