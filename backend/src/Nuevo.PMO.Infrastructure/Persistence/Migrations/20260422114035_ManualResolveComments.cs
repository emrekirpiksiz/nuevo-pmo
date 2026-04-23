using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nuevo.PMO.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ManualResolveComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AddressedInVersionId + AddressedBlockText kolonlarını tamamen kaldır.
            migrationBuilder.DropForeignKey(
                name: "FK_comments_document_versions_AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropIndex(
                name: "IX_comments_AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropColumn(
                name: "AddressedInVersionId",
                schema: "pmo",
                table: "comments");

            migrationBuilder.DropColumn(
                name: "AddressedBlockText",
                schema: "pmo",
                table: "comments");

            // AddressedAt/By → ResolvedAt/By rename (semantik aynı kolonlar).
            migrationBuilder.RenameColumn(
                name: "AddressedAt",
                schema: "pmo",
                table: "comments",
                newName: "ResolvedAt");

            migrationBuilder.RenameColumn(
                name: "AddressedBy",
                schema: "pmo",
                table: "comments",
                newName: "ResolvedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ResolvedBy",
                schema: "pmo",
                table: "comments",
                newName: "AddressedBy");

            migrationBuilder.RenameColumn(
                name: "ResolvedAt",
                schema: "pmo",
                table: "comments",
                newName: "AddressedAt");

            migrationBuilder.AddColumn<string>(
                name: "AddressedBlockText",
                schema: "pmo",
                table: "comments",
                type: "character varying(4096)",
                maxLength: 4096,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_comments_AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                column: "AddressedInVersionId");

            migrationBuilder.AddForeignKey(
                name: "FK_comments_document_versions_AddressedInVersionId",
                schema: "pmo",
                table: "comments",
                column: "AddressedInVersionId",
                principalSchema: "pmo",
                principalTable: "document_versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
