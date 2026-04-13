using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Infrastructure.Persistence;

namespace Subcontractor.Tests.SqlServer.TestInfrastructure;

internal sealed class SqlServerTestDatabase : IAsyncDisposable
{
    private const int SqlCommandTimeoutSeconds = 180;
    private readonly string _masterConnectionString;
    private bool _disposed;

    private SqlServerTestDatabase(string masterConnectionString, string databaseName, string connectionString)
    {
        _masterConnectionString = masterConnectionString;
        DatabaseName = databaseName;
        ConnectionString = connectionString;
    }

    public string DatabaseName { get; }
    public string ConnectionString { get; }

    public static async Task<SqlServerTestDatabase> CreateMigratedAsync(
        string? userLogin = null,
        CancellationToken cancellationToken = default)
    {
        var masterConnectionString = SqlServerTestSettings.ServerConnectionString;
        await EnsureSqlServerReachableAsync(masterConnectionString, cancellationToken);

        var databaseName = $"SubcontractorSqlTest_{Guid.NewGuid():N}";
        await CreateDatabaseAsync(masterConnectionString, databaseName, cancellationToken);

        var connectionString = BuildDatabaseConnectionString(masterConnectionString, databaseName);
        var database = new SqlServerTestDatabase(masterConnectionString, databaseName, connectionString);

        await using (var context = database.CreateDbContext(userLogin))
        {
            await context.Database.MigrateAsync(cancellationToken);
        }

        await using (var connection = new SqlConnection(connectionString))
        {
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandTimeout = SqlCommandTimeoutSeconds;
            command.CommandText = $"ALTER DATABASE [{EscapeDatabaseName(databaseName)}] SET COMPATIBILITY_LEVEL = 130";
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return database;
    }

    public AppDbContext CreateDbContext(string? userLogin = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(ConnectionString, sql => sql.CommandTimeout(SqlCommandTimeoutSeconds))
            .EnableDetailedErrors()
            .EnableSensitiveDataLogging()
            .Options;

        return new AppDbContext(options, new SqlServerTestCurrentUserService(userLogin ?? "sql-test-user"));
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;

        try
        {
            await DropDatabaseAsync(_masterConnectionString, DatabaseName);
        }
        catch
        {
            // Cleanup should not shadow the original test failure.
        }
    }

    private static string BuildDatabaseConnectionString(string masterConnectionString, string databaseName)
    {
        var builder = new SqlConnectionStringBuilder(masterConnectionString)
        {
            InitialCatalog = databaseName
        };

        return builder.ConnectionString;
    }

    private static async Task EnsureSqlServerReachableAsync(string masterConnectionString, CancellationToken cancellationToken)
    {
        const int maxAttempts = 60;
        var delay = TimeSpan.FromMilliseconds(500);

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var connection = new SqlConnection(masterConnectionString);
                await connection.OpenAsync(cancellationToken);
                return;
            }
            catch (Exception) when (attempt < maxAttempts)
            {
                await Task.Delay(delay, cancellationToken);
            }
        }

        throw new InvalidOperationException(
            "SQL Server is not reachable for SQL-backed tests. " +
            "Start local SQL container and set SUBCONTRACTOR_SQL_TESTS=1.");
    }

    private static async Task CreateDatabaseAsync(
        string masterConnectionString,
        string databaseName,
        CancellationToken cancellationToken)
    {
        var escapedDatabaseName = EscapeDatabaseName(databaseName);

        await using var connection = new SqlConnection(masterConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandTimeout = SqlCommandTimeoutSeconds;
        command.CommandText = $"CREATE DATABASE [{escapedDatabaseName}]";
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task DropDatabaseAsync(string masterConnectionString, string databaseName)
    {
        var escapedDatabaseName = EscapeDatabaseName(databaseName);

        await using var connection = new SqlConnection(masterConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandTimeout = SqlCommandTimeoutSeconds;
        command.CommandText =
            $"""
             IF DB_ID(N'{databaseName.Replace("'", "''")}') IS NOT NULL
             BEGIN
                 ALTER DATABASE [{escapedDatabaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                 DROP DATABASE [{escapedDatabaseName}];
             END
             """;
        await command.ExecuteNonQueryAsync();
    }

    private static string EscapeDatabaseName(string value) => value.Replace("]", "]]");

    private sealed class SqlServerTestCurrentUserService : ICurrentUserService
    {
        public SqlServerTestCurrentUserService(string userLogin)
        {
            UserLogin = userLogin;
        }

        public string UserLogin { get; }
    }
}
