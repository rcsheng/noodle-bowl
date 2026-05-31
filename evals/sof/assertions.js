/**
 * Custom structural assertions for Science or Fiction game output.
 */

function sofStructure(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${e.message}` };
  }

  if (parsed.skip === true) {
    return { pass: true, score: 1, reason: 'Story correctly identified as too vague to use (skip)' };
  }

  const checks = [
    [
      typeof parsed.topic === 'string' && parsed.topic.trim().length > 0,
      'topic must be a non-empty string',
    ],
    [
      Array.isArray(parsed.claims) && parsed.claims.length === 2,
      'must have exactly 2 claims',
    ],
    [
      Array.isArray(parsed.claims) && parsed.claims[0]?.isScience === true,
      'claims[0] must have isScience: true (the real claim)',
    ],
    [
      Array.isArray(parsed.claims) && parsed.claims[1]?.isScience === false,
      'claims[1] must have isScience: false (the fabricated claim)',
    ],
    [
      Array.isArray(parsed.claims) && parsed.claims[1]?.source === null,
      'claims[1].source must be null (fabricated claim has no source)',
    ],
    [
      Array.isArray(parsed.claims) &&
        parsed.claims[0]?.source != null &&
        typeof parsed.claims[0].source.name === 'string' &&
        parsed.claims[0].source.name.length > 0,
      'claims[0].source must have a non-empty name field',
    ],
    [
      // Both claims should be roughly similar in length (within 120 chars)
      Array.isArray(parsed.claims) &&
        Math.abs(
          (parsed.claims[0]?.text?.length ?? 0) - (parsed.claims[1]?.text?.length ?? 0)
        ) <= 120,
      'real and fabricated claims should be similar in length (within 120 chars)',
    ],
    [
      Array.isArray(parsed.claims) &&
        parsed.claims.every((c) => typeof c.text === 'string' && c.text.trim().length > 20),
      'both claim texts must be non-trivial strings (>20 chars)',
    ],
  ];

  const failures = checks.filter(([pass]) => !pass).map(([, reason]) => reason);

  if (failures.length > 0) {
    return { pass: false, score: 0, reason: failures.join('; ') };
  }

  return { pass: true, score: 1, reason: 'All structural checks passed' };
}

module.exports = { sofStructure };
