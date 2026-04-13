using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class SourceDataImportBatchRequestPolicyTests
{
    [Fact]
    public void Normalize_ShouldTrimFileNameNotesAndReturnRows()
    {
        var request = new CreateSourceDataImportBatchRequest
        {
            FileName = "  source-data.csv  ",
            Notes = "  async import  ",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01",
                    DisciplineCode = "PIP",
                    ManHours = 10m
                }
            ]
        };

        var normalized = SourceDataImportBatchRequestPolicy.Normalize(request);

        Assert.Equal("source-data.csv", normalized.FileName);
        Assert.Equal("async import", normalized.Notes);
        Assert.Single(normalized.Rows);
    }

    [Fact]
    public void Normalize_WhenNotesContainOnlyWhitespace_ShouldReturnNullNotes()
    {
        var request = new CreateSourceDataImportBatchRequest
        {
            FileName = "source-data.csv",
            Notes = "   ",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01",
                    DisciplineCode = "PIP",
                    ManHours = 10m
                }
            ]
        };

        var normalized = SourceDataImportBatchRequestPolicy.Normalize(request);

        Assert.Null(normalized.Notes);
    }

    [Fact]
    public void Normalize_WhenFileNameMissing_ShouldThrowArgumentException()
    {
        var request = new CreateSourceDataImportBatchRequest
        {
            FileName = "  ",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01",
                    DisciplineCode = "PIP",
                    ManHours = 10m
                }
            ]
        };

        var error = Assert.Throws<ArgumentException>(() => SourceDataImportBatchRequestPolicy.Normalize(request));

        Assert.Equal("fileName", error.ParamName);
    }

    [Fact]
    public void Normalize_WhenRowsMissing_ShouldThrowArgumentException()
    {
        var request = new CreateSourceDataImportBatchRequest
        {
            FileName = "source-data.csv",
            Rows = Array.Empty<CreateSourceDataImportRowRequest>()
        };

        var error = Assert.Throws<ArgumentException>(() => SourceDataImportBatchRequestPolicy.Normalize(request));

        Assert.Equal("Rows", error.ParamName);
    }

    [Fact]
    public void Normalize_WhenRequestIsNull_ShouldThrowArgumentNullException()
    {
        var error = Assert.Throws<ArgumentNullException>(() => SourceDataImportBatchRequestPolicy.Normalize(null!));

        Assert.Equal("request", error.ParamName);
    }
}
