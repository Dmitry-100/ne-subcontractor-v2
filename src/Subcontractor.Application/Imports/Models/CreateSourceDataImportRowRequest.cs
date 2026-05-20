namespace Subcontractor.Application.Imports.Models;

public sealed class CreateSourceDataImportRowRequest
{
    public int RowNumber { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string ComplexProjectName { get; set; } = string.Empty;
    public string ObjectWbs { get; set; } = string.Empty;
    public string DisciplineCode { get; set; } = string.Empty;
    public string ResourceDisciplineName { get; set; } = string.Empty;
    public string BranchOfficeName { get; set; } = string.Empty;
    public string GipName { get; set; } = string.Empty;
    public decimal ManHours { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedFinishDate { get; set; }
}
