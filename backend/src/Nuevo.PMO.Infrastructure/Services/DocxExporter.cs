using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Markdig;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Nuevo.PMO.Application.Common.Interfaces;

namespace Nuevo.PMO.Infrastructure.Services;

public class DocxExporter : IDocxExporter
{
    public byte[] ExportFromMarkdown(string title, string markdown)
    {
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;

            if (!string.IsNullOrWhiteSpace(title))
            {
                body.AppendChild(BuildHeading(title, 1));
            }

            var md = Markdown.Parse(markdown ?? string.Empty);
            foreach (var block in md)
            {
                RenderBlock(body, block);
            }

            mainPart.Document.Save();
        }
        return ms.ToArray();
    }

    private static void RenderBlock(Body body, Block block)
    {
        switch (block)
        {
            case HeadingBlock h:
                body.AppendChild(BuildHeading(InlineText(h.Inline), h.Level));
                break;
            case ParagraphBlock p:
                body.AppendChild(BuildParagraph(InlineText(p.Inline)));
                break;
            case ListBlock list:
                foreach (var item in list)
                {
                    if (item is ListItemBlock li)
                    {
                        foreach (var child in li)
                        {
                            if (child is ParagraphBlock pp)
                            {
                                body.AppendChild(BuildListItem(InlineText(pp.Inline), list.IsOrdered));
                            }
                        }
                    }
                }
                break;
            case QuoteBlock q:
                foreach (var child in q)
                {
                    if (child is ParagraphBlock pp)
                    {
                        body.AppendChild(BuildParagraph("“" + InlineText(pp.Inline) + "”"));
                    }
                }
                break;
            case FencedCodeBlock fc:
                body.AppendChild(BuildParagraph(string.Join("\n", fc.Lines.Lines.Select(l => l.ToString()))));
                break;
            case ThematicBreakBlock:
                body.AppendChild(new Paragraph(new Run(new Text("——————"))));
                break;
            default:
                body.AppendChild(BuildParagraph(block.ToString() ?? string.Empty));
                break;
        }
    }

    private static string InlineText(ContainerInline? inline)
    {
        if (inline is null) return string.Empty;
        var sb = new System.Text.StringBuilder();
        foreach (var c in inline)
        {
            switch (c)
            {
                case LiteralInline lit:
                    sb.Append(lit.Content.ToString());
                    break;
                case EmphasisInline em:
                    sb.Append(InlineText(em));
                    break;
                case LineBreakInline:
                    sb.Append('\n');
                    break;
                case LinkInline link:
                    sb.Append(InlineText(link));
                    sb.Append(" (").Append(link.Url).Append(')');
                    break;
                case CodeInline code:
                    sb.Append(code.Content);
                    break;
                default:
                    sb.Append(c.ToString());
                    break;
            }
        }
        return sb.ToString();
    }

    private static Paragraph BuildHeading(string text, int level)
    {
        var p = new Paragraph();
        var pp = new ParagraphProperties(new ParagraphStyleId { Val = $"Heading{Math.Clamp(level, 1, 6)}" });
        p.AppendChild(pp);
        p.AppendChild(new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        return p;
    }

    private static Paragraph BuildParagraph(string text)
    {
        var p = new Paragraph();
        foreach (var (line, idx) in (text ?? "").Split('\n').Select((v, i) => (v, i)))
        {
            if (idx > 0) p.AppendChild(new Run(new Break()));
            p.AppendChild(new Run(new Text(line) { Space = SpaceProcessingModeValues.Preserve }));
        }
        return p;
    }

    private static Paragraph BuildListItem(string text, bool isOrdered)
    {
        var p = new Paragraph();
        var pp = new ParagraphProperties(
            new ParagraphStyleId { Val = isOrdered ? "ListNumber" : "ListBullet" });
        p.AppendChild(pp);
        p.AppendChild(new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        return p;
    }
}
