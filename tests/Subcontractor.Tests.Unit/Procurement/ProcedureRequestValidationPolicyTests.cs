using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureRequestValidationPolicyTests
{
    [Fact]
    public void ValidateCreate_WithMissingPurchaseType_ShouldThrowArgumentException()
    {
        var request = new CreateProcedureRequest
        {
            PurchaseTypeCode = " ",
            ObjectName = "Procedure A",
            WorkScope = "Монтаж"
        };

        var error = Assert.Throws<ArgumentException>(() => ProcedureRequestValidationPolicy.Validate(request));
        Assert.Contains("PurchaseTypeCode is required", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateUpdate_WithNegativeBudget_ShouldThrowArgumentException()
    {
        var request = new UpdateProcedureRequest
        {
            PurchaseTypeCode = "PT-1",
            ObjectName = "Procedure B",
            WorkScope = "СМР",
            PlannedBudgetWithoutVat = -1m
        };

        var error = Assert.Throws<ArgumentException>(() => ProcedureRequestValidationPolicy.Validate(request));
        Assert.Contains("PlannedBudgetWithoutVat", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateCreate_WithValidRequest_ShouldNotThrow()
    {
        var request = new CreateProcedureRequest
        {
            PurchaseTypeCode = "PT-1",
            ObjectName = "Procedure C",
            WorkScope = "ПНР",
            PlannedBudgetWithoutVat = 0m
        };

        var error = Record.Exception(() => ProcedureRequestValidationPolicy.Validate(request));
        Assert.Null(error);
    }
}
