using Nuevo.PMO.Domain.Common;
using Nuevo.PMO.Domain.Enums;

namespace Nuevo.PMO.Domain.Entities;

/// <summary>
/// Canlı plan içindeki bir adım. Timeline üzerinde sıra, tarih aralığı ve
/// yüzde ilerleme ile gösterilir.
/// </summary>
public class PlanStep : BaseEntity
{
    public Guid ProjectPlanId { get; set; }
    public ProjectPlan ProjectPlan { get; set; } = null!;

    /// <summary>
    /// Alt-adımlar için üst adım referansı. null ise üst seviye. İki seviye
    /// yeterli (parent → children); daha derin yapı MVP dışı.
    /// </summary>
    public Guid? ParentStepId { get; set; }
    public PlanStep? Parent { get; set; }
    public ICollection<PlanStep> Children { get; set; } = new List<PlanStep>();

    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>ISO y\u0131l-hafta etiketi: \"2025-W12\".</summary>
    public string? StartYearWeek { get; set; }

    /// <summary>ISO y\u0131l-hafta etiketi: \"2025-W16\".</summary>
    public string? EndYearWeek { get; set; }

    /// <summary>Planlanan adam-g\u00fcn. \u0130\u00e7 takip i\u00e7in; m\u00fc\u015fteri g\u00f6remez.</summary>
    public decimal? PlannedManDays { get; set; }

    /// <summary>Ger\u00e7ekle\u015fen adam-g\u00fcn. \u0130\u00e7 takip i\u00e7in; m\u00fc\u015fteri g\u00f6remez.</summary>
    public decimal? ActualManDays { get; set; }

    /// <summary>0..100 aralığında yüzde ilerleme.</summary>
    public int Progress { get; set; }

    public PlanStepStatus Status { get; set; } = PlanStepStatus.Planned;
}
