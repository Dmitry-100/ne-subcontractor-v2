using Subcontractor.Application.Analytics.Models;

namespace Subcontractor.Application.Analytics;

public sealed class AnalyticsViewCatalogQueryService
{
    public Task<IReadOnlyList<AnalyticsViewDescriptorDto>> GetViewCatalogAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<AnalyticsViewDescriptorDto> catalog =
        [
            new("vwAnalytics_LotFunnel", "Воронка лотов по статусам.", "Status", "KPI dashboard / Power BI"),
            new("vwAnalytics_ContractorLoad", "Профиль загрузки подрядчиков.", "Contractor", "Load and capacity analytics"),
            new("vwAnalytics_SlaMetrics", "SLA-метрики по severity и статусу.", "Severity + IsResolved", "SLA monitoring"),
            new("vwAnalytics_ContractingAmounts", "Суммы контрактования по статусам договоров.", "Contract status", "Finance and procurement analytics"),
            new("vwAnalytics_MdrProgress", "Покрытие MDR строк факт-данными.", "Card + Row", "MDR execution analytics"),
            new("vwAnalytics_SubcontractingShare", "Доля контрактованного субподряда по man-hours.", "Global", "Management KPI"),
            new("vwAnalytics_ContractorRatings", "Свод текущих рейтингов и загрузки подрядчиков.", "Contractor", "Rating and shortlist analytics")
        ];

        return Task.FromResult(catalog);
    }
}
