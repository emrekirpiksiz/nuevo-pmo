using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nuevo.PMO.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "pmo");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Action = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    BeforeJson = table.Column<string>(type: "jsonb", nullable: true),
                    AfterJson = table.Column<string>(type: "jsonb", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "customers",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_projects_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalSchema: "pmo",
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    UserType = table.Column<int>(type: "integer", nullable: false),
                    ExternalId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    PasswordHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalSchema: "pmo",
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invitations",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcceptedUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_invitations_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalSchema: "pmo",
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_invitations_users_AcceptedUserId",
                        column: x => x.AcceptedUserId,
                        principalSchema: "pmo",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "project_members",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_members_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "pmo",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_project_members_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "pmo",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "comment_replies",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CommentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comment_replies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "comments",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BlockId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AnchorText = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    Body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResolvedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "document_approvals",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_approvals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_approvals_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalSchema: "pmo",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "document_versions",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Major = table.Column<int>(type: "integer", nullable: false),
                    Minor = table.Column<int>(type: "integer", nullable: false),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: false),
                    ContentMarkdown = table.Column<string>(type: "text", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PublishedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_versions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "documents",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    CurrentDraftVersionId = table.Column<Guid>(type: "uuid", nullable: true),
                    PublishedVersionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedVersionId = table.Column<Guid>(type: "uuid", nullable: true),
                    PublishedCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_documents_document_versions_ApprovedVersionId",
                        column: x => x.ApprovedVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_documents_document_versions_CurrentDraftVersionId",
                        column: x => x.CurrentDraftVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_documents_document_versions_PublishedVersionId",
                        column: x => x.PublishedVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_documents_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "pmo",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "document_view_events",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastHeartbeatAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_view_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_view_events_document_versions_DocumentVersionId",
                        column: x => x.DocumentVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_document_view_events_documents_DocumentId",
                        column: x => x.DocumentId,
                        principalSchema: "pmo",
                        principalTable: "documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_document_view_events_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "pmo",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_CreatedAt",
                schema: "pmo",
                table: "audit_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_EntityType_EntityId",
                schema: "pmo",
                table: "audit_logs",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_comment_replies_CommentId",
                schema: "pmo",
                table: "comment_replies",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_comments_DocumentId_BlockId",
                schema: "pmo",
                table: "comments",
                columns: new[] { "DocumentId", "BlockId" });

            migrationBuilder.CreateIndex(
                name: "IX_comments_Status",
                schema: "pmo",
                table: "comments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_comments_VersionId",
                schema: "pmo",
                table: "comments",
                column: "VersionId");

            migrationBuilder.CreateIndex(
                name: "IX_customers_Name",
                schema: "pmo",
                table: "customers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_ApprovedBy",
                schema: "pmo",
                table: "document_approvals",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_DocumentVersionId_ApprovedBy",
                schema: "pmo",
                table: "document_approvals",
                columns: new[] { "DocumentVersionId", "ApprovedBy" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_versions_DocumentId_Major_Minor",
                schema: "pmo",
                table: "document_versions",
                columns: new[] { "DocumentId", "Major", "Minor" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_view_events_DocumentId_DocumentVersionId",
                schema: "pmo",
                table: "document_view_events",
                columns: new[] { "DocumentId", "DocumentVersionId" });

            migrationBuilder.CreateIndex(
                name: "IX_document_view_events_DocumentVersionId",
                schema: "pmo",
                table: "document_view_events",
                column: "DocumentVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_document_view_events_SessionId",
                schema: "pmo",
                table: "document_view_events",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_view_events_UserId",
                schema: "pmo",
                table: "document_view_events",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_documents_ApprovedVersionId",
                schema: "pmo",
                table: "documents",
                column: "ApprovedVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_documents_CurrentDraftVersionId",
                schema: "pmo",
                table: "documents",
                column: "CurrentDraftVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_documents_ProjectId",
                schema: "pmo",
                table: "documents",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_documents_PublishedVersionId",
                schema: "pmo",
                table: "documents",
                column: "PublishedVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_AcceptedUserId",
                schema: "pmo",
                table: "invitations",
                column: "AcceptedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_CustomerId",
                schema: "pmo",
                table: "invitations",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_Email",
                schema: "pmo",
                table: "invitations",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_TokenHash",
                schema: "pmo",
                table: "invitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_members_ProjectId_UserId",
                schema: "pmo",
                table: "project_members",
                columns: new[] { "ProjectId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_members_UserId",
                schema: "pmo",
                table: "project_members",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_projects_Code",
                schema: "pmo",
                table: "projects",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_projects_CustomerId",
                schema: "pmo",
                table: "projects",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_users_CustomerId",
                schema: "pmo",
                table: "users",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                schema: "pmo",
                table: "users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_ExternalId",
                schema: "pmo",
                table: "users",
                column: "ExternalId");

            migrationBuilder.AddForeignKey(
                name: "FK_comment_replies_comments_CommentId",
                schema: "pmo",
                table: "comment_replies",
                column: "CommentId",
                principalSchema: "pmo",
                principalTable: "comments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_comments_document_versions_VersionId",
                schema: "pmo",
                table: "comments",
                column: "VersionId",
                principalSchema: "pmo",
                principalTable: "document_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_comments_documents_DocumentId",
                schema: "pmo",
                table: "comments",
                column: "DocumentId",
                principalSchema: "pmo",
                principalTable: "documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_document_approvals_document_versions_DocumentVersionId",
                schema: "pmo",
                table: "document_approvals",
                column: "DocumentVersionId",
                principalSchema: "pmo",
                principalTable: "document_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_document_versions_documents_DocumentId",
                schema: "pmo",
                table: "document_versions",
                column: "DocumentId",
                principalSchema: "pmo",
                principalTable: "documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_document_versions_ApprovedVersionId",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropForeignKey(
                name: "FK_documents_document_versions_CurrentDraftVersionId",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropForeignKey(
                name: "FK_documents_document_versions_PublishedVersionId",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropTable(
                name: "audit_logs",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "comment_replies",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "document_approvals",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "document_view_events",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "invitations",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "project_members",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "comments",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "users",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "document_versions",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "documents",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "projects",
                schema: "pmo");

            migrationBuilder.DropTable(
                name: "customers",
                schema: "pmo");
        }
    }
}
