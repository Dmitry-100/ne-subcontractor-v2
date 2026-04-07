using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate0001 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Inn = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    City = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContactName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CapacityHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CurrentRating = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    CurrentLoadPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    ManualSupportCoefficient = table.Column<decimal>(type: "decimal(8,4)", nullable: true),
                    ReliabilityClass = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContractsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractNumber = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    SigningDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AmountWithoutVat = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    VatAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FilesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Content = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    OwnerEntityType = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OwnerEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FilesSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LotsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    ResponsibleCommercialUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LotsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProceduresSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PurchaseTypeCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    InitiatorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ResponsibleCommercialUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ObjectName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    WorkScope = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    LeadOfficeCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CustomerContractNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerContractDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RequiredSubcontractorDeadline = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContainsConfidentialInfo = table.Column<bool>(type: "bit", nullable: false),
                    RequiresTechnicalNegotiations = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProceduresSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProjectsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    GipUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceDataEntriesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TypeCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ItemCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceDataEntriesSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UsersSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExternalId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Login = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsersSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContractorQualificationsSet",
                columns: table => new
                {
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisciplineCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorQualificationsSet", x => new { x.ContractorId, x.DisciplineCode });
                    table.ForeignKey(
                        name: "FK_ContractorQualificationsSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LotItemsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObjectWbs = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DisciplineCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ManHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PlannedStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlannedFinishDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LotItemsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LotItemsSet_LotsSet_LotId",
                        column: x => x.LotId,
                        principalTable: "LotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissionsSet",
                columns: table => new
                {
                    AppRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PermissionCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissionsSet", x => new { x.AppRoleId, x.PermissionCode });
                    table.ForeignKey(
                        name: "FK_RolePermissionsSet_RolesSet_AppRoleId",
                        column: x => x.AppRoleId,
                        principalTable: "RolesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRolesSet",
                columns: table => new
                {
                    AppUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRolesSet", x => new { x.AppUserId, x.AppRoleId });
                    table.ForeignKey(
                        name: "FK_UserRolesSet_RolesSet_AppRoleId",
                        column: x => x.AppRoleId,
                        principalTable: "RolesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRolesSet_UsersSet_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorsSet_Inn",
                table: "ContractorsSet",
                column: "Inn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ContractNumber",
                table: "ContractsSet",
                column: "ContractNumber");

            migrationBuilder.CreateIndex(
                name: "IX_LotItemsSet_LotId",
                table: "LotItemsSet",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_LotsSet_Code",
                table: "LotsSet",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProceduresSet_LotId",
                table: "ProceduresSet",
                column: "LotId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectsSet_Code",
                table: "ProjectsSet",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceDataEntriesSet_TypeCode_ItemCode",
                table: "ReferenceDataEntriesSet",
                columns: new[] { "TypeCode", "ItemCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolesSet_Name",
                table: "RolesSet",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRolesSet_AppRoleId",
                table: "UserRolesSet",
                column: "AppRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_Login",
                table: "UsersSet",
                column: "Login",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorQualificationsSet");

            migrationBuilder.DropTable(
                name: "ContractsSet");

            migrationBuilder.DropTable(
                name: "FilesSet");

            migrationBuilder.DropTable(
                name: "LotItemsSet");

            migrationBuilder.DropTable(
                name: "ProceduresSet");

            migrationBuilder.DropTable(
                name: "ProjectsSet");

            migrationBuilder.DropTable(
                name: "ReferenceDataEntriesSet");

            migrationBuilder.DropTable(
                name: "RolePermissionsSet");

            migrationBuilder.DropTable(
                name: "UserRolesSet");

            migrationBuilder.DropTable(
                name: "ContractorsSet");

            migrationBuilder.DropTable(
                name: "LotsSet");

            migrationBuilder.DropTable(
                name: "RolesSet");

            migrationBuilder.DropTable(
                name: "UsersSet");
        }
    }
}
