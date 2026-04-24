using System.Text.RegularExpressions;
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

            // Stil tanımlarını ekle
            AddDocumentStyles(mainPart);

            var body = mainPart.Document.Body!;

            // Kapak satırı: şirket adı + tarih
            body.AppendChild(BuildCoverLine());

            // Belge başlığı
            if (!string.IsNullOrWhiteSpace(title))
            {
                body.AppendChild(BuildDocTitle(title));
            }

            // Ayırıcı boşluk
            body.AppendChild(new Paragraph(new Run(new Text(""))));

            // İçerik
            var md = Markdown.Parse(markdown ?? string.Empty);
            foreach (var block in md)
            {
                RenderBlock(body, block);
            }

            // Sayfa kenar boşlukları
            var sectProps = new SectionProperties(
                new PageMargin
                {
                    Top = 1440,    // 1 inç = 1440 twip
                    Bottom = 1440,
                    Left = 1440,
                    Right = 1440,
                    Header = 720,
                    Footer = 720,
                }
            );
            body.AppendChild(sectProps);

            mainPart.Document.Save();
        }
        return ms.ToArray();
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Stil tanımları
    // ──────────────────────────────────────────────────────────────────────

    private static void AddDocumentStyles(MainDocumentPart mainPart)
    {
        var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
        var styles = new Styles();

        styles.Append(CreateNormalStyle());
        styles.Append(CreateHeadingStyle("Heading1", 1, "380000", 28, true));
        styles.Append(CreateHeadingStyle("Heading2", 2, "5A3D1E", 22, true));
        styles.Append(CreateHeadingStyle("Heading3", 3, "6B5132", 16, false));
        styles.Append(CreateHeadingStyle("Heading4", 4, "8A6D3B", 14, false));
        styles.Append(CreateListStyle("ListBullet", "ListBullet"));
        styles.Append(CreateListStyle("ListNumber", "ListNumber"));

        stylesPart.Styles = styles;
        stylesPart.Styles.Save();
    }

    private static Style CreateNormalStyle()
    {
        var style = new Style
        {
            Type = StyleValues.Paragraph,
            StyleId = "Normal",
            Default = true,
        };
        style.Append(new StyleName { Val = "Normal" });
        var rpr = new StyleRunProperties();
        rpr.Append(new FontSize { Val = "22" }); // 11pt
        rpr.Append(new Color { Val = "1A1D21" });
        style.Append(new StyleParagraphProperties(
            new SpacingBetweenLines { After = "120", Line = "276", LineRule = LineSpacingRuleValues.Auto }
        ));
        style.Append(rpr);
        return style;
    }

    private static Style CreateHeadingStyle(string styleId, int level, string colorHex, int ptSize, bool bold)
    {
        var style = new Style
        {
            Type = StyleValues.Paragraph,
            StyleId = styleId,
        };
        style.Append(new StyleName { Val = styleId });
        style.Append(new BasedOn { Val = "Normal" });

        // Heading öncesi/sonrası boşluk
        int spaceBefore = level == 1 ? 480 : level == 2 ? 360 : 240;
        int spaceAfter  = level == 1 ? 200 : 120;

        var ppr = new StyleParagraphProperties(
            new SpacingBetweenLines
            {
                Before = spaceBefore.ToString(),
                After = spaceAfter.ToString(),
            }
        );
        style.Append(ppr);

        var rpr = new StyleRunProperties();
        rpr.Append(new Color { Val = colorHex });
        rpr.Append(new FontSize { Val = (ptSize * 2).ToString() });
        if (bold) rpr.Append(new Bold());
        style.Append(rpr);

        return style;
    }

    private static Style CreateListStyle(string styleId, string name)
    {
        var style = new Style
        {
            Type = StyleValues.Paragraph,
            StyleId = styleId,
        };
        style.Append(new StyleName { Val = name });
        style.Append(new BasedOn { Val = "Normal" });
        style.Append(new StyleParagraphProperties(
            new Indentation { Left = "720", Hanging = "360" },
            new SpacingBetweenLines { After = "80" }
        ));
        return style;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Kapak satırı ve belge başlığı
    // ──────────────────────────────────────────────────────────────────────

    private static Paragraph BuildCoverLine()
    {
        var p = new Paragraph();
        var ppr = new ParagraphProperties(
            new SpacingBetweenLines { After = "40" }
        );
        p.AppendChild(ppr);

        var r = new Run();
        var rpr = new RunProperties(
            new Color { Val = "8A6D3B" },
            new FontSize { Val = "18" }
        );
        r.AppendChild(rpr);
        r.AppendChild(new Text(
            $"Nuevo Project Management Portal  ·  {DateTime.Now:dd.MM.yyyy}"
        ) { Space = SpaceProcessingModeValues.Preserve });
        p.AppendChild(r);
        return p;
    }

    private static Paragraph BuildDocTitle(string text)
    {
        var p = new Paragraph();
        var ppr = new ParagraphProperties(
            new ParagraphStyleId { Val = "Heading1" },
            new ParagraphBorders(new BottomBorder { Val = BorderValues.Single, Color = "D6CFB8", Size = 4, Space = 8 }),
            new SpacingBetweenLines { Before = "0", After = "240" }
        );
        p.AppendChild(ppr);
        var r = new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        p.AppendChild(r);
        return p;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Markdown blok renderı
    // ──────────────────────────────────────────────────────────────────────

    private static void RenderBlock(Body body, Block block)
    {
        switch (block)
        {
            case HeadingBlock h:
                body.AppendChild(BuildHeading(InlineContent(h.Inline), h.Level));
                break;

            case ParagraphBlock p:
                body.AppendChild(BuildRichParagraph(p.Inline));
                break;

            case ListBlock list:
                bool ordered = list.IsOrdered;
                foreach (var item in list)
                {
                    if (item is not ListItemBlock li) continue;
                    foreach (var child in li)
                    {
                        if (child is ParagraphBlock pp)
                            body.AppendChild(BuildListItem(pp.Inline, ordered));
                    }
                }
                break;

            case QuoteBlock q:
                foreach (var child in q)
                {
                    if (child is ParagraphBlock pp)
                        body.AppendChild(BuildBlockquote(InlineContent(pp.Inline)));
                }
                break;

            case FencedCodeBlock fc:
                body.AppendChild(BuildCodeBlock(
                    string.Join("\n", fc.Lines.Lines.Select(l => l.ToString()))));
                break;

            case ThematicBreakBlock:
                body.AppendChild(BuildHorizontalRule());
                break;

            case HtmlBlock html:
                var htmlContent = string.Join("\n", html.Lines.Lines.Select(l => l.ToString()));
                // Tablo HTML'si ise Word tablosuna dönüştür
                if (htmlContent.Contains("<table", StringComparison.OrdinalIgnoreCase))
                {
                    var table = TryBuildHtmlTable(htmlContent);
                    if (table is not null)
                    {
                        body.AppendChild(table);
                        body.AppendChild(new Paragraph(new Run(new Text("")))); // tablo sonrası boşluk
                        break;
                    }
                }
                // Diğer HTML: tag'ları soy, düz metin olarak yaz
                var plainHtml = StripHtmlTags(htmlContent).Trim();
                if (!string.IsNullOrWhiteSpace(plainHtml))
                    body.AppendChild(BuildParagraph(plainHtml));
                break;

            default:
                // Bilinmeyen blok türü — tip adını çıkar, asıl içeriği gösterme
                break;
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  HTML yardımcıları
    // ──────────────────────────────────────────────────────────────────────

    private static string StripHtmlTags(string html) =>
        Regex.Replace(html ?? string.Empty, "<[^>]+>", " ")
             .Replace("&nbsp;", " ")
             .Replace("&amp;", "&")
             .Replace("&lt;", "<")
             .Replace("&gt;", ">")
             .Replace("&quot;", "\"");

    /// <summary>
    /// HTML table string'ini OpenXml Word tablosuna dönüştürmeye çalışır.
    /// Başarısızlık durumunda null döner.
    /// </summary>
    private static Table? TryBuildHtmlTable(string html)
    {
        try
        {
            // Satırları bul: <tr>...</tr>
            var rowMatches = Regex.Matches(html, @"<tr[^>]*>(.*?)</tr>",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);
            if (rowMatches.Count == 0) return null;

            var table = new Table();

            // Tablo özellikleri
            var tblPr = new TableProperties(
                new TableBorders(
                    new TopBorder    { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" },
                    new BottomBorder { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" },
                    new LeftBorder   { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" },
                    new RightBorder  { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" },
                    new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" },
                    new InsideVerticalBorder   { Val = BorderValues.Single, Size = 4, Color = "D6CFB8" }
                ),
                new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }
            );
            table.AppendChild(tblPr);

            bool firstRow = true;
            foreach (Match rowMatch in rowMatches)
            {
                var rowHtml = rowMatch.Groups[1].Value;
                // Hem <th> hem <td> hücrelerini yakala
                var cellMatches = Regex.Matches(rowHtml, @"<t[hd][^>]*>(.*?)</t[hd]>",
                    RegexOptions.IgnoreCase | RegexOptions.Singleline);
                if (cellMatches.Count == 0) continue;

                var row = new TableRow();
                if (firstRow)
                {
                    row.AppendChild(new TableRowProperties(
                        new TableHeader(),
                        new TableRowHeight { Val = 400 }
                    ));
                }

                foreach (Match cellMatch in cellMatches)
                {
                    var cellText = StripHtmlTags(cellMatch.Groups[1].Value).Trim();

                    var cell = new TableCell();
                    var cellPr = new TableCellProperties(
                        new TableCellMargin(
                            new LeftMargin  { Width = "100", Type = TableWidthUnitValues.Dxa },
                            new RightMargin { Width = "100", Type = TableWidthUnitValues.Dxa }
                        )
                    );
                    if (firstRow)
                    {
                        cellPr.AppendChild(new Shading { Val = ShadingPatternValues.Clear, Fill = "F0E6D2" });
                    }
                    cell.AppendChild(cellPr);

                    var cellPara = new Paragraph();
                    var cellRun = new Run(new Text(cellText) { Space = SpaceProcessingModeValues.Preserve });
                    if (firstRow)
                    {
                        var rpr = new RunProperties(new Bold(), new FontSize { Val = "20" });
                        cellRun.InsertAt(rpr, 0);
                    }
                    cellPara.AppendChild(cellRun);
                    cell.AppendChild(cellPara);
                    row.AppendChild(cell);
                }

                table.AppendChild(row);
                firstRow = false;
            }

            return table;
        }
        catch
        {
            return null;
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Inline içerik (bold / italic / code / link desteği)
    // ──────────────────────────────────────────────────────────────────────

    private static IEnumerable<Run> BuildRuns(ContainerInline? inline)
    {
        if (inline is null) yield break;
        foreach (var node in inline)
        {
            switch (node)
            {
                case LiteralInline lit:
                    yield return new Run(new Text(lit.Content.ToString()) { Space = SpaceProcessingModeValues.Preserve });
                    break;

                case EmphasisInline em:
                    bool isBold = em.DelimiterChar == '*' && em.DelimiterCount == 2;
                    bool isItalic = em.DelimiterChar == '_' || em.DelimiterCount == 1;
                    foreach (var inner in BuildRuns(em))
                    {
                        if (isBold) inner.RunProperties ??= new RunProperties();
                        if (isBold) inner.RunProperties!.Append(new Bold());
                        if (isItalic) inner.RunProperties ??= new RunProperties();
                        if (isItalic) inner.RunProperties!.Append(new Italic());
                        yield return inner;
                    }
                    break;

                case CodeInline code:
                {
                    var r = new Run(new Text(code.Content) { Space = SpaceProcessingModeValues.Preserve });
                    var rpr = new RunProperties(
                        new RunFonts { Ascii = "Courier New", HighAnsi = "Courier New" },
                        new FontSize { Val = "18" },
                        new Color { Val = "935D4C" }
                    );
                    r.InsertAt(rpr, 0);
                    yield return r;
                    break;
                }

                case LinkInline link:
                    // Link metnini yazdır, URL'yi parantez içinde ekle
                    foreach (var inner in BuildRuns(link))
                    {
                        inner.RunProperties ??= new RunProperties();
                        inner.RunProperties.Append(new Color { Val = "4A6A8A" });
                        inner.RunProperties.Append(new Underline { Val = UnderlineValues.Single });
                        yield return inner;
                    }
                    if (!string.IsNullOrWhiteSpace(link.Url))
                    {
                        var urlRun = new Run(new Text($" ({link.Url})") { Space = SpaceProcessingModeValues.Preserve });
                        var rpr = new RunProperties(
                            new Color { Val = "8A8479" },
                            new FontSize { Val = "18" }
                        );
                        urlRun.InsertAt(rpr, 0);
                        yield return urlRun;
                    }
                    break;

                case LineBreakInline:
                    yield return new Run(new Break());
                    break;

                default:
                    var txt = node.ToString();
                    if (!string.IsNullOrEmpty(txt))
                        yield return new Run(new Text(txt) { Space = SpaceProcessingModeValues.Preserve });
                    break;
            }
        }
    }

    // Plain text (sadece heading ve liste öğeleri için)
    private static string InlineContent(ContainerInline? inline)
    {
        if (inline is null) return string.Empty;
        var sb = new System.Text.StringBuilder();
        foreach (var c in inline)
        {
            switch (c)
            {
                case LiteralInline lit: sb.Append(lit.Content.ToString()); break;
                case EmphasisInline em: sb.Append(InlineContent(em)); break;
                case CodeInline code: sb.Append(code.Content); break;
                case LinkInline link: sb.Append(InlineContent(link)); break;
                case LineBreakInline: sb.Append('\n'); break;
                default: sb.Append(c.ToString()); break;
            }
        }
        return sb.ToString();
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Blok oluşturucular
    // ──────────────────────────────────────────────────────────────────────

    private static Paragraph BuildHeading(string text, int level)
    {
        var p = new Paragraph();
        var styleId = $"Heading{Math.Clamp(level, 1, 4)}";
        p.AppendChild(new ParagraphProperties(new ParagraphStyleId { Val = styleId }));
        p.AppendChild(new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        return p;
    }

    private static Paragraph BuildRichParagraph(ContainerInline? inline)
    {
        var p = new Paragraph();
        p.AppendChild(new ParagraphProperties(
            new SpacingBetweenLines { After = "160" }
        ));
        foreach (var run in BuildRuns(inline))
            p.AppendChild(run);
        return p;
    }

    private static Paragraph BuildListItem(ContainerInline? inline, bool ordered)
    {
        var p = new Paragraph();
        p.AppendChild(new ParagraphProperties(
            new ParagraphStyleId { Val = ordered ? "ListNumber" : "ListBullet" }
        ));
        foreach (var run in BuildRuns(inline))
            p.AppendChild(run);
        return p;
    }

    private static Paragraph BuildParagraph(string text)
    {
        var p = new Paragraph();
        p.AppendChild(new ParagraphProperties(
            new SpacingBetweenLines { After = "160" }
        ));
        foreach (var (line, idx) in (text ?? "").Split('\n').Select((v, i) => (v, i)))
        {
            if (idx > 0) p.AppendChild(new Run(new Break()));
            p.AppendChild(new Run(new Text(line) { Space = SpaceProcessingModeValues.Preserve }));
        }
        return p;
    }

    private static Paragraph BuildBlockquote(string text)
    {
        var p = new Paragraph();
        var ppr = new ParagraphProperties(
            new Indentation { Left = "720" },
            new SpacingBetweenLines { After = "120" },
            new ParagraphBorders(new LeftBorder { Val = BorderValues.Single, Color = "D6CFB8", Size = 12, Space = 12 })
        );
        p.AppendChild(ppr);
        var r = new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        var rpr = new RunProperties(new Color { Val = "5A5852" }, new Italic());
        r.InsertAt(rpr, 0);
        p.AppendChild(r);
        return p;
    }

    private static Paragraph BuildCodeBlock(string text)
    {
        var p = new Paragraph();
        var ppr = new ParagraphProperties(
            new Indentation { Left = "360" },
            new SpacingBetweenLines { After = "120" },
            new Shading { Val = ShadingPatternValues.Clear, Fill = "F5F2EC" }
        );
        p.AppendChild(ppr);
        foreach (var (line, idx) in text.Split('\n').Select((v, i) => (v, i)))
        {
            if (idx > 0) p.AppendChild(new Run(new Break()));
            var r = new Run(new Text(line) { Space = SpaceProcessingModeValues.Preserve });
            var rpr = new RunProperties(
                new RunFonts { Ascii = "Courier New", HighAnsi = "Courier New" },
                new FontSize { Val = "18" },
                new Color { Val = "935D4C" }
            );
            r.InsertAt(rpr, 0);
            p.AppendChild(r);
        }
        return p;
    }

    private static Paragraph BuildHorizontalRule()
    {
        var p = new Paragraph();
        p.AppendChild(new ParagraphProperties(
            new ParagraphBorders(new BottomBorder { Val = BorderValues.Single, Color = "D6CFB8", Size = 4, Space = 4 }),
            new SpacingBetweenLines { Before = "240", After = "240" }
        ));
        return p;
    }
}
