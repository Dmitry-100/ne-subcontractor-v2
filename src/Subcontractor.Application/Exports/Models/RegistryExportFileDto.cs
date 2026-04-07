namespace Subcontractor.Application.Exports.Models;

public sealed record RegistryExportFileDto(
    string FileName,
    string ContentType,
    byte[] Content);
