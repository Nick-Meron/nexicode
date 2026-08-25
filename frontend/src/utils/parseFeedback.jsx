// The AI feedback text (see backend/services/ai_service.py generate_feedback)
// always follows this exact format:
//
//   ## 1. Logic and correctness
//   [body]
//   ## 2. Code structure and style
//   [body]
//   ## 3. Conceptual understanding
//   [body]
//   ## 4. How to improve
//   [body]
//   ---
//   **Your mark: X/10** — description.
//   To reach Y/10, aim for ...
//
// This turns that raw markdown-ish text into structured pieces so the UI
// can render real headings and bold text instead of showing literal
// "##" and "**" characters in a plain <pre> block.

export function parseFeedback(text) {
  if (!text) return { sections: [], summary: null };

  const sectionRegex = /##\s*\d+\.\s*(.+?)\n([\s\S]*?)(?=\n##\s*\d+\.|\n---|\s*$)/g;
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ title: match[1].trim(), body: match[2].trim() });
  }

  const summaryMatch = text.match(/---\s*([\s\S]*)$/);
  const summary = summaryMatch ? summaryMatch[1].trim() : null;

  return { sections, summary };
}

// Renders "some **bold** text" as real <strong> elements — the summary
// line is the only part of the feedback that uses inline bold markdown.
export function renderInlineBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}