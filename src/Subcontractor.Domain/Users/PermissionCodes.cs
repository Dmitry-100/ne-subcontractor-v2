namespace Subcontractor.Domain.Users;

public static class PermissionCodes
{
    public const string ProjectsRead = "projects.read";
    public const string ProjectsReadAll = "projects.read.all";
    public const string ProjectsCreate = "projects.create";
    public const string ProjectsUpdate = "projects.update";
    public const string ProjectsDelete = "projects.delete";

    public const string ContractorsRead = "contractors.read";
    public const string ContractorsCreate = "contractors.create";
    public const string ContractorsUpdate = "contractors.update";
    public const string ContractorsDelete = "contractors.delete";

    public const string ContractsRead = "contracts.read";
    public const string ContractsCreate = "contracts.create";
    public const string ContractsUpdate = "contracts.update";
    public const string ContractsDelete = "contracts.delete";

    public const string LotsRead = "lots.read";
    public const string LotsCreate = "lots.create";
    public const string LotsUpdate = "lots.update";
    public const string LotsDelete = "lots.delete";
    public const string LotsTransition = "lots.transition";

    public const string ProceduresRead = "procedures.read";
    public const string ProceduresCreate = "procedures.create";
    public const string ProceduresUpdate = "procedures.update";
    public const string ProceduresDelete = "procedures.delete";
    public const string ProceduresTransition = "procedures.transition";

    public const string ReferenceDataRead = "reference-data.read";
    public const string ReferenceDataWrite = "reference-data.write";

    public const string UsersRead = "users.read";
    public const string UsersWrite = "users.write";

    public const string ImportsRead = "imports.read";
    public const string ImportsWrite = "imports.write";

    public const string SlaRead = "sla.read";
    public const string SlaWrite = "sla.write";

    public const string AnalyticsRead = "analytics.read";
}
