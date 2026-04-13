namespace Subcontractor.Application.Contractors;

public static class ContractorLoadCalculationPolicy
{
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
