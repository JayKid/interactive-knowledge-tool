const MAX_CONTENT_LENGTH = 50000;

export async function fetchUrlContent(url: string): Promise<{ title: string; text: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'KnowledgeTool/1.0',
      'Accept': 'text/html, text/plain, application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (contentType.includes('text/plain') || contentType.includes('application/json')) {
    return { title: '', text: rawText.slice(0, MAX_CONTENT_LENGTH) };
  }

  // Extract title from <title> tag
  const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

  // Strip HTML to get text content
  const text = htmlToText(rawText).slice(0, MAX_CONTENT_LENGTH);

  return { title, text };
}

function htmlToText(html: string): string {
  return html
    // Remove script and style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Replace block elements with newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}
