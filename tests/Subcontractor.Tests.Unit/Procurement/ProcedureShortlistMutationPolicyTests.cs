using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureShortlistMutationPolicyTests
{
    [Fact]
    public void NormalizeItems_ExcludedWithoutReason_ShouldThrowArgumentException()
    {
        var requestItems = new[]
        {
            new UpsertProcedureShortlistItemRequest
            {
                ContractorId = Guid.NewGuid(),
                IsIncluded = false,
                ExclusionReason = " "
            }
        };

        var error = Assert.Throws<ArgumentException>(() => ProcedureShortlistMutationPolicy.NormalizeItems(requestItems));
        Assert.Contains("exclusionReason is required", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeItems_ShouldSortBySortOrder_AndTrimOptionalFields()
    {
        var contractorA = Guid.NewGuid();
        var contractorB = Guid.NewGuid();

        var requestItems = new[]
        {
            new UpsertProcedureShortlistItemRequest
            {
                ContractorId = contractorA,
                IsIncluded = true,
                SortOrder = 2,
                Notes = "  n1  "
            },
            new UpsertProcedureShortlistItemRequest
            {
                ContractorId = contractorB,
                IsIncluded = false,
                SortOrder = 1,
                ExclusionReason = "  too expensive  "
            }
        };

        var normalized = ProcedureShortlistMutationPolicy.NormalizeItems(requestItems);

        Assert.Equal(2, normalized.Length);
        Assert.Equal(contractorB, normalized[0].ContractorId);
        Assert.Equal("too expensive", normalized[0].ExclusionReason);
        Assert.Equal(contractorA, normalized[1].ContractorId);
        Assert.Equal("n1", normalized[1].Notes);
    }

    [Fact]
    public void BuildAdjustmentLogs_WithChangedItem_ShouldCreateLogWithDefaultReason()
    {
        var procedureId = Guid.NewGuid();
        var contractorId = Guid.NewGuid();
        var existingItems = new[]
        {
            new ProcedureShortlistItem
            {
                ProcedureId = procedureId,
                ContractorId = contractorId,
                IsIncluded = true,
                SortOrder = 1,
                ExclusionReason = null
            }
        };

        var updatedItems = new[]
        {
            new NormalizedShortlistItem(
                contractorId,
                IsIncluded: false,
                SortOrder: 1,
                ExclusionReason: "risk",
                Notes: null)
        };

        var logs = ProcedureShortlistMutationPolicy.BuildAdjustmentLogs(
            procedureId,
            existingItems,
            updatedItems,
            adjustmentReason: null);

        var log = Assert.Single(logs);
        Assert.Equal(procedureId, log.ProcedureId);
        Assert.Equal(contractorId, log.ContractorId);
        Assert.Equal(true, log.PreviousIsIncluded);
        Assert.False(log.NewIsIncluded);
        Assert.Equal("risk", log.NewExclusionReason);
        Assert.Equal("Manual shortlist update", log.Reason);
    }
}
