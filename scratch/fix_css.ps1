$path = "d:\Luna\src\styles\global.css"
$content = Get-Content $path -Raw

# This script attempts to fix the corrupted global.css by replacing the mangled section
# with the correct structure.

$mangled = @"
  border-left: 2px solid transparent;
  border-right: 2px solid transparent;
.btn-sm {
"@

$fixed = @"
  border-left: 2px solid transparent;
  border-right: 2px solid transparent;
  user-select: none;
}

.nav-item:hover {
  background: var(--surface2);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent-dim);
  color: var(--accent);
  border-left-color: var(--accent);
}

.nav-item .nav-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.nav-item .nav-label {
  flex: 1;
}

/* ── Cards & Surfaces ─────────────────────────────────────── */
.card {
  background: rgba(22, 33, 62, 0.5) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: var(--radius);
  padding: 1.25rem;
  transition: box-shadow var(--transition), transform var(--transition);
}

.card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

/* ── Buttons ──────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  transition: all var(--transition);
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: #1a1a2e;
  border: none;
}

.btn-primary:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--surface2);
  color: var(--text);
}

.btn-danger {
  background: var(--danger);
  color: white;
  border: none;
}

.btn-danger:hover {
  opacity: 0.85;
}

.btn-sm {
"@

# Note: The mangled section might vary slightly due to previous failed edits.
# I will try to find a more stable anchor.

$anchor = "  border-right: 2px solid transparent;"
$endAnchor = ".btn-sm {"

$startIndex = $content.IndexOf($anchor)
$endIndex = $content.IndexOf($endAnchor)

if ($startIndex -ge 0 -and $endIndex -gt $startIndex) {
    $newContent = $content.Substring(0, $startIndex + $anchor.Length) + "`r`n" + $fixed.Substring($fixed.IndexOf("  user-select: none;")) + $content.Substring($endIndex + $endAnchor.Length)
    Set-Content -Path $path -Value $newContent -NoNewline
    Write-Host "File fixed successfully."
} else {
    Write-Error "Could not find anchors in global.css"
}
