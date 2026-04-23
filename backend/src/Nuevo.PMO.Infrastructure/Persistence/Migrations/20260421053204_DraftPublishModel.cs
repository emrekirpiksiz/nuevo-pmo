using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nuevo.PMO.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DraftPublishModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------- documents: Draft content alanları ----------
            migrationBuilder.AddColumn<string>(
                name: "DraftContentJson",
                schema: "pmo",
                table: "documents",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb");

            migrationBuilder.AddColumn<string>(
                name: "DraftContentMarkdown",
                schema: "pmo",
                table: "documents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DraftUpdatedAt",
                schema: "pmo",
                table: "documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DraftUpdatedBy",
                schema: "pmo",
                table: "documents",
                type: "uuid",
                nullable: true);

            // Mevcut dokümanların Draft içeriğini en son sürümün içeriğinden doldur.
            migrationBuilder.Sql(@"
                UPDATE pmo.documents d
                SET
                    ""DraftContentJson"" = v.""ContentJson"",
                    ""DraftContentMarkdown"" = v.""ContentMarkdown"",
                    ""DraftUpdatedAt"" = COALESCE(v.""UpdatedAt"", v.""CreatedAt"")
                FROM (
                    SELECT DISTINCT ON (""DocumentId"")
                        ""DocumentId"", ""ContentJson"", ""ContentMarkdown"", ""CreatedAt"", ""UpdatedAt""
                    FROM pmo.document_versions
                    WHERE ""IsDeleted"" = false
                    ORDER BY ""DocumentId"", ""Major"" DESC, ""Minor"" DESC
                ) v
                WHERE d.""Id"" = v.""DocumentId"";
            ");

            // ---------- comments: Resolved* → Addressed* rename + yeni alanlar ----------
            migrationBuilder.RenameColumn(
                name: "ResolvedAt",
                schema: "pmo",
                table: "comments",
                newName: "AddressedAt");

            migrationBuilder.RenameColumn(
                name: "ResolvedBy",
                schema: "pmo",
                table: "comments",
                newName: "AddressedBy");

            migrationBuilder.AddColumn<Guid>(
                name: "ForVersionId",
                schema: "pmo",
                table: "comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressedBlockText",
                schema: "pmo",
                table: "comments",
                type: "character varying(4096)",
                maxLength: 4096,
                nullable: true);

            // Mevcut yorumları yeni modele eşleyelim:
            //  - Açık yorumlar (Status=1): yazıldığı doküman için doc.CustomerVersionId
            //    atanır (varsa). Yoksa null kalır.
            //  - Eski "Resolved" (Status=2) yorumlar artık "Addressed" semantiğinde;
            //    AddressedInVersionId için mevcut CustomerVersionId uygun bir varsayım
            //    (elimizde tam tarih-bazlı eşleme yok).
            migrationBuilder.Sql(@"
                UPDATE pmo.comments c
                SET ""ForVersionId"" = d.""CustomerVersionId""
                FROM pmo.documents d
                WHERE c.""DocumentId"" = d.""Id"" AND c.""Status"" = 1;

                UPDATE pmo.comments c
                SET ""AddressedInVersionId"" = d.""CustomerVersionId""
                FROM pmo.documents d
                WHERE c.""DocumentId"" = d.""Id"" AND c.""Status"" = 2 AND c.""AddressedInVersionId"" IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_comments_ForVersionId",
                schema: "pmo",
                table: "comments",
                column: "ForVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_comments_AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                column: "AddressedInVersionId");

            migrationBuilder.AddForeignKey(
                name: "FK_comments_document_versions_ForVersionId",
                schema: "pmo",
                table: "comments",
                column: "ForVersionId",
                principalSchema: "pmo",
                principalTable: "document_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_comments_document_versions_AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                column: "AddressedInVersionId",
                principalSchema: "pmo",
                principalTable: "document_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ---------- document_block_changes tablosu ----------
            migrationBuilder.CreateTable(
                name: "document_block_changes",
                schema: "pmo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromVersionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ToVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BlockId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    OldText = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: true),
                    NewText = table.Column<string>(type: "character varying(8192)", maxLength: 8192, nullable: true),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    RelatedCommentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_block_changes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_block_changes_comments_RelatedCommentId",
                        column: x => x.RelatedCommentId,
                        principalSchema: "pmo",
                        principalTable: "comments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_document_block_changes_document_versions_FromVersionId",
                        column: x => x.FromVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_document_block_changes_document_versions_ToVersionId",
                        column: x => x.ToVersionId,
                        principalSchema: "pmo",
                        principalTable: "document_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_document_block_changes_documents_DocumentId",
                        column: x => x.DocumentId,
                        principalSchema: "pmo",
                        principalTable: "documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_document_block_changes_DocumentId_ToVersionId",
                schema: "pmo",
                table: "document_block_changes",
                columns: new[] { "DocumentId", "ToVersionId" });

            migrationBuilder.CreateIndex(
                name: "IX_document_block_changes_FromVersionId",
                schema: "pmo",
                table: "document_block_changes",
                column: "FromVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_document_block_changes_RelatedCommentId",
                schema: "pmo",
                table: "document_block_changes",
                column: "RelatedCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_document_block_changes_ToVersionId",
                schema: "pmo",
                table: "document_block_changes",
                column: "ToVersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_block_changes",
                schema: "pmo");

            migrationBuilder.DropForeignKey(
                name: "FK_comments_document_versions_AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropForeignKey(
                name: "FK_comments_document_versions_ForVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropIndex(
                name: "IX_comments_AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropIndex(
                name: "IX_comments_ForVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropColumn(
                name: "AddressedBlockText",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropColumn(
                name: "AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropColumn(
                name: "ForVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.RenameColumn(
                name: "AddressedBy",
                schema: "pmo",
                table: "comments",
                newName: "ResolvedBy");

            migrationBuilder.RenameColumn(
                name: "AddressedAt",
                schema: "pmo",
                table: "comments",
                newName: "ResolvedAt");

            migrationBuilder.DropColumn(
                name: "DraftUpdatedBy",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "DraftUpdatedAt",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "DraftContentMarkdown",
                schema: "pmo",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "DraftContentJson",
                schema: "pmo",
                table: "documents");
        }
    }
}
