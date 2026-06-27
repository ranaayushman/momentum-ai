// ============================================================
// AI Runtime — Prompts
// Reusable prompt-building utilities.
// Each agent should define its system instructions here.
// ============================================================

/**
 * Builds a structured prompt by interpolating variables into a template.
 * Use {{variableName}} placeholders in templates.
 *
 * @example
 * buildPrompt("List tasks for {{date}}", { date: "2026-06-27" })
 * // → "List tasks for 2026-06-27"
 */
export function buildPrompt(
  template: string,
  variables: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

/**
 * Trims excessive whitespace from a multi-line prompt template.
 * Useful when writing templates inline with code indentation.
 */
export function cleanPrompt(template: string): string {
  return template
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
