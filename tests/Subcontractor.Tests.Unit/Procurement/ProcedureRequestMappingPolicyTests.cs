using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureRequestMappingPolicyTests
{
    [Fact]
    public void ApplyCreate_ShouldTrimAndNormalizeFields()
    {
        var entity = new ProcurementProcedure();
        var request = new CreateProcedureRequest
        {
            RequestDate = new DateTime(2026, 4, 9),
            PurchaseTypeCode = " pt-01 ",
            InitiatorUserId = Guid.NewGuid(),
            ResponsibleCommercialUserId = Guid.NewGuid(),
            ObjectName = "  Процедура  ",
            WorkScope = "  СМР  ",
            CustomerName = "  Заказчик  ",
            LeadOfficeCode = " lo-1 ",
            AnalyticsLevel1Code = " a1 ",
            AnalyticsLevel2Code = " a2 ",
            AnalyticsLevel3Code = " a3 ",
            AnalyticsLevel4Code = " a4 ",
            AnalyticsLevel5Code = " a5 ",
            CustomerContractNumber = "  C-77  ",
            PlannedBudgetWithoutVat = 123.45m,
            Notes = "  note  ",
            ApprovalRouteCode = "  route-1  ",
            ContainsConfidentialInfo = true,
            RequiresTechnicalNegotiations = true
        };

        ProcedureRequestMappingPolicy.Apply(entity, request);

        Assert.Equal("PT-01", entity.PurchaseTypeCode);
        Assert.Equal("Процедура", entity.ObjectName);
        Assert.Equal("СМР", entity.WorkScope);
        Assert.Equal("Заказчик", entity.CustomerName);
        Assert.Equal("LO-1", entity.LeadOfficeCode);
        Assert.Equal("A1", entity.AnalyticsLevel1Code);
        Assert.Equal("A2", entity.AnalyticsLevel2Code);
        Assert.Equal("A3", entity.AnalyticsLevel3Code);
        Assert.Equal("A4", entity.AnalyticsLevel4Code);
        Assert.Equal("A5", entity.AnalyticsLevel5Code);
        Assert.Equal("C-77", entity.CustomerContractNumber);
        Assert.Equal("note", entity.Notes);
        Assert.Equal("route-1", entity.ApprovalRouteCode);
        Assert.True(entity.ContainsConfidentialInfo);
        Assert.True(entity.RequiresTechnicalNegotiations);
    }

    [Fact]
    public void ApplyUpdate_ShouldOverwriteExistingValues()
    {
        var entity = new ProcurementProcedure
        {
            PurchaseTypeCode = "OLD",
            ObjectName = "Old Name",
            WorkScope = "Old Scope"
        };

        var request = new UpdateProcedureRequest
        {
            PurchaseTypeCode = " new ",
            ObjectName = "  New Name ",
            WorkScope = "  New Scope "
        };

        ProcedureRequestMappingPolicy.Apply(entity, request);

        Assert.Equal("NEW", entity.PurchaseTypeCode);
        Assert.Equal("New Name", entity.ObjectName);
        Assert.Equal("New Scope", entity.WorkScope);
    }
}
