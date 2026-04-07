namespace Subcontractor.Web.Authorization;

public static class PolicyCodes
{
    public const string ProjectsRead = "policy.projects.read";
    public const string ProjectsCreate = "policy.projects.create";
    public const string ProjectsUpdate = "policy.projects.update";
    public const string ProjectsDelete = "policy.projects.delete";

    public const string ContractorsRead = "policy.contractors.read";
    public const string ContractorsCreate = "policy.contractors.create";
    public const string ContractorsUpdate = "policy.contractors.update";
    public const string ContractorsDelete = "policy.contractors.delete";

    public const string ContractsRead = "policy.contracts.read";
    public const string ContractsCreate = "policy.contracts.create";
    public const string ContractsUpdate = "policy.contracts.update";
    public const string ContractsDelete = "policy.contracts.delete";

    public const string LotsRead = "policy.lots.read";
    public const string LotsCreate = "policy.lots.create";
    public const string LotsUpdate = "policy.lots.update";
    public const string LotsDelete = "policy.lots.delete";
    public const string LotsTransition = "policy.lots.transition";

    public const string ProceduresRead = "policy.procedures.read";
    public const string ProceduresCreate = "policy.procedures.create";
    public const string ProceduresUpdate = "policy.procedures.update";
    public const string ProceduresDelete = "policy.procedures.delete";
    public const string ProceduresTransition = "policy.procedures.transition";

    public const string ReferenceDataRead = "policy.reference-data.read";
    public const string ReferenceDataWrite = "policy.reference-data.write";

    public const string UsersRead = "policy.users.read";
    public const string UsersWrite = "policy.users.write";

    public const string ImportsRead = "policy.imports.read";
    public const string ImportsWrite = "policy.imports.write";

    public const string SlaRead = "policy.sla.read";
    public const string SlaWrite = "policy.sla.write";

    public const string AnalyticsRead = "policy.analytics.read";
}
