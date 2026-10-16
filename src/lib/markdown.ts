export const MAX_NOTE_BODY = 100_000;
export type MarkdownFormat =
  "bold" | "italic" | "heading" | "list" | "quote" | "code" | "link";

// Only explicit destinations are clickable. Embedded images never fetch through this helper.
export function markdownUrl(url: string): string | undefined {
  if (!url || /[\u0000-\u0020\u007f]/.test(url)) return undefined;
  if (url.startsWith("#")) return url;
  if (/^mailto:[^@]+@[^@]+$/i.test(url)) return url;
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

export function markdownFilename(title: string): string {
  let name =
    [
      ...title
        .normalize("NFC")
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .trim(),
    ]
      .slice(0, 80)
      .join("") || "Untitled";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name))
    name = "note-" + name;
  return name + ".md";
}

export function formatMarkdown(
  source: string,
  from: number,
  to: number,
  format: MarkdownFormat,
) {
  let selected = source.slice(from, to);
  let prefix = "",
    suffix = "";
  if (["heading", "list", "quote"].includes(format)) {
    from = from === 0 ? 0 : source.lastIndexOf("\n", from - 1) + 1;
    const end = source.indexOf("\n", to);
    to = end < 0 ? source.length : end;
    selected = source.slice(from, to) || "text";
    prefix = format === "heading" ? "## " : format === "list" ? "- " : "> ";
    const insert = selected
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");
    return { from, to, insert, anchor: from, head: from + insert.length };
  }
  if (format === "link") {
    const label = selected || "link text",
      url = "https://example.com";
    const insert = `[${label}](${url})`;
    return {
      from,
      to,
      insert,
      anchor: from + label.length + 3,
      head: from + label.length + 3 + url.length,
    };
  }
  if (format === "code") {
    const longest = Math.max(
      2,
      ...[...selected.matchAll(/`+/g)].map((match) => match[0].length),
    );
    const fence = "`".repeat(longest + 1);
    prefix = (from && source[from - 1] !== "\n" ? "\n" : "") + fence + "\n";
    suffix =
      "\n" + fence + (to < source.length && source[to] !== "\n" ? "\n" : "");
    selected ||= "code";
  } else {
    prefix = suffix = format === "bold" ? "**" : "*";
    selected ||= format === "bold" ? "bold text" : "italic text";
  }
  return {
    from,
    to,
    insert: prefix + selected + suffix,
    anchor: from + prefix.length,
    head: from + prefix.length + selected.length,
  };
}
