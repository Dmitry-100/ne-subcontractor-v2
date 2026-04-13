using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractRequestValidationPolicyTests
{
    [Fact]
    public void ValidateCreateRequest_ShouldThrow_WhenLotIdIsEmpty()
    {
        var request = BuildValidCreateRequest();
        request.LotId = Guid.Empty;

        var error = Assert.Throws<ArgumentException>(() => ContractRequestValidationPolicy.ValidateCreateRequest(request));

        Assert.Equal("LotId", error.ParamName);
    }

    [Fact]
    public void ValidateCreateRequest_ShouldThrow_WhenTotalAmountIsInconsistent()
    {
        var request = BuildValidCreateRequest();
        request.AmountWithoutVat = 100m;
        request.VatAmount = 20m;
        request.TotalAmount = 119.98m;

        var error = Assert.Throws<ArgumentException>(() => ContractRequestValidationPolicy.ValidateCreateRequest(request));

        Assert.Equal("TotalAmount must be equal to AmountWithoutVat + VatAmount.", error.Message);
    }

    [Fact]
    public void ValidateUpdateRequest_ShouldThrow_WhenStartDateGreaterThanEndDate()
    {
        var request = new UpdateContractRequest
        {
            ContractNumber = "CN-001",
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = new DateTime(2026, 4, 10),
            EndDate = new DateTime(2026, 4, 9),
            Status = ContractStatus.Draft
        };

        var error = Assert.Throws<ArgumentException>(() => ContractRequestValidationPolicy.ValidateUpdateRequest(request));

        Assert.Equal("startDate", error.ParamName);
    }

    [Fact]
    public void ValidateDraftRequest_ShouldThrow_WhenDraftDatesAreInvalid()
    {
        var request = new CreateContractDraftFromProcedureRequest
        {
            StartDate = new DateTime(2026, 5, 2),
            EndDate = new DateTime(2026, 5, 1)
        };

        var error = Assert.Throws<ArgumentException>(() => ContractRequestValidationPolicy.ValidateDraftRequest(request));

        Assert.Equal("StartDate", error.ParamName);
    }

    [Fact]
    public void ValidateUpdateRequest_ShouldPass_ForValidInput()
    {
        var request = new UpdateContractRequest
        {
            ContractNumber = "CN-VALID-001",
            AmountWithoutVat = 250m,
            VatAmount = 50m,
            TotalAmount = 300m,
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 6, 1),
            Status = ContractStatus.Active
        };

        var action = () => ContractRequestValidationPolicy.ValidateUpdateRequest(request);

        Assert.Null(Record.Exception(action));
    }

    private static CreateContractRequest BuildValidCreateRequest()
    {
        return new CreateContractRequest
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = "CN-001",
            SigningDate = new DateTime(2026, 4, 1),
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 5, 1),
            Status = ContractStatus.Draft
        };
    }
}
