namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportBatchValidationReportDto(
    string FileName,
    string CsvContent);
