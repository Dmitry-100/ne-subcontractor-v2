using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal static class ContractReadModelProjectionPolicy
{
    public static ContractListItemDto ToListItemDto(Contract entity, string? contractorName)
    {
        return new ContractListItemDto(
            entity.Id,
            entity.ContractNumber,
            entity.LotId,
            entity.ProcedureId,
            entity.ContractorId,
            contractorName,
            entity.Status,
            entity.SigningDate,
            entity.AmountWithoutVat,
            entity.VatAmount,
            entity.TotalAmount,
            entity.StartDate,
            entity.EndDate);
    }

    public static ContractDetailsDto ToDetailsDto(Contract entity, string? contractorName)
    {
        return new ContractDetailsDto(
            entity.Id,
            entity.LotId,
            entity.ProcedureId,
            entity.ContractorId,
            contractorName,
            entity.ContractNumber,
            entity.SigningDate,
            entity.AmountWithoutVat,
            entity.VatAmount,
            entity.TotalAmount,
            entity.StartDate,
            entity.EndDate,
            entity.Status);
    }

    public static ContractStatusHistoryItemDto ToHistoryDto(ContractStatusHistory history)
    {
        return new ContractStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }

    public static ContractMilestoneDto ToMilestoneDto(ContractMilestone milestone, DateTime utcToday)
    {
        var isOverdue = milestone.ProgressPercent < 100m && milestone.PlannedDate.Date < utcToday;
        return new ContractMilestoneDto(
            milestone.Id,
            milestone.Title,
            milestone.PlannedDate,
            milestone.ActualDate,
            milestone.ProgressPercent,
            milestone.SortOrder,
            milestone.Notes,
            isOverdue);
    }

    public static ContractMonitoringControlPointDto ToControlPointDto(ContractMonitoringControlPoint point, DateTime utcToday)
    {
        var stages = point.Stages
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Name)
            .Select(x => ToControlPointStageDto(x, utcToday))
            .ToArray();

        var pointDelayed = ResolveDelayFlag(
            point.ProgressPercent,
            point.ForecastDate?.Date ?? point.PlannedDate.Date,
            utcToday);
        var stageDelayed = stages.Any(x => x.IsDelayed);

        return new ContractMonitoringControlPointDto(
            point.Id,
            point.Name,
            point.ResponsibleRole,
            point.PlannedDate.Date,
            point.ForecastDate?.Date,
            point.ActualDate?.Date,
            point.ProgressPercent,
            point.SortOrder,
            point.Notes,
            pointDelayed || stageDelayed,
            stages);
    }

    public static ContractMdrCardDto ToMdrCardDto(ContractMdrCard card)
    {
        var rows = card.Rows
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.RowCode)
            .ThenBy(x => x.Description)
            .Select(ToMdrRowDto)
            .ToArray();

        var totalPlan = rows.Sum(x => x.PlanValue);
        var totalForecast = rows.Sum(x => x.ForecastValue);
        var totalFact = rows.Sum(x => x.FactValue);

        return new ContractMdrCardDto(
            card.Id,
            card.Title,
            card.ReportingDate.Date,
            card.SortOrder,
            card.Notes,
            totalPlan,
            totalForecast,
            totalFact,
            CalculateDeviationPercent(totalPlan, totalForecast),
            CalculateDeviationPercent(totalPlan, totalFact),
            rows);
    }

    public static ContractMdrRowDto ToMdrRowDto(ContractMdrRow row)
    {
        return new ContractMdrRowDto(
            row.Id,
            row.RowCode,
            row.Description,
            row.UnitCode,
            row.PlanValue,
            row.ForecastValue,
            row.FactValue,
            CalculateDeviationPercent(row.PlanValue, row.ForecastValue),
            CalculateDeviationPercent(row.PlanValue, row.FactValue),
            row.SortOrder,
            row.Notes);
    }

    private static ContractMonitoringControlPointStageDto ToControlPointStageDto(
        ContractMonitoringControlPointStage stage,
        DateTime utcToday)
    {
        var delayed = ResolveDelayFlag(
            stage.ProgressPercent,
            stage.ForecastDate?.Date ?? stage.PlannedDate.Date,
            utcToday);

        return new ContractMonitoringControlPointStageDto(
            stage.Id,
            stage.Name,
            stage.PlannedDate.Date,
            stage.ForecastDate?.Date,
            stage.ActualDate?.Date,
            stage.ProgressPercent,
            stage.SortOrder,
            stage.Notes,
            delayed);
    }

    private static bool ResolveDelayFlag(decimal progressPercent, DateTime targetDate, DateTime utcToday)
    {
        return progressPercent < 100m && targetDate < utcToday;
    }

    private static decimal? CalculateDeviationPercent(decimal plan, decimal value)
    {
        if (plan <= 0m)
        {
            return null;
        }

        var delta = (value - plan) / plan * 100m;
        return decimal.Round(delta, 2, MidpointRounding.AwayFromZero);
    }
}
