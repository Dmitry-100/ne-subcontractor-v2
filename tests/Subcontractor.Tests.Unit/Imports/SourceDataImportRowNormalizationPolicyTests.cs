using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class SourceDataImportRowNormalizationPolicyTests
{
    [Fact]
    public void NormalizeForValidation_ShouldTrimNormalizeAndUseFallbackRowNumber()
    {
        var request = new CreateSourceDataImportRowRequest
        {
            RowNumber = 0,
            ProjectCode = "  prj-001  ",
            ObjectWbs = "  OBJ-01  ",
            DisciplineCode = "  km  ",
            ManHours = 12.5m,
            PlannedStartDate = new DateTime(2026, 4, 1),
            PlannedFinishDate = new DateTime(2026, 4, 10)
        };

        var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(
            request,
            fallbackRowNumber: 7,
            existingProjectCodes: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "PRJ-001" });

        Assert.True(normalized.IsValid);
        Assert.Null(normalized.ValidationMessage);
        Assert.Equal(7, normalized.RowNumber);
        Assert.Equal("PRJ-001", normalized.ProjectCode);
        Assert.Equal("OBJ-01", normalized.ObjectWbs);
        Assert.Equal("KM", normalized.DisciplineCode);
    }

    [Fact]
    public void NormalizeForValidation_WhenRequestHasMultipleErrors_ShouldReturnValidationMessage()
    {
        var request = new CreateSourceDataImportRowRequest
        {
            RowNumber = 3,
            ProjectCode = "  missing-prj  ",
            ObjectWbs = " ",
            DisciplineCode = " ",
            ManHours = -1m,
            PlannedStartDate = new DateTime(2026, 5, 2),
            PlannedFinishDate = new DateTime(2026, 5, 1)
        };

        var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(
            request,
            fallbackRowNumber: 99,
            existingProjectCodes: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "PRJ-001" });

        Assert.False(normalized.IsValid);
        Assert.Equal(
            "project 'MISSING-PRJ' does not exist; objectWbs is required; disciplineCode is required; manHours must be non-negative; plannedStartDate must be <= plannedFinishDate",
            normalized.ValidationMessage);
    }

    [Fact]
    public void NormalizeForQueuedUpload_ShouldNormalizeWithoutValidationErrors()
    {
        var request = new CreateSourceDataImportRowRequest
        {
            RowNumber = 0,
            ProjectCode = "  p1  ",
            ObjectWbs = "  a.b.c  ",
            DisciplineCode = "  em  ",
            ManHours = -5m
        };

        var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForQueuedUpload(request, fallbackRowNumber: 2);

        Assert.True(normalized.IsValid);
        Assert.Null(normalized.ValidationMessage);
        Assert.Equal(2, normalized.RowNumber);
        Assert.Equal("P1", normalized.ProjectCode);
        Assert.Equal("a.b.c", normalized.ObjectWbs);
        Assert.Equal("EM", normalized.DisciplineCode);
        Assert.Equal(-5m, normalized.ManHours);
    }

    [Fact]
    public void ApplyToEntity_ShouldOverwriteExistingValues()
    {
        var entity = new Subcontractor.Domain.Imports.SourceDataImportRow
        {
            RowNumber = 1,
            ProjectCode = "OLD",
            ObjectWbs = "OLD",
            DisciplineCode = "OLD",
            IsValid = true
        };

        var normalized = new NormalizedSourceDataImportRow(
            RowNumber: 8,
            ProjectCode: "PRJ-42",
            ObjectWbs: "OBJ-42",
            DisciplineCode: "KM",
            ManHours: 100m,
            PlannedStartDate: new DateTime(2026, 1, 1),
            PlannedFinishDate: new DateTime(2026, 1, 31),
            IsValid: false,
            ValidationMessage: "problem");

        SourceDataImportRowNormalizationPolicy.ApplyToEntity(entity, normalized);

        Assert.Equal(8, entity.RowNumber);
        Assert.Equal("PRJ-42", entity.ProjectCode);
        Assert.Equal("OBJ-42", entity.ObjectWbs);
        Assert.Equal("KM", entity.DisciplineCode);
        Assert.Equal(100m, entity.ManHours);
        Assert.Equal(new DateTime(2026, 1, 1), entity.PlannedStartDate);
        Assert.Equal(new DateTime(2026, 1, 31), entity.PlannedFinishDate);
        Assert.False(entity.IsValid);
        Assert.Equal("problem", entity.ValidationMessage);
    }
}
