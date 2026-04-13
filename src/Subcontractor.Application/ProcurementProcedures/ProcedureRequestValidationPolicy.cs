using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureRequestValidationPolicy
{
    public static void Validate(CreateProcedureRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateCore(
            request.PurchaseTypeCode,
            request.ObjectName,
            request.WorkScope,
            request.PlannedBudgetWithoutVat);
    }

    public static void Validate(UpdateProcedureRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        ValidateCore(
            request.PurchaseTypeCode,
            request.ObjectName,
            request.WorkScope,
            request.PlannedBudgetWithoutVat);
    }

    private static void ValidateCore(
        string purchaseTypeCode,
        string objectName,
        string workScope,
        decimal? plannedBudgetWithoutVat)
    {
        if (string.IsNullOrWhiteSpace(purchaseTypeCode))
        {
            throw new ArgumentException("PurchaseTypeCode is required.", nameof(purchaseTypeCode));
        }

        if (string.IsNullOrWhiteSpace(objectName))
        {
            throw new ArgumentException("ObjectName is required.", nameof(objectName));
        }

        if (string.IsNullOrWhiteSpace(workScope))
        {
            throw new ArgumentException("WorkScope is required.", nameof(workScope));
        }

        if (plannedBudgetWithoutVat < 0)
        {
            throw new ArgumentException("PlannedBudgetWithoutVat must be non-negative.", nameof(plannedBudgetWithoutVat));
        }
    }
}
