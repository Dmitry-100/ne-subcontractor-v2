using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Application.Contracts;

internal static class ContractRequestValidationPolicy
{
    public static void ValidateCreateRequest(CreateContractRequest request)
    {
        if (request.LotId == Guid.Empty)
        {
            throw new ArgumentException("LotId is required.", nameof(request.LotId));
        }

        if (request.ProcedureId == Guid.Empty)
        {
            throw new ArgumentException("ProcedureId is required.", nameof(request.ProcedureId));
        }

        if (request.ContractorId == Guid.Empty)
        {
            throw new ArgumentException("ContractorId is required.", nameof(request.ContractorId));
        }

        ValidateMutableFields(
            request.ContractNumber,
            request.AmountWithoutVat,
            request.VatAmount,
            request.TotalAmount,
            request.StartDate,
            request.EndDate);
    }

    public static void ValidateUpdateRequest(UpdateContractRequest request)
    {
        ValidateMutableFields(
            request.ContractNumber,
            request.AmountWithoutVat,
            request.VatAmount,
            request.TotalAmount,
            request.StartDate,
            request.EndDate);
    }

    public static void ValidateDraftRequest(CreateContractDraftFromProcedureRequest request)
    {
        if (request.StartDate.HasValue &&
            request.EndDate.HasValue &&
            request.StartDate.Value.Date > request.EndDate.Value.Date)
        {
            throw new ArgumentException("StartDate must be less or equal than EndDate.", nameof(request.StartDate));
        }
    }

    private static void ValidateMutableFields(
        string contractNumber,
        decimal amountWithoutVat,
        decimal vatAmount,
        decimal totalAmount,
        DateTime? startDate,
        DateTime? endDate)
    {
        if (string.IsNullOrWhiteSpace(contractNumber))
        {
            throw new ArgumentException("ContractNumber is required.", nameof(contractNumber));
        }

        if (amountWithoutVat < 0 || vatAmount < 0 || totalAmount < 0)
        {
            throw new ArgumentException("Amount fields must be non-negative.");
        }

        var expectedTotal = amountWithoutVat + vatAmount;
        if (Math.Abs(expectedTotal - totalAmount) > 0.01m)
        {
            throw new ArgumentException("TotalAmount must be equal to AmountWithoutVat + VatAmount.");
        }

        if (startDate.HasValue &&
            endDate.HasValue &&
            startDate.Value.Date > endDate.Value.Date)
        {
            throw new ArgumentException("StartDate must be less or equal than EndDate.", nameof(startDate));
        }
    }
}
