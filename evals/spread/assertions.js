/**
 * Custom structural assertions for Spread game output.
 */

function spreadStructure(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${e.message}` };
  }

  if (parsed.skip === true) {
    return { pass: true, score: 1, reason: 'Story correctly identified as having no extractable number (skip)' };
  }

  const checks = [
    [
      typeof parsed.question === 'string' && parsed.question.trim().length > 10,
      'question must be a non-empty string',
    ],
    [
      typeof parsed.answer === 'number' && !isNaN(parsed.answer) && isFinite(parsed.answer),
      'answer must be a finite number',
    ],
    [
      typeof parsed.unit === 'string',
      'unit must be a string (can be empty for calendar years)',
    ],
    [
      // Unit should be singular (no trailing 's' for obvious plurals)
      // Allow empty string (calendar year answers), single words only
      typeof parsed.unit === 'string' && (parsed.unit === '' || !parsed.unit.endsWith('s') || parsed.unit.length <= 3),
      'unit should be singular (e.g. "kilometer" not "kilometers")',
    ],
    [
      // Question should not directly contain the answer number as a substring
      typeof parsed.question === 'string' &&
        !parsed.question.includes(String(parsed.answer)),
      'question should not reveal the answer number',
    ],
    [
      typeof parsed.explanation === 'string' && parsed.explanation.trim().length > 50,
      'explanation must be substantive (>50 chars)',
    ],
    [
      Array.isArray(parsed.others) && parsed.others.length === 0,
      'others must be an empty array []',
    ],
  ];

  const failures = checks.filter(([pass]) => !pass).map(([, reason]) => reason);

  if (failures.length > 0) {
    return { pass: false, score: 0, reason: failures.join('; ') };
  }

  return { pass: true, score: 1, reason: 'All structural checks passed' };
}

module.exports = { spreadStructure };
