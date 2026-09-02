# MyJournal App — Complete Architecture & Master Build Prompt
### Personal Journaling + Productivity Web App
### Version 1.0 — Full Specification Document

---

# SECTION 1 — WHAT THIS APP IS

A personal journaling and productivity web app that lives in the browser. It is built for one person — you. It combines a rich journal, a smart todo system, habit tracking, and a space for capturing insights — all connected together. Everything is stored in your own Google account (Google Sheets for data, Google Drive for files). There are no third party databases, no subscriptions, no external accounts needed beyond Google.

---

# SECTION 2 — THE TECH STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React (Vite) | The app the user sees and interacts with |
| Hosting | Vercel (free tier) | Hosts the React app publicly |
| Backend | Google Apps Script | The API that reads and writes data |
| Database | Google Sheets | Stores all structured data |
| File Storage | Google Drive | Stores all images, audio, and files |
| Music | Lofi Girl 24/7 Stream | Background music stream URL |
| Auth | Google OAuth via Apps Script | Automatic, no setup needed |

The React app talks to Google Apps Script via HTTP fetch requests. Apps Script reads and writes to Google Sheets and Google Drive. Everything lives inside one Google account.

---

# SECTION 3 — THE SIX TABS

The app has a fixed sidebar on the left with six tabs. Only one tab is visible at a time. The music player bar is always visible at the bottom regardless of which tab is open.

```
📊 Dashboard          — daily briefing and command center
📓 Journal            — write rich daily entries with media
✅ Todos              — task management with forced conclusions
💡 Actionable Insights — capture learnings and takeaways
🔥 Habits             — daily habit tracking with streaks
🖼️ Media Library      — all uploaded files in one place
```

---

# SECTION 4 — OVERALL VISUAL DESIGN

## Aesthetic Direction
Warm, calm, personal. Like a premium leather notebook combined with a minimal productivity tool. NOT corporate, NOT clinical, NOT generic SaaS. This app should feel like a private sanctuary.

## Dark Mode (DEFAULT)
- Page background: `#1a1a2e` (deep charcoal navy)
- Card/surface background: `#16213e` (slightly lighter navy)
- Secondary surface: `#0f3460` (for highlights and hover states)
- Accent color: `#e8a045` (warm amber — used for streaks, active states, highlights)
- Text primary: `#e0e0e0` (soft off-white)
- Text secondary: `#8892a4` (muted grey-blue)
- Success: `#4caf7d` (soft green)
- Warning: `#f0a500` (amber)
- Danger: `#e05c5c` (soft red)
- Border color: `rgba(255,255,255,0.07)`

## Light Mode
- Page background: `#faf8f5` (warm cream)
- Card background: `#ffffff`
- Accent color: same `#e8a045`
- Text primary: `#1a1a2e`
- Text secondary: `#6b7280`
- Border color: `rgba(0,0,0,0.08)`

## Typography
- Journal text area (writing area): A serif font like `Lora` or `Playfair Display` — feels like writing in a real notebook
- All UI elements (buttons, labels, nav, stats): A clean sans-serif like `DM Sans` or `Outfit`
- Monospace for reference IDs like `IMG-001`: Use `JetBrains Mono` or `Fira Code`

## Animations and Interactions
- Tab switches: smooth fade transition, not jarring jump
- Skeleton loading screens (grey placeholder shapes) while data loads — never a blank screen or spinning circle
- Toast notifications at bottom right for actions — "Entry saved", "Todo rolled over", "Habit logged"
- Empty states: friendly warm illustration and copy like "Your story starts today" not just a blank area
- Checkbox completions: satisfying green fill animation
- Streak numbers: count-up animation when dashboard loads
- Cards: subtle lift shadow on hover
- Habit check: row goes green with a soft pulse animation

## Layout
```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│ SIDEBAR  │           TAB CONTENT AREA               │
│  (fixed) │              (scrollable)                │
│          │                                          │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│         MUSIC PLAYER (always visible, fixed bottom)  │
└──────────────────────────────────────────────────────┘
```

On mobile: sidebar collapses, bottom tab bar appears above the music player.

---

# SECTION 5 — SIDEBAR

Fixed left sidebar. Narrow width (~220px desktop, icon-only on tablet).

Contents top to bottom:
- App name/logo at top
- Six tab navigation items each with icon + label
- Active tab: warm amber left border + slightly lighter background
- Bottom of sidebar: user name display + settings gear icon

---

# SECTION 6 — MUSIC PLAYER (PERSISTENT BOTTOM BAR)

Always visible. Full width. Fixed to bottom of screen. Never disappears when switching tabs. Sits above the mobile bottom tab bar on mobile.

## Audio Source
Lofi Girl 24/7 public radio stream loaded into an HTML `<audio>` element. This is a live stream so there is no seeking, no track progress bar, and no skip buttons.

## Visual Design
Frosted glass effect — slightly transparent background with backdrop blur so page content shows through blurred behind it. Subtle top border in accent amber color. Height approximately 56px.

## Controls (left to right)
```
📻 Lofi Girl Radio — 24/7 Live    🟢 LIVE    ⏸    🔊 ───●────
```
- Station name and "LIVE" label on the left
- Green pulsing dot when streaming, grey when paused
- Animated three-bar equalizer next to the name when playing, static bars when paused
- Play/Pause button in center
- Speaker icon (click to mute, click again to unmute — remembers last volume)
- Volume slider on right (drag to adjust 0–100%)

## Audio Conflict Rule (CRITICAL)
There are TWO separate audio systems in this app:
1. The music player (lofi stream)
2. Content audio players (voice memos in journal entries, todos, insights)

When a content audio player is played, the music player MUST respond. The user sets their preference in Settings:

**Option A — Duck:** Music volume smoothly drops to 20% while voice memo plays. Smoothly returns to previous volume when voice memo ends or is paused.

**Option B — Pause:** Music pauses completely when voice memo plays. Resumes automatically when voice memo ends or is paused.

Default is Duck (Option A). This preference is stored in the DASHBOARD_CONFIG sheet and loaded when the app starts. A global AudioContext in React manages both audio instances and enforces this rule.

---

# SECTION 7 — DASHBOARD TAB

The first screen you see when you open the app. A warm daily briefing. Everything on the dashboard is actionable — you can complete tasks, check habits, and navigate to entries without leaving.

## Greeting Section (top of page)
- Large warm greeting based on time of day:
  - Before 12pm: "Good morning, [Name] ☀️"
  - 12pm–5pm: "Good afternoon, [Name] 🌤"
  - After 5pm: "Good evening, [Name] 🌙"
- Today's full date below the greeting (e.g. Sunday, February 22, 2026)
- A single soft daily prompt below the date — rotates daily from a list of reflective questions like "What's one thing you want to focus on today?" or "What are you grateful for this morning?"

## Stats Row (4 cards in a row)
Each is a compact card with an icon, number, and label:

**Card 1 — Journal Streak 🔥**
- Shows current consecutive days written (e.g. "14 days")
- If you haven't written today the card has a soft amber pulse to remind you
- Sub-label: "Best: 32 days"

**Card 2 — Todos Today ✅**
- Shows completed vs total due today (e.g. "2 / 5 done")
- If all done: turns green with a checkmark
- Sub-label: number rolled over from yesterday if any

**Card 3 — Insights This Month 💡**
- Total insights created this calendar month
- Clicking the card navigates to Insights tab

**Card 4 — Habit Score Today 🔥**
- Percentage of today's due habits completed (e.g. "3 / 6" or "50%")
- Simple circular progress ring around the number
- Sub-label: "Yesterday: 83%"

## Rollover Alert Banner
If any todos rolled over from yesterday, show a subtle amber banner ABOVE the todos section:
"↩ 3 tasks carried over from yesterday"
Not alarming, just informative.

## Two Column Section (below stats row)

**Left Column — Today's Todos**
- List of all todos due today
- Each item: checkbox, title, priority color dot, rollover badge (↩) if carried over
- Clicking the checkbox opens the Conclusion Modal (user must write remarks before completing — same rule as Todos tab)
- Rolled over items have a subtle amber left border
- At the bottom: a small "+ Add Todo" button
- If no todos: friendly message "Nothing due today — enjoy the space 🌿"

**Right Column — Today's Habits**
- All habits due today as a checklist
- Each row: colored dot, emoji icon, habit name, check circle on right
- For measurable habits: small progress text e.g. "4 / 8 glasses"
- A thin progress bar at the top of this section: "Today's habits: 3/6 complete"
- Checking a habit here logs it immediately — same as doing it in the Habits tab
- Satisfying green animation when checked

## Recent Journal Entry (below two columns)
A card showing the most recent journal entry:
- Date, day, mood emoji, energy level dots
- First 3–4 lines of text in serif font
- Small thumbnails of any attached images shown in a row
- "Read Full Entry →" link on the bottom right

If no entry written today: the card changes to a soft prompt state:
- "You haven't written today yet"
- A large "Start Writing ✏️" button that takes you to a blank new journal entry

## Insights To Review
If any insights have a review_date of today or earlier (overdue for review):
- A small card stack section appears
- Shows insight title and how many days overdue
- "Review Now →" link opens that insight
- If none due: this section is hidden entirely

## Weekly Strip (bottom of dashboard)
A compact 7-day horizontal strip showing the current week (Mon–Sun):
- Each day column has: day label (M T W T F S S), date number
- Three tiny colored dots below each date:
  - Dot 1 (amber): Journal written that day — filled if yes, empty if no
  - Dot 2 (green): Habit completion — filled proportionally (full green = all done, half = 50%, empty = none)
  - Dot 3 (blue): Todos completed — filled if at least one completed that day
- Today's column is highlighted with accent border
- Clicking a past day shows a small popover summary of what happened that day

## Quick Capture Button
A floating circular + button in the bottom right corner of the content area (above the music player). Clicking it expands a small menu:
- ✏️ New Journal Entry
- ✅ Add Todo
- 💡 New Insight
- 🔥 Log Habit

Selecting one navigates directly to that tab with a new item pre-opened.

---

# SECTION 8 — JOURNAL TAB

## Entry List (Left Panel)
Scrollable list of all past journal entries newest first. Each entry card shows:
- Date and day of week
- Mood emoji
- First line of text (truncated)
- Small image thumbnail if images were attached
- Word count
- Draft badge if not published

Clicking an entry card opens it in the right panel.
A "New Entry ✏️" button at the top of the list.

## Entry Editor (Right Panel)
When writing or reading an entry:

**Top bar:** Date (auto-filled, editable), mood selector row of emoji faces to click, energy level slider 1–10, location field (optional), tags field (type and press enter to add pill tags), auto-save indicator ("Saved just now" or "Saving...")

**Text Area:**
- Large, full-width text area below the top bar
- Serif font for a notebook feel
- Generous line height and padding
- Placeholder text: "What's on your mind today..."
- Auto-expands as you type — never scrolls inside itself
- Word count shown live at bottom right of text area

**Media Row (below text area — THREE BOXES SIDE BY SIDE):**

This is a fixed section below the text. It never moves into the text. Three equal-width boxes in a row:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   🎙️ AUDIO      │ │   📷 IMAGES     │ │   📎 FILES      │
│                 │ │                 │ │                 │
│ ▶ memo_1.mp3    │ │  [img] [img]    │ │  📄 report.pdf  │
│ ▶ voice_2.mp3   │ │  [img] [img]    │ │  📝 notes.docx  │
│                 │ │                 │ │                 │
│ [🔴 Record]     │ │  [📷 Capture]   │ │                 │
│ [⬆ Upload]      │ │  [⬆ Upload]     │ │  [⬆ Upload]     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Audio Box:**
- List of uploaded/recorded audio as compact bars
- Each bar: ▶ play button, filename, duration
- "Record" button uses browser microphone via Web Audio API — shows red recording indicator and timer while recording, stop button to finish
- "Upload" button for uploading existing audio files
- Playing audio here triggers the music ducking/pausing rule

**Images Box:**
- Grid of small square thumbnails
- "Capture" button opens device camera (mobile) or file picker
- "Upload" button for uploading image files
- Clicking any thumbnail opens a full-screen lightbox overlay with left/right navigation between images

**Files Box:**
- List of uploaded files as cards
- Each card: file type icon (PDF, DOC, XLS, etc.), filename, file size
- "Upload" button for any file type
- Clicking a card opens or downloads the file

**Media Reference IDs:**
Every item uploaded to any of the three boxes automatically gets a unique reference ID:
- Images: `IMG-001`, `IMG-002`, `IMG-003` etc (global counter across all entries)
- Audio: `AUD-001`, `AUD-002` etc
- Files: `FIL-001`, `FIL-002` etc

These IDs are visible as a small badge on each thumbnail/bar/card. The user can type these IDs anywhere in their journal text (e.g. "the view from the hike [IMG-042]") to reference that media. The app does NOT render the media inside the text — it stays in the fixed boxes below. The reference is just a text label.

---

# SECTION 9 — TODOS TAB

## List View
All todos in a scrollable list. Toggle button to switch between List and Kanban (column) view.

Each todo card shows:
- Checkbox (see completion rule below)
- Title
- Priority dot: red = high, amber = medium, green = low
- Category badge
- Due date
- Rollover badge "↩ 3" if carried over (number = how many times)
- Rolled over cards have a subtle amber left border and very slight amber background tint

"+ New Todo" button at top.

## Creating a Todo
Fields:
- Title (required)
- Description (optional, multi-line)
- Priority: High / Medium / Low (radio buttons)
- Category: dropdown (work, personal, health, learning, finance, other — user can add custom)
- Due date (date picker)
- Estimated time in minutes (optional)
- Tags (pill input)
- Recurring: None / Daily / Weekly / Monthly

## The Completion Rule (CRITICAL — MUST BE ENFORCED)
A todo can ONLY be marked complete when BOTH of the following are true:
1. The user has typed text in the "Conclusion Remarks" textarea (minimum 1 character)
2. The user checks the "Mark as Complete" checkbox

The checkbox must be VISUALLY GREYED OUT and UNCLICKABLE until text is present in the remarks field. When the user starts typing in the remarks field, the checkbox becomes active and clickable. This is not just validation — the checkbox must be physically disabled via the `disabled` attribute until text exists.

When completing, a side panel or modal opens with:
- Conclusion Remarks textarea (required to enable checkbox)
- Mark as Complete checkbox (disabled until remarks filled)
- Actual time taken field (optional, in minutes)
- Optional section: "Add Actionable Insight from this completion" (collapsible, collapsed by default)
  - If expanded: text area on top + Audio, Images, Files boxes side by side (same layout as journal)
  - If an insight is added, it saves to ACTIONABLE_INSIGHTS sheet with source_type = "todo" and source_id = this todo's ID

## Rollover Rule (CRITICAL — MUST BE AUTOMATED)
Every day when the app loads (or via a scheduled Apps Script trigger), check all todos where:
- status = "pending"
- due_date < today

For each such todo:
- Advance due_date to today
- Increment rollover_count by 1
- Append yesterday's date to rollover_history
- Keep all other fields unchanged

The todo reappears on today's list with the rollover badge showing the count.

## Snooze
User can right-click or use a menu on a todo card to snooze it. They pick a future date. The todo disappears from the list until that date, then reappears.

---

# SECTION 10 — ACTIONABLE INSIGHTS TAB

## What Is An Insight
Not a task, not a journal entry. It is a captured learning, realization, decision, or principle. Something you figured out that you want to remember and potentially act on.

## Where Insights Come From
1. Created standalone from this tab
2. Created from the optional section when completing a todo
3. Created from a "Create Insight from this Entry" button inside a journal entry

Each insight knows its source (standalone, todo, journal) and the source ID.

## Layout — Card Grid
Masonry grid of insight cards. Each card shows:
- Title
- First 2 lines of text content
- Category badge (mindset, work, health, relationships, learning, finance, etc.)
- Impact level indicator: a small colored bar — red = high, amber = medium, blue = low
- ⭐ starred indicator if starred
- ✓ actioned badge if already actioned
- Source label: "From todo: Fix report" or "Standalone"
- Date created

Filter bar at top: filter by category, impact level, actioned/not actioned, starred, date range.

## Insight Detail View
Clicking a card opens the full insight (side panel or full page):
- Title (editable)
- Text content area (top, editable)
- Audio, Images, Files boxes side by side (same layout as journal media row)
- Category selector
- Impact level selector (High / Medium / Low)
- Tags
- Review date picker — set a date to be reminded to revisit this
- Starred toggle
- Actioned toggle + action date (when you actually acted on it)
- Source reference (read only) — shows what this insight came from with a link
- "Create Todo from this Insight" button — opens new todo pre-filled with a link back to this insight's ID

---

# SECTION 11 — HABITS TAB

## Creating a Habit
Fields:
- Name (required)
- Description
- Category: health, mindset, learning, fitness, social, finance, creative, other
- Frequency: Daily / Weekdays only / Weekends only / Custom days (checkboxes for Mon–Sun)
- Is measurable: toggle Yes/No
  - If Yes: Target amount (number) + Unit (glasses, minutes, pages, km, etc.)
- Color: color picker (used for the habit's dot and heatmap color)
- Icon: emoji picker
- Reminder time: optional time picker

## Daily View
Shows all habits due today. For each habit:
- Colored dot + emoji icon
- Habit name
- If measurable: small input showing current/target e.g. "4 / 8 glasses" with +/- buttons
- Circle checkbox on the right
- Checking triggers green fill animation and logs to HABIT_LOGS sheet

A progress bar at the top: "Today: 3 of 6 habits complete"

## Heatmap View
For each habit, show:
- Habit name, icon, color
- Current streak: "🔥 14 days"
- Longest streak: "Best: 32 days"
- Total completions: "All time: 234"
- A GitHub-style contribution heatmap grid:
  - One small square per day going back 365 days
  - Empty square = not done (or not due that day)
  - Lightly colored = partial (for measurable habits)
  - Full color = completed
  - The habit's chosen color is used for the filled squares
  - Hovering a square shows the date and what was logged that day

Streaks reset if a habit is missed on a day it was due. Skipped days (days the habit wasn't due based on frequency) do not break streaks.

---

# SECTION 12 — MEDIA LIBRARY TAB

A dedicated gallery of every single file ever uploaded to the app across all tabs.

## Layout
- Filter row at top: All | Images | Audio | Files — plus sort by Date or Source
- Images: masonry thumbnail grid — click to open lightbox
- Audio: horizontal bars with ▶ play button, filename, duration, source label
- Files: rectangular cards with file type icon, filename, size, source label

## Each Media Item Shows
- Reference ID badge prominently (e.g. `IMG-042`) — user can click to copy to clipboard
- File type icon
- Filename and display name if user renamed it
- Upload date
- File size
- Uploaded from: "Journal — Feb 22" or "Todo — Fix Report" etc.
- Referenced in: list of entry/todo/insight IDs that use this media
- An orange ⚠️ dot if the item is orphaned (uploaded but referenced nowhere)

## Actions
- Rename: give a friendly display name
- Delete: removes from Drive and marks deleted in sheet, removes from all references
- Copy reference ID: copies `[IMG-042]` to clipboard for pasting into journal text

---

# SECTION 13 — GOOGLE SHEETS STRUCTURE

One Google Spreadsheet with 8 sheets (tabs). Sheet names must be EXACT as listed.

---

### Sheet 1: JOURNAL_ENTRIES

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| entry_id | Text | Unique ID — format JRN-001, JRN-002 etc. Auto increment. |
| date | Date | Date of the entry YYYY-MM-DD |
| day_of_week | Text | Monday, Tuesday etc. Auto calculated from date. |
| time_created | Timestamp | Full timestamp when entry was first created |
| time_modified | Timestamp | Full timestamp of last edit — updated on every save |
| title | Text | Optional title the user gives the entry. Can be blank. |
| text_content | Text | The full journal text. Can be very long. |
| mood | Text | Selected mood e.g. happy, anxious, calm, neutral, sad, excited |
| energy_level | Number | Integer 1 through 10 |
| weather | Text | Optional weather note e.g. "Sunny", "Rainy". User typed. |
| word_count | Number | Count of words in text_content. Auto calculated on save. |
| audio_refs | Text | Comma separated audio reference IDs e.g. AUD-001,AUD-003 |
| image_refs | Text | Comma separated image reference IDs e.g. IMG-001,IMG-002 |
| file_refs | Text | Comma separated file reference IDs e.g. FIL-001 |
| tags | Text | Comma separated user-defined tags e.g. reflection,work,family |
| location | Text | Optional location note. User typed. e.g. "Lucknow" or "home" |
| is_private | Boolean | TRUE or FALSE. Reserved for future lock/hide feature. |
| actionable_insight_id | Text | ID of any insight created directly from this entry. Blank if none. |
| streak_day | Number | What consecutive day number this entry was in the writing streak |
| status | Text | Either "draft" or "published" |

---

### Sheet 2: TODOS

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| todo_id | Text | Unique ID — format TOD-001, TOD-002 etc. Auto increment. |
| title | Text | Task title. Required. |
| description | Text | Longer description of the task. Optional. |
| priority | Text | "high", "medium", or "low" |
| category | Text | e.g. work, personal, health, learning, finance, other |
| date_created | Date | Date the todo was created |
| time_created | Timestamp | Full timestamp of creation |
| due_date | Date | Current due date — gets updated on rollover |
| original_due_date | Date | The due date the user originally set — never changes |
| rollover_count | Number | How many times this todo has rolled over. Starts at 0. |
| rollover_history | Text | Comma separated dates of every rollover e.g. 2026-02-20,2026-02-21 |
| status | Text | "pending", "completed", "snoozed", or "cancelled" |
| completion_date | Date | Date the todo was marked complete. Blank until then. |
| conclusion_remarks | Text | The required remarks text entered before marking complete |
| conclusion_audio_refs | Text | Audio ref IDs attached during completion. Comma separated. |
| conclusion_image_refs | Text | Image ref IDs attached during completion. Comma separated. |
| conclusion_file_refs | Text | File ref IDs attached during completion. Comma separated. |
| actionable_insight_id | Text | ID of insight created from this todo's completion. Blank if none. |
| snooze_until | Date | If snoozed, the date it should reappear. Blank otherwise. |
| recurring | Text | "none", "daily", "weekly", or "monthly" |
| recurring_parent_id | Text | If this is a generated recurring copy, the ID of the original todo |
| tags | Text | Comma separated tags |
| estimated_time_mins | Number | How long user estimated the task would take in minutes |
| actual_time_mins | Number | How long it actually took. Entered at completion. |
| notes | Text | Any mid-task notes the user adds while the todo is pending |

---

### Sheet 3: ACTIONABLE_INSIGHTS

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| insight_id | Text | Unique ID — format INS-001, INS-002 etc. Auto increment. |
| date_created | Date | Date the insight was created |
| time_created | Timestamp | Full timestamp of creation |
| date_modified | Date | Date of last edit |
| time_modified | Timestamp | Full timestamp of last edit |
| title | Text | Short title for the insight |
| text_content | Text | The main insight text. Can be long. |
| audio_refs | Text | Comma separated audio reference IDs |
| image_refs | Text | Comma separated image reference IDs |
| file_refs | Text | Comma separated file reference IDs |
| source_type | Text | "todo", "journal", or "standalone" |
| source_id | Text | The todo_id or entry_id this insight came from. Blank if standalone. |
| source_title | Text | The title of the source item for quick reading. Denormalized. |
| category | Text | mindset, work, health, relationships, learning, finance, creative, other |
| tags | Text | Comma separated tags |
| impact_level | Text | "high", "medium", or "low" |
| is_actioned | Boolean | TRUE if the user has acted on this insight, FALSE otherwise |
| action_date | Date | Date the user marked it as actioned. Blank until then. |
| review_date | Date | Date the user wants to be reminded to revisit this insight |
| linked_todo_id | Text | If this insight spawned a new todo, that todo's ID. Blank otherwise. |
| starred | Boolean | TRUE if user starred/favourited this insight |
| status | Text | "active" or "archived" |

---

### Sheet 4: HABITS

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| habit_id | Text | Unique ID — format HAB-001, HAB-002 etc. Auto increment. |
| name | Text | Habit name e.g. "Morning Walk" |
| description | Text | What the habit involves. Optional. |
| category | Text | health, mindset, learning, fitness, social, finance, creative, other |
| frequency | Text | "daily", "weekdays", "weekends", or "custom" |
| custom_days | Text | If frequency is custom, comma separated days e.g. Mon,Wed,Fri |
| is_measurable | Boolean | TRUE if this habit has a numeric target |
| target_per_day | Number | The target amount if measurable e.g. 8 for 8 glasses of water |
| unit | Text | The unit if measurable e.g. glasses, minutes, pages, km |
| color | Text | Hex color code e.g. #4caf7d — used for UI display |
| icon | Text | Emoji character e.g. 💧 or 📖 |
| date_created | Date | When the habit was created in the app |
| start_date | Date | When the user started tracking this habit |
| is_active | Boolean | TRUE if active, FALSE if archived/stopped |
| current_streak | Number | Current consecutive days completed. Recalculated daily. |
| longest_streak | Number | The best streak ever achieved for this habit |
| total_completions | Number | Total number of times this habit has been logged as completed |
| last_completed_date | Date | The most recent date this habit was completed |
| reminder_time | Text | Optional time string e.g. "07:30" for a reminder notification |
| notes | Text | General notes about this habit |
| archived_date | Date | If the habit was stopped, when it was archived |

---

### Sheet 5: HABIT_LOGS

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| log_id | Text | Unique ID — format HLG-001, HLG-002 etc. Auto increment. |
| habit_id | Text | The habit_id this log belongs to |
| habit_name | Text | The habit name — copied here for easy reading without joins |
| date | Date | The date this log is for |
| day_of_week | Text | Monday, Tuesday etc |
| status | Text | "completed", "partial", or "skipped" |
| value_logged | Number | If measurable, how much was logged e.g. 6 for 6 glasses |
| completion_time | Text | Time string when it was checked off e.g. "08:45" |
| note | Text | Optional short note for that day e.g. "felt great" |
| mood_at_completion | Text | Optional mood when completing e.g. happy, tired |
| streak_at_time | Number | What the habit's streak count was at the time of this log |

---

### Sheet 6: MEDIA_LIBRARY

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| media_id | Text | Unique reference ID — format IMG-001 for images, AUD-001 for audio, FIL-001 for files. Each type has its own counter. |
| media_type | Text | "image", "audio", or "file" |
| filename | Text | Original filename as uploaded e.g. "voice_memo.mp3" |
| display_name | Text | User-given friendly name. Starts same as filename, user can rename. |
| drive_file_id | Text | The Google Drive file ID — used to construct URLs |
| drive_link | Text | Full shareable Google Drive URL to the file |
| thumbnail_link | Text | Drive thumbnail URL — only populated for images |
| file_extension | Text | Extension without dot e.g. jpg, png, mp3, mp4, pdf, docx |
| file_size_kb | Number | File size in kilobytes |
| duration_seconds | Number | Duration in seconds — only for audio files |
| date_uploaded | Date | Date the file was uploaded |
| time_uploaded | Timestamp | Full timestamp of upload |
| uploaded_from | Text | Which tab it was uploaded from: "journal", "todo", "insight", "standalone" |
| source_id | Text | The entry_id, todo_id, or insight_id it was uploaded from |
| referenced_in | Text | Comma separated IDs of ALL entries/todos/insights that reference this media |
| tags | Text | User-added tags for this media item |
| notes | Text | User notes about this file |
| is_orphan | Boolean | TRUE if this media is not referenced in any entry, todo, or insight |
| drive_folder | Text | Which Drive subfolder this file was saved to |
| status | Text | "active" or "deleted" |

---

### Sheet 7: DASHBOARD_CONFIG

This sheet has only ONE row of data (row 2). Row 1 is headers. This is the single user's settings and stats.

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| config_id | Text | Always "CONFIG-001" — only one row exists |
| user_name | Text | The user's first name for greeting e.g. "Arjun" |
| timezone | Text | Timezone string e.g. "Asia/Kolkata" |
| theme | Text | "dark" or "light" — current theme preference |
| week_start_day | Text | "Monday" or "Sunday" — which day starts the week display |
| music_behavior | Text | "duck" or "pause" — what happens when voice memo plays |
| default_volume | Number | Last set volume 0 to 100 — restored on next app load |
| journal_streak | Number | Current consecutive days of journal writing |
| longest_journal_streak | Number | Best ever writing streak |
| total_journal_entries | Number | All-time total journal entries |
| total_todos_completed | Number | All-time total todos completed |
| total_todos_created | Number | All-time total todos created |
| total_insights | Number | All-time total insights created |
| total_habits_logged | Number | All-time total habit log entries |
| default_mood_options | Text | Comma separated mood options shown in the mood selector |
| default_categories | Text | Comma separated default categories for todos and habits |
| last_stats_updated | Timestamp | When the stats columns were last recalculated |
| last_rollover_run | Date | The last date the todo rollover check was run — prevents duplicate rollover on same day |

---

### Sheet 8: TAGS_MASTER

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| tag_id | Text | Unique ID — format TAG-001, TAG-002 etc. Auto increment. |
| tag_name | Text | The tag text e.g. "reflection" or "work" or "important" |
| tag_color | Text | Hex color code assigned to this tag for pill display |
| used_in | Text | Comma separated list of which tabs use this tag: journal, todo, insight, habit, media |
| usage_count | Number | Total number of times this tag has been applied |
| date_created | Date | When this tag was first created |
| last_used | Date | Most recent date this tag was applied anywhere |

---

# SECTION 14 — GOOGLE DRIVE FOLDER STRUCTURE

On first app run, Apps Script must automatically create this folder structure inside the user's Google Drive:

```
📁 MyJournal App                    ← root folder
├── 📁 Journal Images               ← images from journal entries
├── 📁 Journal Audio                ← audio from journal entries
├── 📁 Journal Files                ← other files from journal entries
├── 📁 Todo Media                   ← all media from todo completions
├── 📁 Insight Media                ← all media from insights
└── 📁 Thumbnails                   ← cached thumbnails for fast loading
```

Each file uploaded is saved to its corresponding subfolder. The folder path is saved in the MEDIA_LIBRARY sheet in the drive_folder column.

---

# SECTION 15 — APPS SCRIPT BACKEND

## Deployment
Deploy as a Web App:
- Execute as: Me
- Who has access: Anyone (or Anyone with Google account — your choice)
- This generates a public URL that the React app calls

## Request Format
All requests are POST requests (use doPost). The request body is JSON with an `action` field that determines what to do. All responses return JSON.

## CORS Headers
Every response must include these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Complete List of Actions

**Journal Actions:**
- `getEntries` — returns all journal entries newest first
- `getEntryById` — returns one entry by entry_id
- `createEntry` — creates new entry, auto-generates entry_id, date, word_count, streak_day
- `updateEntry` — updates existing entry by entry_id, updates time_modified and word_count
- `deleteEntry` — marks entry deleted (do not hard delete from sheet)

**Todo Actions:**
- `getTodos` — returns all todos, accepts optional filter: pending, completed, today
- `createTodo` — creates new todo with auto-generated todo_id
- `updateTodo` — updates todo fields
- `completeTodo` — marks todo complete, requires conclusion_remarks to be non-empty, sets completion_date, updates DASHBOARD_CONFIG stats
- `rolloverTodos` — checks all pending todos with due_date before today and rolls them over. Checks last_rollover_run in DASHBOARD_CONFIG to avoid running twice same day.
- `snoozeTodo` — sets snooze_until date and status to snoozed

**Insight Actions:**
- `getInsights` — returns all insights, accepts optional filters
- `createInsight` — creates new insight with auto-generated insight_id, sets source fields if provided
- `updateInsight` — updates insight fields including actioned status and review date
- `linkInsightToTodo` — creates a new todo linked to an insight, updates insight's linked_todo_id

**Habit Actions:**
- `getHabits` — returns all active habits
- `createHabit` — creates new habit
- `updateHabit` — updates habit fields
- `archiveHabit` — sets is_active to FALSE and archived_date to today
- `logHabit` — adds a row to HABIT_LOGS, then recalculates current_streak and total_completions in HABITS sheet
- `getHabitLogs` — returns logs for a specific habit_id, accepts optional date range
- `calculateStreaks` — recalculates current_streak for all active habits based on HABIT_LOGS

**Media Actions:**
- `uploadMedia` — accepts base64 file data, media_type, filename, source info. Saves to correct Drive subfolder. Auto-generates media_id with correct prefix (IMG/AUD/FIL). Returns the media_id and drive_link. Registers row in MEDIA_LIBRARY sheet.
- `getMediaById` — returns one media item by media_id
- `getMediaBySource` — returns all media uploaded from a specific source_id
- `getAllMedia` — returns all media items, accepts type filter
- `updateMediaRefs` — when a journal entry, todo, or insight is saved, update the referenced_in column for all media IDs it references
- `deleteMedia` — removes file from Drive, marks status as deleted in sheet, removes its ID from referenced_in of all other entries
- `scanOrphans` — checks all active media and sets is_orphan TRUE for any not appearing in any referenced_in field

**Dashboard Actions:**
- `getDashboardStats` — returns the single DASHBOARD_CONFIG row plus today's todos and habits
- `updateConfig` — updates any field in DASHBOARD_CONFIG (theme, user_name, music_behavior, etc.)
- `recalculateStats` — recounts all totals and updates DASHBOARD_CONFIG (journal_streak, total entries, todos completed etc.)

**Initialization Action:**
- `initializeApp` — run once on first setup. Creates all 8 sheets with correct column headers. Creates Drive folder structure. Creates initial DASHBOARD_CONFIG row.

---

# SECTION 16 — REACT APP STRUCTURE

```
src/
├── main.jsx                          ← entry point
├── App.jsx                           ← routing, layout wrapper, AudioContext provider
│
├── context/
│   └── AudioContext.jsx              ← global audio state, manages music vs content audio conflict
│
├── services/
│   └── api.js                        ← ALL Apps Script calls go through here. One file.
│                                        Export one function per action.
│
├── hooks/
│   ├── useJournal.js                 ← journal data fetching and mutations
│   ├── useTodos.js                   ← todo data, rollover check on load
│   ├── useInsights.js
│   ├── useHabits.js
│   ├── useMedia.js
│   └── useDashboard.js
│
├── components/
│   │
│   ├── Layout/
│   │   ├── AppShell.jsx              ← sidebar + content area + music player wrapper
│   │   ├── Sidebar.jsx               ← navigation tabs
│   │   └── MusicPlayer.jsx           ← persistent bottom music bar
│   │
│   ├── Dashboard/
│   │   ├── Dashboard.jsx             ← main dashboard page
│   │   ├── StatsRow.jsx              ← four stat cards
│   │   ├── TodayTodos.jsx            ← actionable todo list on dashboard
│   │   ├── TodayHabits.jsx           ← checkable habit list on dashboard
│   │   ├── RecentJournal.jsx         ← last entry preview card
│   │   ├── WeeklyStrip.jsx           ← 7-day overview strip
│   │   ├── InsightsToReview.jsx      ← overdue review date insights
│   │   └── QuickCapture.jsx          ← floating + button
│   │
│   ├── Journal/
│   │   ├── JournalPage.jsx           ← two panel layout
│   │   ├── EntryList.jsx             ← left panel scrollable list
│   │   ├── EntryCard.jsx             ← individual entry in list
│   │   ├── EntryEditor.jsx           ← right panel editor
│   │   ├── MediaRow.jsx              ← the three boxes below text
│   │   ├── AudioBox.jsx              ← record + upload audio
│   │   ├── ImageBox.jsx              ← capture + upload images, thumbnail grid
│   │   ├── FileBox.jsx               ← upload files, icon cards
│   │   └── Lightbox.jsx              ← full screen image overlay
│   │
│   ├── Todos/
│   │   ├── TodosPage.jsx             ← list/kanban toggle
│   │   ├── TodoCard.jsx              ← individual todo card
│   │   ├── TodoForm.jsx              ← create/edit todo form
│   │   └── ConclusionModal.jsx       ← completion flow with disabled checkbox
│   │
│   ├── Insights/
│   │   ├── InsightsPage.jsx          ← masonry grid
│   │   ├── InsightCard.jsx           ← individual card in grid
│   │   └── InsightEditor.jsx         ← full insight view/edit
│   │
│   ├── Habits/
│   │   ├── HabitsPage.jsx            ← daily/heatmap toggle
│   │   ├── HabitDailyView.jsx        ← checklist for today
│   │   ├── HabitHeatmap.jsx          ← github-style grid per habit
│   │   └── HabitForm.jsx             ← create/edit habit form
│   │
│   └── MediaLibrary/
│       ├── MediaLibraryPage.jsx      ← full media gallery
│       ├── MediaGrid.jsx             ← masonry image grid
│       ├── AudioBar.jsx              ← playable audio bar
│       └── FileCard.jsx              ← file icon card
│
└── styles/
    ├── global.css                    ← css variables for colors, fonts, dark/light mode
    └── animations.css                ← reusable animation classes
```

---

# SECTION 17 — AUDIO CONTEXT TECHNICAL DETAIL

Create a React context called `AudioContext` that wraps the entire app.

It manages:
- A ref to the music player audio element
- A ref to any currently playing content audio element
- The current music volume
- The user's music behavior preference (duck or pause)

When any content audio component (AudioBox player) starts playing:
1. It registers itself with AudioContext by calling `onContentAudioPlay(audioElement)`
2. AudioContext checks the behavior preference
3. If "duck": smoothly transitions music volume to 20% using a short interval
4. If "pause": calls `.pause()` on the music audio element

When content audio ends or is paused:
1. It calls `onContentAudioStop()` on AudioContext
2. If behavior was "duck": smoothly transitions music volume back to previous level
3. If behavior was "pause": calls `.play()` on the music audio element

The MusicPlayer component reads its volume from AudioContext so the ducking animation is visible on the volume slider.

---

# SECTION 18 — SETUP STEPS (Human Instructions)

1. Create a new Google Spreadsheet and note its ID from the URL
2. Open Apps Script from the spreadsheet (Extensions > Apps Script)
3. Paste the Apps Script code and deploy as Web App — copy the deployment URL
4. Create a new React app with Vite: `npm create vite@latest`
5. In `api.js` set the `APPS_SCRIPT_URL` constant to your deployment URL
6. Open the app and call `initializeApp` once to create all sheets and Drive folders
7. Set your name in Settings
8. Deploy React app to Vercel by connecting your GitHub repo
9. Open the Vercel URL — your app is live

---

# SECTION 19 — MASTER PROMPT FOR AI CODING ASSISTANTS

> Copy everything from the line below and paste it into Cursor, Claude, ChatGPT, or any AI coding assistant to build the full app. Do not summarize or shorten it. Give it the entire block.

---

Build a complete personal productivity and journaling web app. Read every instruction carefully and completely before writing any code. Do not skip any section.

**TECH STACK:**
Use React with Vite for the frontend. Host on Vercel. Use Google Apps Script deployed as a Web App for the backend API. Use Google Sheets as the database with 8 sheets inside one spreadsheet. Use Google Drive for all file storage. Do not use Firebase, Supabase, MongoDB, or any other database. Do not use any external authentication service.

**VISUAL DESIGN:**
The app must feel warm, calm, and personal like a premium private notebook. It must not look corporate or generic. Default theme is dark mode. Dark mode: page background #1a1a2e, card surface #16213e, hover/highlight surface #0f3460, accent color #e8a045 (warm amber), primary text #e0e0e0, secondary text #8892a4, success green #4caf7d, warning amber #f0a500, danger red #e05c5c, border rgba(255,255,255,0.07). Light mode: background #faf8f5, cards white, same accent. Font for journal text areas: Lora or Playfair Display (serif, import from Google Fonts). Font for all UI elements: DM Sans or Outfit (sans-serif, import from Google Fonts). Font for reference ID badges like IMG-001: JetBrains Mono (monospace, import from Google Fonts). Use smooth fade transitions between tabs. Use skeleton loading screens (grey placeholder rectangles) while any data is loading — never show a blank screen or spinning circle. Use toast notifications at bottom-right corner for all save and action events like "Entry saved", "Todo rolled over", "Habit logged". All empty states must show a friendly warm message, not just a blank area. All checkboxes have a satisfying green fill animation when checked. Streak numbers on the dashboard animate counting up when the page first loads. Cards have a subtle lift shadow on hover. Do not use Inter, Roboto, Arial, or any system font. Do not use purple gradients on white backgrounds.

**OVERALL LAYOUT:**
Fixed left sidebar 220px wide. Main scrollable content area fills remaining space. A persistent music player bar is fixed to the very bottom of the screen, full width, always visible no matter which tab is open. On mobile: sidebar collapses into a bottom tab bar that sits above the music player.

**SIDEBAR:**
Fixed left sidebar with six tabs in this order: Dashboard (📊), Journal (📓), Todos (✅), Actionable Insights (💡), Habits (🔥), Media Library (🖼️). Active tab has amber left border and slightly lighter background. Bottom of sidebar shows user name and a settings gear icon.

**MUSIC PLAYER — PERSISTENT BOTTOM BAR:**
Use the Lofi Girl 24/7 radio stream URL as the audio source inside an HTML audio element. This is a live stream — do not add a progress bar, seek bar, or skip buttons. The player must persist across all tab changes without restarting or interrupting. Height approximately 56px. Frosted glass styling with backdrop-filter blur and a subtle amber top border. From left to right inside the bar: station name text "Lofi Girl Radio — 24/7 Live", a green pulsing dot indicator when streaming (grey dot when paused), an animated three-bar equalizer visual that bounces when playing and is static when paused, a play/pause toggle button in the center, a speaker/mute icon button that mutes when clicked and unmutes when clicked again and remembers the last volume level before muting, a volume slider from 0 to 100 percent on the right.

**AUDIO CONFLICT SYSTEM — CRITICAL:**
There are exactly two separate audio systems: (1) the persistent music player, and (2) inline content audio players for voice memos inside journal entries, todos, and insights. Create a global React context called AudioContext that wraps the entire app. This context holds a ref to the music audio element, a ref to any currently playing content audio element, the current music volume number, and the user's behavior preference. When any inline content audio player starts playing it must call a function from AudioContext called onContentAudioPlay. AudioContext then checks the behavior preference. If the preference is "duck" it smoothly reduces the music volume to 20 percent. If the preference is "pause" it calls pause on the music audio element. When content audio stops or pauses it calls onContentAudioStop. AudioContext then smoothly restores music volume to its previous level if duck mode, or resumes music if pause mode. The ducking animation must be visible on the music player volume slider in real time. The user sets this preference in Settings. Default preference is "duck". The preference is loaded from DASHBOARD_CONFIG sheet on app start.

**DASHBOARD TAB:**
Show a personalized greeting at the top based on time of day: before 12pm show "Good morning, [Name] ☀️", between 12pm and 5pm show "Good afternoon, [Name] 🌤", after 5pm show "Good evening, [Name] 🌙". Below the greeting show today's full date. Below the date show a single rotating daily reflective prompt from a hardcoded list of questions like "What's one thing you want to focus on today?" that changes each day. Below that show four stat cards in a horizontal row. Card 1: current journal writing streak in days with a flame icon — if the user has not written today the card pulses amber softly as a reminder, and show the best streak as a sub-label. Card 2: today's todos as X of Y done — show a green checkmark if all done, and show the rollover count from yesterday as a sub-label. Card 3: total insights created this calendar month — clicking this card navigates to the Insights tab. Card 4: today's habit completion as a fraction and percentage inside a circular progress ring — show yesterday's score as a sub-label. If any todos rolled over from yesterday show an amber banner above the todos section saying how many rolled over. Below the stats row show a two-column section. Left column titled "Today's Todos": a list of all todos due today each showing a checkbox, title, priority color dot, and rollover badge if carried over. Clicking the checkbox opens the conclusion modal — the same completion flow as the Todos tab. Rolled over todos have an amber left border. A small "+ Add Todo" button at the bottom. If no todos show a friendly message "Nothing due today — enjoy the space 🌿". Right column titled "Today's Habits": all habits due today as a checklist. Each row shows a colored dot, emoji icon, habit name, and a circle checkbox on the right. For measurable habits show the current vs target value. A progress bar at the top of this column shows today's overall habit completion. Checking a habit here logs it immediately in HABIT_LOGS — same as doing it in the Habits tab. Show a green animation when checked. Below the two columns show a recent journal entry preview card with date, mood emoji, energy level, first 3 to 4 lines of text in serif font, and thumbnails of attached images. If no entry was written today show a prompt card saying "You haven't written today yet" with a large "Start Writing ✏️" button that opens a new entry in the Journal tab. If any insights have a review_date of today or earlier show a section called "Insights to Review" with those insight titles and how many days overdue they are — if none are overdue hide this section completely. At the bottom show a weekly strip: a horizontal row of 7 day columns for the current week. Each day column shows the day letter, the date number, and three small colored dots: an amber dot if a journal entry was written that day, a green dot filled proportionally to habit completion that day, and a blue dot if at least one todo was completed that day. Today's column has an accent border. Clicking a past day shows a popover summary. Show a floating circular plus button in the bottom right of the content area above the music player. Clicking it expands a small menu with four options: New Journal Entry, Add Todo, New Insight, Log Habit. Each option navigates to the correct tab with a new item pre-opened.

**JOURNAL TAB:**
Use a two panel layout. Left panel is a scrollable list of all journal entries newest first. Each entry card shows the date and day of week, mood emoji, first line of text truncated, a small image thumbnail if images are attached, word count, and a draft badge if the entry is not published. Show a "New Entry ✏️" button at the top of the list. Right panel is the entry editor. At the top of the editor show a top bar with: the date auto-filled to today but editable, a mood selector that is a horizontal row of emoji faces the user clicks to select, an energy level slider from 1 to 10, an optional location text field, a tags field where typing and pressing Enter creates a pill badge, and an auto-save indicator showing "Saved just now" or "Saving..." in the corner. Below the top bar show a large text area using the serif font with placeholder text "What's on your mind today..." that auto-expands vertically as the user types and never shows a scrollbar inside itself. Show a live word count at the bottom right of the text area. Below the text area show three equal-width boxes side by side in a horizontal row. This row is fixed below the text and the media never appears inside the text itself. Box 1 is the Audio Box titled "🎙️ Audio": shows a list of uploaded and recorded audio files as compact horizontal bars each with a play button, filename, and duration. Has a red Record button that uses the Web Audio API browser microphone — shows a red dot and timer while recording and a stop button to end — and an Upload button for audio file upload. When any audio in this box is played it must call onContentAudioPlay from AudioContext to trigger the music ducking or pausing rule. Box 2 is the Images Box titled "📷 Images": shows uploaded images as a grid of small square thumbnails. Has a Capture button that opens the device camera on mobile or a file picker, and an Upload button. Clicking any thumbnail opens a full-screen lightbox overlay with left and right navigation between all images in the entry. Box 3 is the Files Box titled "📎 Files": shows uploaded files as small cards each with a file type icon appropriate to the file extension, the filename, and file size. Has an Upload button that accepts any file type. Clicking a file card opens or downloads the file. Every item uploaded to any of the three boxes must automatically receive a unique reference ID. Images get IDs in the format IMG-001, IMG-002 etc. Audio files get AUD-001, AUD-002 etc. Files get FIL-001, FIL-002 etc. Each type has its own incrementing counter stored in the MEDIA_LIBRARY sheet. The reference ID is shown as a small monospace badge on each thumbnail, audio bar, and file card. The user can manually type these reference IDs inside the journal text like [IMG-042] to call out a piece of media. The app does not render media inside the text — the reference in the text is just a text label. The media always stays in its box below.

**TODOS TAB:**
Show a toggle to switch between list view and kanban column view. Each todo card shows a checkbox, title, priority colored dot (red for high, amber for medium, green for low), category badge, due date, and a rollover badge showing "↩" followed by the rollover count if it is greater than zero. Cards that have rolled over have a subtle amber left border and a very slight amber background tint. Show a "+ New Todo" button at the top. When creating a todo collect: title (required), description (optional multiline), priority as High/Medium/Low radio buttons, category as a dropdown with options work/personal/health/learning/finance/other and user can add custom, due date with a date picker, estimated time in minutes optional, tags as a pill input, and recurring option as None/Daily/Weekly/Monthly. COMPLETION RULE — THIS IS CRITICAL AND MUST BE EXACTLY IMPLEMENTED: A todo can only be marked complete when both of these conditions are true simultaneously: first the user must have typed at least one character of text in the conclusion remarks textarea, and second the user must check the complete checkbox. The complete checkbox must use the HTML disabled attribute and must be visually greyed out and completely unclickable until text exists in the remarks field. When the user types the first character in the remarks field the checkbox must become enabled and clickable. This is not client-side validation that shows an error — the checkbox must literally be disabled until text is present. When the user clicks a todo to complete it, open a modal or side panel that contains: a conclusion remarks textarea labeled as required, the disabled complete checkbox that activates when text is typed, an optional actual time taken field in minutes, and a collapsible section labeled "Add Actionable Insight from this completion" that is collapsed by default. When expanded this section shows a text area on top and then three boxes side by side for audio, images, and files using the same layout as the journal media row. If the user fills this section and saves, create a new insight in the ACTIONABLE_INSIGHTS sheet with source_type set to "todo" and source_id set to this todo's ID and link the insight ID back to the todo. ROLLOVER RULE — THIS IS CRITICAL AND MUST BE AUTOMATED: When the app loads check the last_rollover_run field in DASHBOARD_CONFIG. If last_rollover_run is not equal to today's date then call the rolloverTodos Apps Script action. That action finds all todos where status equals "pending" and due_date is before today and for each one advances the due_date to today, increments rollover_count by one, and appends the previous due date to rollover_history. Then set last_rollover_run to today in DASHBOARD_CONFIG. This check must happen only once per day. Do not run rollover if last_rollover_run already equals today. Rolled over todos reappear in today's list with their rollover badge. Users can also snooze a todo by choosing a future date — it disappears from the list until that date.

**ACTIONABLE INSIGHTS TAB:**
Show a masonry grid of insight cards. Each card shows the title, first two lines of text, category badge, an impact level indicator as a small colored horizontal bar (red for high, amber for medium, blue for low), a star icon if starred, a checkmark badge if actioned, a source label showing where it came from, and the date created. Show a filter bar at the top with filters for category, impact level, actioned/not actioned, starred, and date range. Clicking a card opens the full insight in a side panel or full page view. The full view shows: an editable title field, a large editable text area, and then three side-by-side boxes for audio, images, and files using the exact same layout as the journal media row. Below the media row show: a category selector, an impact level selector with three options High/Medium/Low, a tags field, a review date picker for when to be reminded to revisit, a starred toggle, an actioned toggle that shows an action date field when toggled on, a read-only source reference showing what this insight came from with a link to navigate there, and a "Create Todo from this Insight" button that opens a new todo pre-filled with a link back to this insight's ID and stores the insight_id in the todo's notes or a linked field.

**HABITS TAB:**
Show a toggle to switch between Daily View and Heatmap View. For creating a habit collect: name required, description optional, category dropdown with options health/mindset/learning/fitness/social/finance/creative/other, frequency as Daily/Weekdays only/Weekends only/Custom days where custom shows checkboxes for Mon through Sun, a measurable toggle that when turned on shows a target number field and unit text field like glasses or minutes or pages, a color picker for the habit's theme color, an emoji icon picker, and an optional reminder time picker. Daily View shows all habits due today as a vertical checklist. Each row shows the habit's colored dot, emoji icon, habit name, and for measurable habits a small counter showing current value slash target value with plus and minus buttons. A circle checkbox sits on the right of each row. Clicking the checkbox triggers a green fill animation and immediately logs a completed entry to HABIT_LOGS and recalculates the streak. Show a progress bar at the very top of the daily view showing how many of today's habits are complete. Heatmap View shows each habit as a section containing: the habit name and icon, current streak shown as a flame emoji followed by the number of days, longest streak label, total completions all time, and a GitHub-style contribution grid. The grid has one small square for each day going back 365 days from today. An empty square means the habit was not completed or was not due that day. A lightly colored square means partially completed for measurable habits. A fully colored square means completed. Use the habit's chosen color for filled squares. Hovering over a square shows a tooltip with the date and what was logged that day. A streak resets to zero if the habit was due on a day and was not logged as completed on that day.

**MEDIA LIBRARY TAB:**
Show a filter row at the top with tabs for All, Images, Audio, and Files, plus a sort selector for Date or Source. Images are displayed in a masonry grid of thumbnails — clicking any image opens a full-screen lightbox. Audio files are displayed as horizontal bars with a play button, filename, duration, and source label — playing triggers the AudioContext conflict rule. Files are displayed as rectangular cards with a large file type icon and the filename and size. Every media item in the library must prominently show its reference ID as a badge in monospace font. Each item also shows where it was uploaded from, which entry or todo or insight IDs reference it, the upload date, the file size, and an orange warning dot if the item is orphaned meaning it is not referenced anywhere. Actions per item: rename to give it a friendly display name, delete which removes it from Drive and marks it deleted in the sheet, and copy reference ID which copies the formatted reference like [IMG-042] to the clipboard.

**GOOGLE SHEETS — CREATE ONE SPREADSHEET WITH EXACTLY THESE 8 SHEETS:**

Sheet named JOURNAL_ENTRIES with these columns in this exact order: entry_id, date, day_of_week, time_created, time_modified, title, text_content, mood, energy_level, weather, word_count, audio_refs, image_refs, file_refs, tags, location, is_private, actionable_insight_id, streak_day, status

Sheet named TODOS with these columns: todo_id, title, description, priority, category, date_created, time_created, due_date, original_due_date, rollover_count, rollover_history, status, completion_date, conclusion_remarks, conclusion_audio_refs, conclusion_image_refs, conclusion_file_refs, actionable_insight_id, snooze_until, recurring, recurring_parent_id, tags, estimated_time_mins, actual_time_mins, notes

Sheet named ACTIONABLE_INSIGHTS with these columns: insight_id, date_created, time_created, date_modified, time_modified, title, text_content, audio_refs, image_refs, file_refs, source_type, source_id, source_title, category, tags, impact_level, is_actioned, action_date, review_date, linked_todo_id, starred, status

Sheet named HABITS with these columns: habit_id, name, description, category, frequency, custom_days, is_measurable, target_per_day, unit, color, icon, date_created, start_date, is_active, current_streak, longest_streak, total_completions, last_completed_date, reminder_time, notes, archived_date

Sheet named HABIT_LOGS with these columns: log_id, habit_id, habit_name, date, day_of_week, status, value_logged, completion_time, note, mood_at_completion, streak_at_time

Sheet named MEDIA_LIBRARY with these columns: media_id, media_type, filename, display_name, drive_file_id, drive_link, thumbnail_link, file_extension, file_size_kb, duration_seconds, date_uploaded, time_uploaded, uploaded_from, source_id, referenced_in, tags, notes, is_orphan, drive_folder, status

Sheet named DASHBOARD_CONFIG with these columns and only one data row: config_id, user_name, timezone, theme, week_start_day, music_behavior, default_volume, journal_streak, longest_journal_streak, total_journal_entries, total_todos_completed, total_todos_created, total_insights, total_habits_logged, default_mood_options, default_categories, last_stats_updated, last_rollover_run

Sheet named TAGS_MASTER with these columns: tag_id, tag_name, tag_color, used_in, usage_count, date_created, last_used

**GOOGLE DRIVE:**
When the initializeApp action runs for the first time, create a root folder named "MyJournal App" inside the user's Google Drive. Inside it create these subfolders: Journal Images, Journal Audio, Journal Files, Todo Media, Insight Media, Thumbnails. When any file is uploaded save it to the correct subfolder based on what tab it came from. Store the subfolder name in the drive_folder column of MEDIA_LIBRARY.

**APPS SCRIPT:**
Deploy as a Web App. Set execute as Me and access to Anyone. Use doPost as the main handler. Parse the request body as JSON. Route all logic by reading the action field from the parsed JSON. Return all responses as JSON using ContentService.createTextOutput with mime type JSON. Every response must include CORS headers: Access-Control-Allow-Origin star, Access-Control-Allow-Methods POST GET OPTIONS, Access-Control-Allow-Headers Content-Type. Also handle OPTIONS preflight requests in doGet. Implement every one of these actions: getEntries, getEntryById, createEntry (auto-generate entry_id by finding the max existing ID and incrementing, auto-calculate word_count and day_of_week), updateEntry (update time_modified and recalculate word_count), deleteEntry, getTodos (accept optional status filter), createTodo (auto-generate todo_id, set original_due_date same as due_date, set rollover_count to 0), updateTodo, completeTodo (check that conclusion_remarks is not empty before allowing completion — return an error if empty, set completion_date to today, update DASHBOARD_CONFIG total_todos_completed), rolloverTodos (read last_rollover_run from DASHBOARD_CONFIG — if it equals today return immediately without doing anything — if it does not equal today find all rows in TODOS where status is pending and due_date is before today — for each one set due_date to today, increment rollover_count, append old due_date to rollover_history — then set last_rollover_run to today in DASHBOARD_CONFIG), snoozeTodo, getInsights, createInsight (auto-generate insight_id, accept source_type and source_id fields), updateInsight, linkInsightToTodo, getHabits, createHabit, updateHabit, archiveHabit, logHabit (add row to HABIT_LOGS then recalculate current_streak by reading HABIT_LOGS in date order and counting consecutive completed days going backwards from today — update current_streak and total_completions in HABITS sheet — also update longest_streak if current streak exceeds it), getHabitLogs, calculateStreaks, uploadMedia (accept base64 encoded file data as a string, decode it, save to correct Drive subfolder using DriveApp, make the file publicly readable, get the file ID and shareable link, auto-generate the typed media_id by finding the max existing IMG or AUD or FIL ID and incrementing, add a row to MEDIA_LIBRARY with all fields populated, return the media_id and drive_link and thumbnail_link), getMediaById, getMediaBySource, getAllMedia, updateMediaRefs (accept a source_id and a list of media IDs — for each media ID in MEDIA_LIBRARY add the source_id to the referenced_in column if not already present — also set is_orphan to FALSE for those items), deleteMedia (delete the file from Drive using DriveApp.getFileById and file.setTrashed — mark the row in MEDIA_LIBRARY as deleted — remove the media_id from referenced_in of all other entries in all sheets), scanOrphans (for every row in MEDIA_LIBRARY where status is active check if its media_id appears in any referenced_in field across JOURNAL_ENTRIES TODOS and ACTIONABLE_INSIGHTS — if it does not appear anywhere set is_orphan to TRUE — if it does appear set is_orphan to FALSE), getDashboardStats (return the single DASHBOARD_CONFIG row plus all todos due today plus all active habits), updateConfig (accept any key-value pairs and update the corresponding columns in DASHBOARD_CONFIG), recalculateStats (count all journal entries for streak and total, count all completed todos, count all insights, count all habit logs, update DASHBOARD_CONFIG), initializeApp (check if sheets already exist before creating to avoid duplicates, create all 8 sheets with headers, create Drive folder structure, create the initial DASHBOARD_CONFIG row with default values).

**REACT STRUCTURE:**
AudioContext wraps the entire app at the root level in App.jsx. Create a single api.js file in the services folder that exports one named async function for every Apps Script action. Each function uses fetch to POST to the APPS_SCRIPT_URL constant defined at the top of the file with the action name and any parameters in the request body. Components are organized by tab as specified. Use the Web Audio API navigator.mediaDevices.getUserMedia for in-browser microphone recording. Convert all file uploads to base64 using FileReader before sending to Apps Script. Implement theme switching by toggling a data-theme attribute on the html element and using CSS variables that change based on the attribute. On app load call the rolloverTodos function from useTodos hook which checks the last_rollover_run date before deciding whether to call the Apps Script action.

---
*End of master prompt. Give the entire block above to the AI coding assistant without summarizing or shortening it.*

---

# SECTION 20 — QUICK REFERENCE CARD

```
SHEETS:         JOURNAL_ENTRIES / TODOS / ACTIONABLE_INSIGHTS /
                HABITS / HABIT_LOGS / MEDIA_LIBRARY /
                DASHBOARD_CONFIG / TAGS_MASTER

DRIVE FOLDERS:  Journal Images / Journal Audio / Journal Files /
                Todo Media / Insight Media / Thumbnails

MEDIA IDS:      IMG-001 (images) / AUD-001 (audio) / FIL-001 (files)

ENTRY IDS:      JRN-001 / TOD-001 / INS-001 / HAB-001 /
                HLG-001 / TAG-001

COMPLETION:     Checkbox DISABLED until conclusion remarks typed
ROLLOVER:       Auto-runs once per day on app load
AUDIO:          Duck (default) or Pause when voice memo plays
MUSIC:          Lofi Girl 24/7 stream — no seeking, no skipping
THEME:          Dark mode default (#1a1a2e bg, #e8a045 accent)
FONTS:          Lora (journal) / DM Sans (UI) / JetBrains Mono (IDs)
```

---
*Document complete. Every decision, every column, every rule, every visual detail is captured above.*
