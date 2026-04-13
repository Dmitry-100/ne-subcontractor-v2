using Subcontractor.Application.Imports;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class SourceDataImportTransitionPolicyTests
{
    [Fact]
    public void NormalizeTransitionReason_WhenReasonIsEmpty_ShouldReturnDefaultReason()
    {
        var reason = SourceDataImportTransitionPolicy.NormalizeTransitionReason("   ");

        Assert.Equal("Status changed by operator.", reason);
    }

    [Fact]
    public void EnsureTransitionAllowed_ValidatedToReadyForLotting_WithNoInvalidRows_ShouldAllow()
    {
        SourceDataImportTransitionPolicy.EnsureTransitionAllowed(
            SourceDataImportBatchStatus.Validated,
            invalidRows: 0,
            SourceDataImportBatchStatus.ReadyForLotting,
            hasReason: false);
    }

    [Fact]
    public void EnsureTransitionAllowed_ValidatedToReadyForLotting_WithInvalidRows_ShouldThrow()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            SourceDataImportTransitionPolicy.EnsureTransitionAllowed(
                SourceDataImportBatchStatus.Validated,
                invalidRows: 2,
                SourceDataImportBatchStatus.ReadyForLotting,
                hasReason: false));

        Assert.Equal("Batch with invalid rows cannot move to ReadyForLotting.", ex.Message);
    }

    [Fact]
    public void EnsureTransitionAllowed_UploadedToRejected_ShouldThrow()
    {
        Assert.Throws<InvalidOperationException>(() =>
            SourceDataImportTransitionPolicy.EnsureTransitionAllowed(
                SourceDataImportBatchStatus.Uploaded,
                invalidRows: 0,
                SourceDataImportBatchStatus.Rejected,
                hasReason: true));
    }

    [Fact]
    public void EnsureTransitionAllowed_ValidatedToRejected_WithoutReason_ShouldThrow()
    {
        var ex = Assert.Throws<ArgumentException>(() =>
            SourceDataImportTransitionPolicy.EnsureTransitionAllowed(
                SourceDataImportBatchStatus.Validated,
                invalidRows: 0,
                SourceDataImportBatchStatus.Rejected,
                hasReason: false));

        Assert.Equal("reason", ex.ParamName);
    }

    [Fact]
    public void TruncateReason_ShouldTrimAndLimitTo1024Chars()
    {
        var value = " " + new string('x', 1030) + " ";

        var truncated = SourceDataImportTransitionPolicy.TruncateReason(value);

        Assert.Equal(1024, truncated.Length);
        Assert.DoesNotContain(' ', truncated);
    }
}
