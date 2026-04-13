using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureRequestMappingPolicy
{
    public static void Apply(ProcurementProcedure entity, CreateProcedureRequest request)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);

        ApplyCore(
            entity,
            request.RequestDate,
            request.PurchaseTypeCode,
            request.InitiatorUserId,
            request.ResponsibleCommercialUserId,
            request.ObjectName,
            request.WorkScope,
            request.CustomerName,
            request.LeadOfficeCode,
            request.AnalyticsLevel1Code,
            request.AnalyticsLevel2Code,
            request.AnalyticsLevel3Code,
            request.AnalyticsLevel4Code,
            request.AnalyticsLevel5Code,
            request.CustomerContractNumber,
            request.CustomerContractDate,
            request.RequiredSubcontractorDeadline,
            request.ProposalDueDate,
            request.PlannedBudgetWithoutVat,
            request.Notes,
            request.ApprovalMode,
            request.ApprovalRouteCode,
            request.ContainsConfidentialInfo,
            request.RequiresTechnicalNegotiations);
    }

    public static void Apply(ProcurementProcedure entity, UpdateProcedureRequest request)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentNullException.ThrowIfNull(request);

        ApplyCore(
            entity,
            request.RequestDate,
            request.PurchaseTypeCode,
            request.InitiatorUserId,
            request.ResponsibleCommercialUserId,
            request.ObjectName,
            request.WorkScope,
            request.CustomerName,
            request.LeadOfficeCode,
            request.AnalyticsLevel1Code,
            request.AnalyticsLevel2Code,
            request.AnalyticsLevel3Code,
            request.AnalyticsLevel4Code,
            request.AnalyticsLevel5Code,
            request.CustomerContractNumber,
            request.CustomerContractDate,
            request.RequiredSubcontractorDeadline,
            request.ProposalDueDate,
            request.PlannedBudgetWithoutVat,
            request.Notes,
            request.ApprovalMode,
            request.ApprovalRouteCode,
            request.ContainsConfidentialInfo,
            request.RequiresTechnicalNegotiations);
    }

    private static void ApplyCore(
        ProcurementProcedure entity,
        DateTime? requestDate,
        string purchaseTypeCode,
        Guid? initiatorUserId,
        Guid? responsibleCommercialUserId,
        string objectName,
        string workScope,
        string customerName,
        string leadOfficeCode,
        string analyticsLevel1Code,
        string analyticsLevel2Code,
        string analyticsLevel3Code,
        string analyticsLevel4Code,
        string analyticsLevel5Code,
        string? customerContractNumber,
        DateTime? customerContractDate,
        DateTime? requiredSubcontractorDeadline,
        DateTime? proposalDueDate,
        decimal? plannedBudgetWithoutVat,
        string? notes,
        ProcedureApprovalMode approvalMode,
        string? approvalRouteCode,
        bool containsConfidentialInfo,
        bool requiresTechnicalNegotiations)
    {
        entity.RequestDate = requestDate;
        entity.PurchaseTypeCode = purchaseTypeCode.Trim().ToUpperInvariant();
        entity.InitiatorUserId = initiatorUserId;
        entity.ResponsibleCommercialUserId = responsibleCommercialUserId;
        entity.ObjectName = objectName.Trim();
        entity.WorkScope = workScope.Trim();
        entity.CustomerName = customerName.Trim();
        entity.LeadOfficeCode = leadOfficeCode.Trim().ToUpperInvariant();
        entity.AnalyticsLevel1Code = analyticsLevel1Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel2Code = analyticsLevel2Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel3Code = analyticsLevel3Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel4Code = analyticsLevel4Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel5Code = analyticsLevel5Code.Trim().ToUpperInvariant();
        entity.CustomerContractNumber = customerContractNumber?.Trim();
        entity.CustomerContractDate = customerContractDate;
        entity.RequiredSubcontractorDeadline = requiredSubcontractorDeadline;
        entity.ProposalDueDate = proposalDueDate;
        entity.PlannedBudgetWithoutVat = plannedBudgetWithoutVat;
        entity.Notes = notes?.Trim();
        entity.ApprovalMode = approvalMode;
        entity.ApprovalRouteCode = approvalRouteCode?.Trim();
        entity.ContainsConfidentialInfo = containsConfidentialInfo;
        entity.RequiresTechnicalNegotiations = requiresTechnicalNegotiations;
    }
}
