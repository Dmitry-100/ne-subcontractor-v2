using Subcontractor.Application.Dashboard.Models;

namespace Subcontractor.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
