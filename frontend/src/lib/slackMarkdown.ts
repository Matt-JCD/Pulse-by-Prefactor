/**
 * Converts Slack-formatted text to HTML for web rendering.
 *
 * Handles:
 *   *bold text*         → <strong>bold text</strong>
 *   <URL|anchor text>   → <a href="URL" target="_blank" rel="noopener">anchor text</a>
 *   Newlines            → preserved (use whitespace-pre-wrap in CSS)
 */
export function slackToHtml(text: string): string {
  if (!text) return '';

  return (
    text
      // Links: <https://url|anchor text> → <a href>
      .replace(
        /<(https?:\/\/[^|>]+)\|([^>]+)>/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-aqua hover:underline">$2</a>',
      )
      // Bold: *text* → <strong> (single asterisks, not at start of line as bullet)
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      // Middle dot separator (· used between links)
      .replace(/ · /g, ' <span class="text-zinc-600">·</span> ')
  );
}
