using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nuevo.PMO.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProjectPlanAndReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_plan_snapshots",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    OverallProgress = table.Column<int>(type: "integer", nullable: false),
                    BodyJson = table.Column<string>(type: "jsonb", nullable: false),
                    ChangeNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_plan_snapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_plan_snapshots_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "pmo",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_plans",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_plans_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "pmo",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "project_reports",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ReportDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OverallProgress = table.Column<int>(type: "integer", nullable: true),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: false),
                    Summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_reports_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "pmo",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plan_milestones",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Deadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_milestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plan_milestones_project_plans_ProjectPlanId",
                        column: x => x.ProjectPlanId,
                        principalSchema: "pmo",
                        principalTable: "project_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plan_steps",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentStepId = table.Column<Guid>(type: "uuid", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    StartYearWeek = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    EndYearWeek = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    PlannedManDays = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    ActualManDays = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    Progress = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plan_steps_plan_steps_ParentStepId",
                        column: x => x.ParentStepId,
                        principalSchema: "pmo",
                        principalTable: "plan_steps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_plan_steps_project_plans_ProjectPlanId",
                        column: x => x.ProjectPlanId,
                        principalSchema: "pmo",
                        principalTable: "project_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_plan_milestones_ProjectPlanId_Type_Order",
                schema: "pmo",
                table: "plan_milestones",
                columns: new[] { "ProjectPlanId", "Type", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_plan_steps_ParentStepId",
                schema: "pmo",
                table: "plan_steps",
                column: "ParentStepId");

            migrationBuilder.CreateIndex(
                name: "IX_plan_steps_ProjectPlanId_Order",
                schema: "pmo",
                table: "plan_steps",
                columns: new[] { "ProjectPlanId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_project_plan_snapshots_ProjectId_CreatedAt",
                schema: "pmo",
                table: "project_plan_snapshots",
                columns: new[] { "ProjectId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_project_plans_ProjectId",
                schema: "pmo",
                table: "project_plans",
                column: "ProjectId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_reports_ProjectId_ReportDate",
                schema: "pmo",
                table: "project_reports",
                columns: new[] { "ProjectId", "ReportDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "plan_milestones",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "plan_steps",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "project_plan_snapshots",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "project_reports",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "project_plans",
                schema: "pmo");
        }
    }
}
