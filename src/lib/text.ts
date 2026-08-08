/**
 * Statements come from the first line of a vault note, so they can carry Obsidian
 * markup — a link, an italic word. The statement is displayed as a plain-text
 * subheading, not rendered as markdown, so flatten the syntax rather than showing
 * it raw. Link text survives; the URL does not, since the prose below carries it.
 */
export function plain(s: string): string {
  return s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(?<![A-Za-z0-9])([*_])(?=\S)(.+?)(?<=\S)\1(?![A-Za-z0-9])/g, '$2')
    .trim();
}
