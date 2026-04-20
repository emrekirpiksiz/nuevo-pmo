using Nuevo.PMO.Application.Common.Interfaces;

namespace Nuevo.PMO.Infrastructure.Services;

public class DateTimeService : IDateTime
{
    public DateTime UtcNow => DateTime.UtcNow;
}
