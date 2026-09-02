# LunaCoreOS — Dashboard Overhaul Prompt

## Context
Overhaul the main Dashboard component in LunaCoreOS (React + Supabase).

**Goal:** Turn the dashboard into a fast, glanceable "life command center" —
today's status, not a task manager. LifeOS React already has its own
dedicated dashboard for task prioritization / decision matrix / action
items — do NOT duplicate that here.

**Keep existing:** date/time summary, quick metrics, contextual greeting,
offline/sync cache badge.

---

## Widgets to add

Each widget pulls live from its respective Supabase table. All widgets
should be compact, read-mostly, with at most one quick-action (e.g. log
mood, check off a todo) — no full editors or lists inline. Each widget
fetches its own data independently (don't block dashboard render on the
slowest query) — use Suspense/loading skeletons per widget.

### 1. Streaks strip
- Show current + longest streak per active habit, small badge row
- Tap to jump to Streaks tab

### 2. Today's mood quick-log
- If no mood logged today: inline mood picker (emoji/scale), one tap
- If logged: show today's mood + optional tiny 7-day mood sparkline

### 3. Today's todos (compact)
- Count of due-today items + top 3 by due time, checkbox to complete
  inline (syncs to Todos table)
- "View all" link to Todos tab — do not render full list here

### 4. Delegation alerts
- Any delegated tasks overdue or newly assigned, compact list (max 3)
- Link to Delegation tab

### 5. Journal prompt nudge
- If today's entry not started: show today's daily prompt with a
  "Start entry" button → opens Journal
- If started/complete: collapse to a small checkmark state

### 6. Productivity heatmap (compact)
- GitHub-style contribution heatmap, last ~10-12 weeks, small cell size
- Pull from Insights aggregation logic (reuse existing query if present)

### 7. Currently reading / currently watching
- One card each (or combined), title + cover if available + progress
  bar (page/episode), from Reading List and Watchlist tables
- Only render if there's an active (status = "Reading"/"Watching") item

### 8. Time Capsule countdown (conditional)
- Only show if a capsule is unlocking within ~30 days
- Simple countdown badge, no content preview

### 9. Global mini-player
- If this isn't already a persistent app-level component (it's described
  as living in the sidebar), just confirm dashboard layout doesn't
  visually conflict with it — don't rebuild it here

### 10. Twitch "Live Now" strip
- Query saved channels' live status via Twitch Helix API (reuse existing
  integration/service if present, don't rebuild auth)
- Render as a horizontal row of channel avatars, only for channels
  currently live — show a live indicator dot + viewer count
- If zero channels are live, render either nothing or a single minimal
  "no one's live right now" text line (no empty card chrome)
- If the user has no saved channels at all, build a proper empty state
  ("Add channels in the Twitch tab to see live status here") rather than
  assuming data exists
- Clicking an avatar opens the embedded player (existing Twitch tab
  component), not a new player instance
- Do NOT show VOD browsing, saved clips, or channel search here

### 11. YouTube "Recently Saved" card
- Single card: most recently saved video's thumbnail + title
- If per-video notes/timestamps exist, show "Resume at [timestamp]" as a
  subtitle; otherwise just show relative save time ("saved 2d ago")
- If the user has no saved videos at all, build a proper empty state
  ("Save a YouTube link to see it here") rather than assuming data exists
- Click → opens embedded player (existing Videos tab component)
- Do NOT show playlists, categorization, or the full saved library

---

## Layout

Responsive grid, mobile-first:

1. **Top row — status strip:** sync/offline badge (existing) + Streaks
   strip + Twitch "Live Now" strip (time-sensitive, treat like a
   notification band)
2. **Second row — today:** mood quick-log, today's todos, delegation
   alerts, journal prompt nudge
3. **Third row — momentum/insight:** productivity heatmap
4. **Fourth row — currently consuming:** currently reading, currently
   watching, YouTube recently-saved card, side by side
5. **Ambient:** Time Capsule countdown badge (only if active + close to
   unlocking); global mini-player stays wherever it already lives
   (sidebar) — just don't let the dashboard grid visually conflict with it

---

## Explicitly excluded from dashboard

These are destinations, not glance-worthy — do not add widgets for them:

- ✨ Luna AI (needs full chat interface)
- 📝 Study Notes (browsing/reading task)
- ✍️ Writing (needs distraction-free editor)
- ❤️ Bookmarks (search/browse behavior)
- 💎 Vault (sensitive, master-key gated — no previews on dashboard)
- 🔑 Passwords (sensitive, same reasoning as Vault)
- 🎨 Media Library (browsing/gallery)
- 🧭 Life Map (long-term planning, not a daily glance)
- 🎆 Yearly Review (seasonal, only relevant a few times a year)
- ⚙️ Settings (configuration, never belongs on a dashboard)
- 🧬 LifeOS React decision engine (has its own dedicated dashboard already)

---

## Constraints

- No new Supabase tables — only read from existing ones (Streaks,
  Journal, Todos, Delegation, Insights source data, Reading List,
  Watchlist, Time Capsule, Twitch, Videos)
- Respect existing dark/light theme + accent color system from Settings
- Reuse existing API integrations (Twitch Helix, Supabase queries) —
  don't duplicate auth or fetch logic
- Build real empty states for any widget whose data source may be empty
  (Twitch channels, YouTube saves, Time Capsule, currently reading/watching)
  rather than assuming data exists
- Do not rebuild LifeOS React's decision matrix / prioritization / action
  items on this dashboard — that's a separate existing surface

---

## Deliverable

Updated `Dashboard.jsx` (or equivalent) + any new small widget
components, each in its own file under `components/dashboard/`.
