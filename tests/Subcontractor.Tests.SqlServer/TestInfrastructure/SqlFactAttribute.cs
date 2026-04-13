namespace Subcontractor.Tests.SqlServer.TestInfrastructure;

internal sealed class SqlFactAttribute : FactAttribute
{
    public SqlFactAttribute()
    {
        if (SqlServerTestSettings.IsEnabled)
        {
            return;
        }

        Skip =
            "SQL-backed tests are disabled. Set SUBCONTRACTOR_SQL_TESTS=1 " +
            "and start SQL Server on localhost:1433.";
    }
}
