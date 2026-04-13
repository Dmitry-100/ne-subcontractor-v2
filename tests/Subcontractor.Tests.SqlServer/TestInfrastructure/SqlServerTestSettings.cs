namespace Subcontractor.Tests.SqlServer.TestInfrastructure;

internal static class SqlServerTestSettings
{
    private const string EnabledVariable = "SUBCONTRACTOR_SQL_TESTS";
    private const string ServerConnectionVariable = "SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION";
    private const string DefaultServerConnection =
        "Server=localhost,1433;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False";

    public static bool IsEnabled =>
        string.Equals(Environment.GetEnvironmentVariable(EnabledVariable), "1", StringComparison.OrdinalIgnoreCase);

    public static string ServerConnectionString =>
        string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ServerConnectionVariable))
            ? DefaultServerConnection
            : Environment.GetEnvironmentVariable(ServerConnectionVariable)!.Trim();
}
