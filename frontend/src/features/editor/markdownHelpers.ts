import TurndownService from "turndown";
// turndown-plugin-gfm has no TypeScript types; use a runtime require.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gfmPlugin = require("turndown-plugin-gfm");
import { marked } from "marked";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

// Enable GFM: tables, strikethrough, task lists, etc.
turndown.use(gfmPlugin.gfm);

// marked options: GitHub flavored markdown with line-break handling.
marked.setOptions({ gfm: true, breaks: false });

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}
