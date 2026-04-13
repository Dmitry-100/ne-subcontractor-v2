namespace Subcontractor.Web.Services;

public interface IDemoContractsSmokeSeedService
{
    Task<DemoContractsSmokeSeedResult> EnsureContractsSmokeSeedAsync(CancellationToken cancellationToken = default);
}

public sealed record DemoContractsSmokeSeedResult(
    bool Created,
    int ContractsWithPrefix,
    string ContractNumberPrefix,
    string? CreatedContractNumber);
