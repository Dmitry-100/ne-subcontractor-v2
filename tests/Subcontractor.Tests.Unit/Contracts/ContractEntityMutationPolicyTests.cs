using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractEntityMutationPolicyTests
{
    [Fact]
    public void BuildNewContract_ShouldMapCreateRequestFields()
    {
        var request = new CreateContractRequest
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = "CN-1",
            SigningDate = new DateTime(2026, 4, 10),
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = new DateTime(2026, 4, 11),
            EndDate = new DateTime(2026, 5, 11),
            Status = ContractStatus.Active
        };

        var contract = ContractEntityMutationPolicy.BuildNewContract(request, "CN-001");

        Assert.Equal(request.LotId, contract.LotId);
        Assert.Equal(request.ProcedureId, contract.ProcedureId);
        Assert.Equal(request.ContractorId, contract.ContractorId);
        Assert.Equal("CN-001", contract.ContractNumber);
        Assert.Equal(request.SigningDate, contract.SigningDate);
        Assert.Equal(request.AmountWithoutVat, contract.AmountWithoutVat);
        Assert.Equal(request.VatAmount, contract.VatAmount);
        Assert.Equal(request.TotalAmount, contract.TotalAmount);
        Assert.Equal(request.StartDate, contract.StartDate);
        Assert.Equal(request.EndDate, contract.EndDate);
        Assert.Equal(request.Status, contract.Status);
    }

    [Fact]
    public void ApplyUpdate_ShouldOverwriteMutableFields()
    {
        var contract = new Contract
        {
            ContractNumber = "OLD",
            SigningDate = new DateTime(2026, 1, 1),
            AmountWithoutVat = 10m,
            VatAmount = 2m,
            TotalAmount = 12m,
            StartDate = new DateTime(2026, 1, 2),
            EndDate = new DateTime(2026, 2, 2)
        };

        var request = new UpdateContractRequest
        {
            ContractNumber = "ignored",
            SigningDate = new DateTime(2026, 4, 10),
            AmountWithoutVat = 200m,
            VatAmount = 40m,
            TotalAmount = 240m,
            StartDate = new DateTime(2026, 4, 11),
            EndDate = new DateTime(2026, 6, 11),
            Status = ContractStatus.Active
        };

        ContractEntityMutationPolicy.ApplyUpdate(contract, request, "NEW-001");

        Assert.Equal("NEW-001", contract.ContractNumber);
        Assert.Equal(request.SigningDate, contract.SigningDate);
        Assert.Equal(request.AmountWithoutVat, contract.AmountWithoutVat);
        Assert.Equal(request.VatAmount, contract.VatAmount);
        Assert.Equal(request.TotalAmount, contract.TotalAmount);
        Assert.Equal(request.StartDate, contract.StartDate);
        Assert.Equal(request.EndDate, contract.EndDate);
    }

    [Fact]
    public void BuildDraftContract_ShouldMapProcedureOfferAndRequestFields()
    {
        var procedure = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            Status = ProcurementProcedureStatus.DecisionMade
        };
        var winnerOffer = new ProcedureOffer
        {
            AmountWithoutVat = 300m,
            VatAmount = 60m,
            TotalAmount = 360m
        };
        var winnerContractorId = Guid.NewGuid();
        var request = new CreateContractDraftFromProcedureRequest
        {
            SigningDate = new DateTime(2026, 4, 10),
            StartDate = new DateTime(2026, 4, 11),
            EndDate = new DateTime(2026, 8, 11)
        };

        var contract = ContractEntityMutationPolicy.BuildDraftContract(
            procedure,
            winnerOffer,
            winnerContractorId,
            request,
            "DRAFT-001");

        Assert.Equal(procedure.LotId, contract.LotId);
        Assert.Equal(procedure.Id, contract.ProcedureId);
        Assert.Equal(winnerContractorId, contract.ContractorId);
        Assert.Equal("DRAFT-001", contract.ContractNumber);
        Assert.Equal(request.SigningDate, contract.SigningDate);
        Assert.Equal(winnerOffer.AmountWithoutVat, contract.AmountWithoutVat);
        Assert.Equal(winnerOffer.VatAmount, contract.VatAmount);
        Assert.Equal(winnerOffer.TotalAmount, contract.TotalAmount);
        Assert.Equal(request.StartDate, contract.StartDate);
        Assert.Equal(request.EndDate, contract.EndDate);
        Assert.Equal(ContractStatus.Draft, contract.Status);
    }

    [Fact]
    public void BuildInitialStatusHistory_ShouldUseCurrentContractStatus()
    {
        var contract = new Contract
        {
            Status = ContractStatus.Signed
        };

        var history = ContractEntityMutationPolicy.BuildInitialStatusHistory(contract, "created");

        Assert.Same(contract, history.Contract);
        Assert.Null(history.FromStatus);
        Assert.Equal(ContractStatus.Signed, history.ToStatus);
        Assert.Equal("created", history.Reason);
    }
}
