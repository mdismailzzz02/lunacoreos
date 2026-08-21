# LunaCoreOS Exhaustive Feature List

Here is the deep-dive, granular list of all the features and capabilities currently built into the various sections of LunaCoreOS.

### 🌸 Dashboard
- **Daily Summary:** Overview of the current date and time.
- **Quick Metrics:** High-level counts of active tasks, unread items, or daily habits.
- **Greeting/Motivational:** Changes contextually based on the time of day.
- **Offline Cache Badge:** Indicates whether the system is fully synced with Supabase or running from local cache.

### ✨ Luna AI
- **Conversational Chat:** Direct chat interface with the Luna AI assistant.
- **Context-Aware Memory:** Luna can pull context from other parts of the OS (like tasks, schedule).
- **Markdown Rendering:** AI responses support full markdown (tables, code blocks, bold/italics).

### 🧬 LifeOS React (Decision Engine)
- **Task Prioritization Algorithm:** Automatically calculates priority scores based on urgency and importance.
- **Cognitive Load Management:** Tracks how "heavy" tasks are to prevent burnout.
- **Decision Matrix:** Visual quadrant (Eisenhower Matrix) sorting tasks into Do, Decide, Delegate, Delete.
- **Action Items:** Granular breakdown of high-level goals into step-by-step actions.

### 📝 Study Notes
- **Folder/Subject Organization:** Group notes by topic or semester.
- **Rich Text Editor:** Formatting for study materials.
- **Flashcard/Recall Mode (if implemented):** Tools for testing knowledge.
- **Attachments:** Ability to link Vault files directly into notes.

### ✍️ Writing
- **Distraction-Free Mode:** Full-screen minimal editor.
- **Draft & Publish States:** Track which pieces are WIP vs finalized.
- **Word Count & Reading Time:** Live metrics as you type.
- **Auto-Save:** Saves work in progress to the database automatically.

### ❤️ Bookmarks
- **URL Parsing:** Automatically fetches titles from pasted URLs.
- **Tagging & Categorization:** Group links by custom tags.
- **Search & Filter:** Find saved links via keyword search.
- **Favorites:** Star specific bookmarks for quick access.

### 📖 Journal
- **Calendar View:** Pick specific dates to view past entries.
- **Mood Tracking:** Log daily mood alongside the entry.
- **Daily Prompting:** Prompts to help guide reflection.
- **Rich Text Formatting:** Bold, italics, lists, and quote blocks for thoughts.

### 💎 Vault (Cloudflare R2 Integration)
- **Master-Key Encryption:** Prompts for a master password to unlock access to sensitive files.
- **Folder Navigation:** Standard file-system UI (folders, sub-folders, breadcrumbs).
- **Direct Uploads:** Push files directly to Cloudflare R2 object storage.
- **File Previews:** Built-in viewer for images, PDFs, and text files.
- **Trash/Restore System:** Soft-delete files before permanent removal.

### 🔑 Passwords
- **Local Encryption:** Uses browser/client-side encryption for credentials.
- **Copy-to-Clipboard:** One-click copy for usernames and passwords.
- **Search Bar:** Instantly filter through saved accounts.
- **Hidden by Default:** Passwords masked until explicitly revealed.

### 🎵 Music Player
- **R2 Streaming:** Streams MP3s directly from your private `documents-music-folders` bucket.
- **Custom Playlists:** Create playlists and add/remove specific tracks.
- **Folder Filtering:** Browse music by specific Vault collections/folders.
- **Audio Visualizer:** Live vertical EQ animation synced to the Web Audio API.
- **Global Mini-Player:** A mini-player persists in the top-left sidebar when navigating to other tabs.
- **Media Controls:** Play, pause, skip, previous, shuffle, and repeat modes.
- **Background Syncing:** R2 worker syncs new MP3s into the Supabase database.

### 🎬 Videos (YouTube Integration)
- **Link Saving:** Paste a YouTube URL to save it to the library.
- **Categorization/Playlists:** Group saved videos.
- **Embedded Player:** Watch videos directly inside the OS without YouTube ads/recommendations.
- **Notes Attachment:** Write timestamps or notes specific to a saved video.

### 🎨 Media Library
- **Grid Gallery View:** Masonry or grid layout for images.
- **Lightbox Viewer:** Full-screen image viewing.
- **Tagging:** Categorize photos (e.g., screenshots, inspiration, memories).

### 🎯 Todos
- **Checklist Logic:** Mark items complete, incomplete, or archived.
- **Due Dates & Times:** Schedule tasks.
- **Sub-tasks:** Break large tasks into smaller checkable items.
- **Drag & Drop:** Reorder priority manually.

### ✨ Insights
- **Habit Charts:** Visual graphs showing consistency over time.
- **Productivity Heatmaps:** GitHub-style contribution graphs for tasks completed.
- **Mood Correlation:** Compare mood logs against task completion rates.

### 🧭 Life Map
- **Timeline View:** Plot major life events (past and future).
- **Milestone Tracking:** Break 5-year/10-year plans into achievable nodes.
- **Visual Nodes:** Connecting lines showing dependencies between goals.

### 📦 Time Capsule
- **Lock Date:** Set a specific future date (e.g., Jan 1, 2030).
- **Encrypted Content:** Text or files locked inside.
- **Countdown Timer:** Displays time remaining until the capsule unlocks.
- **Strict Access Control:** Cannot be opened prematurely.

### 🌟 Streaks
- **Daily Habit Logging:** Mark habits as done.
- **Current vs Longest Streak:** Tracks your best historical performance.
- **Grace-Window Settings (Pending):** Custom rules allowing you to skip a day (e.g., sick days) without resetting the count to zero.

### 📚 Reading List
- **Status Tracking:** To Read, Reading, Completed.
- **Progress Bar:** Track current page vs total pages.
- **Rating System:** 1-5 stars for finished books.
- **Notes Integration:** Link directly to the Study Notes or Writing section for book summaries.

### 🎞️ Watchlist
- **Media Types:** Filter by Movie, TV Show, Anime.
- **Status Tracking:** Plan to Watch, Watching, Completed.
- **Episode Tracker:** Keep track of current season and episode.
- **Ratings & Reviews:** Leave personal thoughts after finishing.

### 🎆 Yearly Review
- **Guided Template:** Step-by-step reflection questions for the closing year.
- **Highs & Lows:** Dedicated sections for top moments and lessons learned.
- **Goal Setting:** Draft specific objectives for the upcoming year.

### 🤝 Delegation
- **Source Tracking:** Track where tasks came from (Manual, Twitch, YouTube, etc).
- **Priority Ranking:** Drag-and-drop sorting for delegated tasks.
- **Bi-directional Sync:** Deleting a delegated task can automatically mark a linked Todo as complete.
- **Due Dates:** Track deadlines for tasks handed off to others.

### 🎮 Twitch
- **Live Now & VODs:** Separated tabs for live streams and past broadcasts.
- **Add Channels:** Search for a streamer and save their profile locally.
- **Liked Videos:** Heart button to save specific streams to a permanent list.
- **Saved Library:** Custom tab to view all saved clips/VODs.
- **Embedded Player:** Watch streams natively inside the dashboard.
- **API Integration:** Direct connection to Twitch Helix API for real-time status updates and thumbnail fetching.

### ⚙️ Settings
- **Theme Controls:** Toggle dark/light mode or specific accent colors.
- **Environment Variables:** Manage API keys (Supabase, Twitch, YouTube, Groq).
- **Data Export:** Options to backup or export personal data.
- **System Diagnostics:** Check backend connection status and latency.
