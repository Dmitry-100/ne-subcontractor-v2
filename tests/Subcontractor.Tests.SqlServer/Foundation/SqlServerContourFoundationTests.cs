using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Foundation;

[Trait("SqlSuite", "Core")]
public sealed class SqlServerContourFoundationTests
{
    [SqlFact]
    public async Task Migrations_ShouldCreateSchema_AndSetCompatibilityLevel130()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();

        var compatibilityLevel = await ReadCompatibilityLevelAsync(database.ConnectionString);
        Assert.Equal(130, compatibilityLevel);

        var projectsTableExists = await TableExistsAsync(database.ConnectionString, "ProjectsSet");
        Assert.True(projectsTableExists);
    }

    [SqlFact]
    public async Task UniqueIndex_OnProjects_Code_ShouldBeEnforced()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();

        await using var context = database.CreateDbContext();
        await context.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-SQL-001",
            Name = "SQL test project 1"
        });
        await context.SaveChangesAsync();

        await context.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-SQL-001",
            Name = "SQL test project 2"
        });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [SqlFact]
    public async Task ForeignKey_OnLotItems_LotId_ShouldBeEnforced()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();

        await using var context = database.CreateDbContext();
        await context.Set<LotItem>().AddAsync(new LotItem
        {
            LotId = Guid.NewGuid(),
            ProjectId = Guid.NewGuid(),
            ObjectWbs = "WBS.SQL.001",
            DisciplineCode = "PIPING",
            ManHours = 12.5m
        });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    private static async Task<int> ReadCompatibilityLevelAsync(string connectionString)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()";
        var value = await command.ExecuteScalarAsync();

        return Convert.ToInt32(value);
    }

    private static async Task<bool> TableExistsAsync(string connectionString, string tableName)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText =
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = @tableName";
        command.Parameters.AddWithValue("@tableName", tableName);

        var count = Convert.ToInt32(await command.ExecuteScalarAsync());
        return count > 0;
    }
}
