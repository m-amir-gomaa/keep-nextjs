export function stableWikiLink(note: { id: string; title: string }) {
  const caption = (
    note.title.replace(/[\u0000-\u001f\u007f]/g, " ").trim() || "Untitled"
  ).replace(/([\\`*{}\[\]()<>#+.!|_-])/g, "\\$1");
  return `[[note:${note.id}|${caption}]]`;
}
