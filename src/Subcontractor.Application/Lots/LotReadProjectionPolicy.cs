using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

internal static class LotReadProjectionPolicy
{
    public static LotDetailsDto ToDetailsDto(Lot lot)
    {
        ArgumentNullException.ThrowIfNull(lot);

        return new LotDetailsDto(
            lot.Id,
            lot.Code,
            lot.Name,
            lot.Status,
            lot.ResponsibleCommercialUserId,
            lot.Items
                .OrderBy(x => x.ObjectWbs)
                .ThenBy(x => x.DisciplineCode)
                .Select(x => new LotItemDto(
                    x.Id,
                    x.ProjectId,
                    x.ObjectWbs,
                    x.DisciplineCode,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate))
                .ToArray());
    }

    public static LotStatusHistoryItemDto ToHistoryDto(LotStatusHistory history)
    {
        ArgumentNullException.ThrowIfNull(history);

        return new LotStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }
}
