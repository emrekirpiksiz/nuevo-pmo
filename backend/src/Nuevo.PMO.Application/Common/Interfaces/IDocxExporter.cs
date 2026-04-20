namespace Nuevo.PMO.Application.Common.Interfaces;

public interface IDocxExporter
{
    byte[] ExportFromMarkdown(string title, string markdown);
}
