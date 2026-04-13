using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureShortlistRecommendationPolicy
{
    public static decimal CalculateRecommendationScore(
        Contractor contractor,
        bool hasRequiredQualifications,
        bool hasAnyQualificationMatch)
    {
        var score = contractor.CurrentRating * 20m;
        score += contractor.ReliabilityClass switch
        {
            ReliabilityClass.A => 25m,
            ReliabilityClass.B => 15m,
            ReliabilityClass.New => 8m,
            ReliabilityClass.D => -50m,
            _ => 0m
        };

        score += hasRequiredQualifications
            ? 25m
            : hasAnyQualificationMatch
                ? 8m
                : -20m;

        score -= Math.Min(contractor.CurrentLoadPercent, 200m) * 0.25m;

        if (contractor.Status != ContractorStatus.Active)
        {
            score -= 100m;
        }

        if (contractor.ReliabilityClass == ReliabilityClass.D)
        {
            score -= 80m;
        }

        if (!hasRequiredQualifications)
        {
            score -= 20m;
        }

        score *= contractor.ManualSupportCoefficient ?? 1m;
        return decimal.Round(score, 2, MidpointRounding.AwayFromZero);
    }

    public static IReadOnlyList<string> BuildDecisionFactors(
        Contractor contractor,
        bool hasRequiredQualifications,
        bool hasAnyQualificationMatch,
        IReadOnlyList<string> missingDisciplines,
        bool isRecommended)
    {
        var factors = new List<string>(6)
        {
            $"Рейтинг: {contractor.CurrentRating:0.###}",
            $"Текущая загрузка: {contractor.CurrentLoadPercent:0.##}%"
        };

        if (contractor.Status != ContractorStatus.Active)
        {
            factors.Add("Подрядчик не активен.");
        }

        if (contractor.ReliabilityClass == ReliabilityClass.D)
        {
            factors.Add("Класс надежности D.");
        }

        if (!hasRequiredQualifications)
        {
            factors.Add(missingDisciplines.Count == 0
                ? "Нет требуемых квалификаций."
                : $"Не хватает квалификаций: {string.Join(", ", missingDisciplines)}.");
        }
        else if (hasAnyQualificationMatch)
        {
            factors.Add("Все требуемые квалификации подтверждены.");
        }

        if (contractor.CurrentLoadPercent > 100m)
        {
            factors.Add("Загрузка превышает 100%.");
        }

        if (isRecommended)
        {
            factors.Add("Рекомендован к включению в shortlist.");
        }

        return factors;
    }

    public static decimal CalculateLoadPercent(decimal activeLoadHours, decimal capacityHours)
    {
        if (capacityHours <= 0)
        {
            return activeLoadHours > 0 ? 100m : 0m;
        }

        var value = activeLoadHours * 100m / capacityHours;
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
