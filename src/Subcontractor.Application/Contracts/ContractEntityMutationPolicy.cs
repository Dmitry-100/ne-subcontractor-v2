using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Contracts;

internal static class ContractEntityMutationPolicy
{
    public static Contract BuildNewContract(CreateContractRequest request, string contractNumber)
    {
        return new Contract
        {
            LotId = request.LotId,
            ProcedureId = request.ProcedureId,
            ContractorId = request.ContractorId,
            ContractNumber = contractNumber,
            SigningDate = request.SigningDate,
            AmountWithoutVat = request.AmountWithoutVat,
            VatAmount = request.VatAmount,
            TotalAmount = request.TotalAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status
        };
    }

    public static void ApplyUpdate(Contract contract, UpdateContractRequest request, string contractNumber)
    {
        contract.ContractNumber = contractNumber;
        contract.SigningDate = request.SigningDate;
        contract.AmountWithoutVat = request.AmountWithoutVat;
        contract.VatAmount = request.VatAmount;
        contract.TotalAmount = request.TotalAmount;
        contract.StartDate = request.StartDate;
        contract.EndDate = request.EndDate;
    }

    public static Contract BuildDraftContract(
        ProcurementProcedure procedure,
        ProcedureOffer winnerOffer,
        Guid winnerContractorId,
        CreateContractDraftFromProcedureRequest request,
        string contractNumber)
    {
        return new Contract
        {
            LotId = procedure.LotId,
            ProcedureId = procedure.Id,
            ContractorId = winnerContractorId,
            ContractNumber = contractNumber,
            SigningDate = request.SigningDate,
            AmountWithoutVat = winnerOffer.AmountWithoutVat,
            VatAmount = winnerOffer.VatAmount,
            TotalAmount = winnerOffer.TotalAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = ContractStatus.Draft
        };
    }

    public static ContractStatusHistory BuildInitialStatusHistory(Contract contract, string reason)
    {
        return new ContractStatusHistory
        {
            Contract = contract,
            FromStatus = null,
            ToStatus = contract.Status,
            Reason = reason
        };
    }
}
