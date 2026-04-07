using System.Globalization;
using System.Text;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Exports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Exports;

public sealed class RegistryExportService : IRegistryExportService
{
    private const string CsvContentType = "text/csv; charset=utf-8";

    private readonly IProjectsService _projectsService;
    private readonly IContractorsService _contractorsService;
    private readonly ILotsService _lotsService;
    private readonly IProcurementProceduresService _proceduresService;
    private readonly IContractsService _contractsService;

    public RegistryExportService(
        IProjectsService projectsService,
        IContractorsService contractorsService,
        ILotsService lotsService,
        IProcurementProceduresService proceduresService,
        IContractsService contractsService)
    {
        _projectsService = projectsService;
        _contractorsService = contractorsService;
        _lotsService = lotsService;
        _proceduresService = proceduresService;
        _contractsService = contractsService;
    }

    public async Task<RegistryExportFileDto> ExportProjectsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var rows = await _projectsService.ListAsync(search, cancellationToken);

        return BuildCsv(
            "projects",
            ["Id", "Code", "Name", "GipUserId"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Code,
                x.Name,
                FormatGuid(x.GipUserId)
            }));
    }

    public async Task<RegistryExportFileDto> ExportContractorsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var rows = await _contractorsService.ListAsync(search, cancellationToken);

        return BuildCsv(
            "contractors",
            ["Id", "Inn", "Name", "City", "Status", "ReliabilityClass", "CurrentRating", "CurrentLoadPercent"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Inn,
                x.Name,
                x.City,
                x.Status.ToString(),
                x.ReliabilityClass.ToString(),
                FormatDecimal(x.CurrentRating),
                FormatDecimal(x.CurrentLoadPercent)
            }));
    }

    public async Task<RegistryExportFileDto> ExportLotsAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _lotsService.ListAsync(search, status, projectId, cancellationToken);

        return BuildCsv(
            "lots",
            ["Id", "Code", "Name", "Status", "ResponsibleCommercialUserId", "ItemsCount", "TotalManHours"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Code,
                x.Name,
                x.Status.ToString(),
                FormatGuid(x.ResponsibleCommercialUserId),
                x.ItemsCount.ToString(CultureInfo.InvariantCulture),
                FormatDecimal(x.TotalManHours)
            }));
    }

    public async Task<RegistryExportFileDto> ExportProceduresAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _proceduresService.ListAsync(search, status, lotId, cancellationToken);

        return BuildCsv(
            "procedures",
            ["Id", "LotId", "Status", "PurchaseTypeCode", "ObjectName", "InitiatorUserId", "ResponsibleCommercialUserId", "RequiredSubcontractorDeadline", "ApprovalMode"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.LotId.ToString(),
                x.Status.ToString(),
                x.PurchaseTypeCode,
                x.ObjectName,
                FormatGuid(x.InitiatorUserId),
                FormatGuid(x.ResponsibleCommercialUserId),
                FormatDate(x.RequiredSubcontractorDeadline),
                x.ApprovalMode.ToString()
            }));
    }

    public async Task<RegistryExportFileDto> ExportContractsAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _contractsService.ListAsync(
            search,
            status,
            lotId,
            procedureId,
            contractorId,
            cancellationToken);

        return BuildCsv(
            "contracts",
            [
                "Id",
                "ContractNumber",
                "LotId",
                "ProcedureId",
                "ContractorId",
                "ContractorName",
                "Status",
                "SigningDate",
                "AmountWithoutVat",
                "VatAmount",
                "TotalAmount",
                "StartDate",
                "EndDate"
            ],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.ContractNumber,
                x.LotId.ToString(),
                x.ProcedureId.ToString(),
                x.ContractorId.ToString(),
                x.ContractorName ?? string.Empty,
                x.Status.ToString(),
                FormatDate(x.SigningDate),
                FormatDecimal(x.AmountWithoutVat),
                FormatDecimal(x.VatAmount),
                FormatDecimal(x.TotalAmount),
                FormatDate(x.StartDate),
                FormatDate(x.EndDate)
            }));
    }

    private static RegistryExportFileDto BuildCsv(
        string filePrefix,
        IReadOnlyList<string> headers,
        IEnumerable<IReadOnlyList<string?>> rows)
    {
        var builder = new StringBuilder(4096);
        AppendRow(builder, headers);
        foreach (var row in rows)
        {
            AppendRow(builder, row);
        }

        var utcNow = DateTime.UtcNow;
        var fileName = $"{filePrefix}-{utcNow:yyyyMMdd-HHmmss}.csv";
        var content = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(builder.ToString());
        return new RegistryExportFileDto(fileName, CsvContentType, content);
    }

    private static void AppendRow(StringBuilder builder, IReadOnlyList<string?> values)
    {
        for (var i = 0; i < values.Count; i++)
        {
            if (i > 0)
            {
                builder.Append(',');
            }

            builder.Append(EscapeCsv(values[i]));
        }

        builder.AppendLine();
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var hasSpecialSymbols = value.Contains(',') ||
                                value.Contains('"') ||
                                value.Contains('\n') ||
                                value.Contains('\r');
        if (!hasSpecialSymbols)
        {
            return value;
        }

        return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }

    private static string FormatGuid(Guid? value)
    {
        return value?.ToString() ?? string.Empty;
    }

    private static string FormatDate(DateTime? value)
    {
        return value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;
    }

    private static string FormatDecimal(decimal value)
    {
        return value.ToString("0.##", CultureInfo.InvariantCulture);
    }
}
