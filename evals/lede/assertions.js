/**
 * Custom structural assertions for Lede game output.
 * Called by PromptFoo via `type: javascript, file: assertions.js`.
 *
 * Each function receives the raw LLM output string and returns:
 *   { pass: boolean, score: number (0–1), reason: string }
 */

/**
 * Full structural validation: correct panelist count, one correct answer,
 * no numbers in completions, distinct completions, has blank placeholder.
 */
function ledeStructure(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${e.message}` };
  }

  // Skip is valid
  if (parsed.skip === true) {
    return { pass: true, score: 1, reason: 'Story correctly identified as non-suitable (skip)' };
  }

  const checks = [
    [
      typeof parsed.partialHeadline === 'string' && parsed.partialHeadline.includes('___'),
      'partialHeadline must be a string containing ___',
    ],
    [
      Array.isArray(parsed.panelists) && parsed.panelists.length === 3,
      'must have exactly 3 panelists',
    ],
    [
      Array.isArray(parsed.panelists) && parsed.panelists.filter((p) => p.isCorrect === true).length === 1,
      'must have exactly 1 panelist with isCorrect: true',
    ],
    [
      Array.isArray(parsed.panelists) &&
        parsed.panelists.every((p) => typeof p.completion === 'string' && !/\d/.test(p.completion)),
      'completions must not contain numbers or digits',
    ],
    [
      Array.isArray(parsed.panelists) &&
        new Set(parsed.panelists.map((p) => p.completion?.toLowerCase())).size === 3,
      'all three completions must be distinct',
    ],
    [
      typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 20,
      'explanation must be a non-empty string (>20 chars)',
    ],
  ];

  const failures = checks.filter(([pass]) => !pass).map(([, reason]) => reason);

  if (failures.length > 0) {
    return { pass: false, score: 0, reason: failures.join('; ') };
  }

  return { pass: true, score: 1, reason: 'All structural checks passed' };
}

module.exports = { ledeStructure };
