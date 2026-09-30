#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if command -v gitleaks >/dev/null 2>&1; then
  echo "🔒 Running Gitleaks secret scan..."
  if [ "${1:-}" = "--all" ]; then
    gitleaks detect --source "${REPO_ROOT}" --config "${REPO_ROOT}/.gitleaks.toml" --verbose --no-banner
  else
    gitleaks protect --staged --config "${REPO_ROOT}/.gitleaks.toml" --verbose --no-banner
  fi
  echo "✅ No leaked secrets detected."
else
  echo "⚠️ Warning: 'gitleaks' binary is not installed on this system."
  echo "   Please install it to prevent accidental credential leakage:"
  echo "   - macOS: brew install gitleaks"
  echo "   - Linux/WSL: https://github.com/gitleaks/gitleaks/releases"
  echo "   - Go: go install github.com/gitleaks/gitleaks/v8@latest"
  if [ "${CI:-false}" = "true" ]; then
    echo "❌ Error: gitleaks is mandatory in CI."
    exit 1
  fi
fi
