import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
export const MAX_WIKI_REFERENCES = 256;
export type WikiReference = {
  target: string;
  alias?: string;
  from: number;
  to: number;
};
type SyntaxNode = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: SyntaxNode[];
};
const protectedTypes = new Set([
  "code",
  "inlineCode",
  "html",
  "link",
  "image",
  "linkReference",
  "imageReference",
  "definition",
]);
const unescape = (text: string) =>
  text.replace(/\\([\\`*{}\[\]()<>#+.!|_-])/g, "$1");
const escaped = (source: string, offset: number) => {
  let count = 0;
  while (offset > 0 && source[--offset] === "\\") count++;
  return count % 2 === 1;
};

export function wikiReferences(source: string): {
  links: WikiReference[];
  truncated: boolean;
} {
  if (!source.includes("[[") || !source.includes("]]"))
    return { links: [], truncated: false };
  const intervals: [number, number][] = [];
  const stack: SyntaxNode[] = [
    fromMarkdown(source, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    }),
  ];
  while (stack.length) {
    const node = stack.pop()!;
    if (protectedTypes.has(node.type)) {
      const start = node.position?.start.offset,
        end = node.position?.end.offset;
      if (start !== undefined && end !== undefined)
        intervals.push([start, end]);
    } else if (node.children) stack.push(...node.children);
  }
  intervals.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const links: WikiReference[] = [];
  let cursor = 0,
    interval = 0;
  while (cursor < source.length) {
    const start = source.indexOf("[[", cursor);
    if (start < 0) break;
    cursor = start + 2;
    while (interval < intervals.length && intervals[interval][1] <= start)
      interval++;
    if (interval < intervals.length && intervals[interval][0] <= start) {
      cursor = intervals[interval][1];
      continue;
    }
    if (escaped(source, start)) continue;
    let pipe = -1;
    for (
      let end = start + 2;
      end < source.length && end < start + 1000;
      end++
    ) {
      cursor = end + 1;
      if (source[end] === "\n" || source[end] === "\r") break;
      if (source[end] === "\\") {
        end++;
        cursor++;
        continue;
      }
      if (source.startsWith("[[", end)) {
        cursor = end;
        break;
      }
      if (pipe < 0 && source[end] === "|") pipe = end;
      if (!source.startsWith("]]", end)) continue;
      cursor = end + 2;
      const target = unescape(
        source.slice(start + 2, pipe < 0 ? end : pipe),
      ).trim();
      const alias =
        pipe < 0 ? undefined : unescape(source.slice(pipe + 1, end)).trim();
      if (
        target &&
        target.length <= 200 &&
        (!alias || alias.length <= 200) &&
        !/[\u0000-\u001f\u007f]/.test(target + (alias || ""))
      ) {
        if (links.length === MAX_WIKI_REFERENCES)
          return { links, truncated: true };
        links.push({
          target,
          ...(alias ? { alias } : {}),
          from: start,
          to: cursor,
        });
      }
      break;
    }
  }
  return { links, truncated: false };
}

export function wikiMarkdown(source: string) {
  const result = wikiReferences(source);
  let cursor = 0,
    markdown = "";
  result.links.forEach((reference, index) => {
    const label = (reference.alias || reference.target).replace(
      /([\\`*{}\[\]()<>#+.!|_-])/g,
      "\\$1",
    );
    markdown +=
      source.slice(cursor, reference.from) +
      `[${label}](noteweld-wiki:${index})`;
    cursor = reference.to;
  });
  return { ...result, markdown: markdown + source.slice(cursor) };
}

export { stableWikiLink } from "./wiki-format";
