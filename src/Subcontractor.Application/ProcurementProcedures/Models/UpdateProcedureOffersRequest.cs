namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpdateProcedureOffersRequest
{
    public IReadOnlyCollection<UpsertProcedureOfferItemRequest> Items { get; set; } =
        Array.Empty<UpsertProcedureOfferItemRequest>();
}
