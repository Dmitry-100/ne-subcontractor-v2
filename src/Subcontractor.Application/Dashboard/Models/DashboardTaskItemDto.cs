namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardTaskItemDto(
    Guid Id,
    string Module,
    string Title,
    string Description,
    DateTime? DueDate,
    string Priority,
    string ActionUrl);
