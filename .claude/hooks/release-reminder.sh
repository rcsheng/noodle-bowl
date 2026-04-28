#!/usr/bin/env bash
# Reminds the user to git-tag the release after deploy commands.
# Reads the PostToolUse hook payload from stdin; emits a systemMessage
# JSON only when the bash command matches a deploy pattern.
#
# Uses pure bash (no jq) so it runs on Windows Git Bash without extra deps.
set -eu

input=$(cat)

case "$input" in
  *"eas build"*|*"eas submit"*|*"firebase deploy"*|*"npm run seed:prod"*)
    cat <<'EOF'
{"systemMessage":"RELEASE REMINDER — deploy detected.\n\nTag this commit so you know what shipped to alpha:\n  git tag -a v0.1.0-alpha.N -m \"what shipped (1 line)\"\n  git push origin --tags\n\nReplace N with the next number — see docs/RELEASES.md for the last one used.\nThen add a new row to docs/RELEASES.md."}
EOF
    ;;
esac
