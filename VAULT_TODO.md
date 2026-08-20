# Vault — Future Fixes & Improvements

> These are non-urgent issues found during an architecture audit.
> Everything here works fine for day-to-day use — these are just things to clean up later.

---

## 🔴 Bugs (Low Priority — Edge Cases)

### 1. `getR2PresignedPut` returns public URL as PUT endpoint
**File:** `src/services/api.js` → `getR2PresignedPut()`
```js
// Current behavior (wrong):
if (publicUrl) return { url: publicUrl, public: true };  // returns CDN read URL
// Should always get a presigned PUT URL from the edge function regardless
```
**Problem:** When `VITE_R2_PUBLIC_URL` is set, the PUT upload uses the public read URL instead of a proper
presigned PUT URL. Most public R2 buckets reject direct PUTs — upload may silently fail.  
**Fix:** Always call the edge fn for PUT. Only skip edge fn for GET reads.

---

### 2. `deleteR2Object` body argument is wrong
**File:** `src/services/api.js` → `deleteR2Object()`
```js
export const deleteR2Object = async (key) => {
    return r2EdgeFetch({ op: 'delete', key }, { method: 'POST' }); // ← 2nd arg is `body`, not options
};
```
**Problem:** `r2EdgeFetch(queryParams, body)` — the second argument is treated as the request body (JSON),
not fetch options. `{ method: 'POST' }` gets sent as JSON body to the edge function, which ignores it.
The DELETE op in the edge function uses `GET` anyway so this doesn't crash, but the intent is wrong.  
**Fix:** Remove the second argument — the edge fn's `delete` op works fine as a plain GET.

---

### 3. R2 orphan when `emptyTrash` R2 deletions fail silently
**File:** `src/services/api.js` → `emptyTrash()`
```js
for (const file of allTrashed) {
    deleteR2Object(file.r2_key).catch(err => console.error(...)); // fire and forget
}
```
**Problem:** DB rows are deleted first, then R2 deletions happen async. If R2 deletes fail, the files
become permanent orphans in R2 with no DB record to clean them up later.  
**Fix:** Delete from R2 first (in batches via `delete_prefix` if possible), then delete DB rows.

---

## 🟡 Missing Features

### 4. No R2 orphan cleanup tool
**Problem:** Files uploaded directly to R2 (via rclone, S3 browser, etc.) that don't have a matching
`vault_files` row will exist in R2 but never appear in the app. The sync adds them, but if a collection
is deleted and re-created, orphans can accumulate.  
**Fix:** Add a "Scan Orphans" admin page that: lists all R2 keys under a prefix, diffs vs DB, shows
unregistered keys and their sizes.

---

### 5. `syncVaultCollection` doesn't handle subfolders recursively
**File:** `src/services/api.js` → `syncVaultCollection()`  
**Problem:** The sync uses `delimiter="/"` which only lists immediate children. Files inside nested
subfolders that don't have their own `vault_collections` row won't be picked up.  
**Fix:** Either recursively sync child collections too, or add a "deep sync" option that scans without
a delimiter and sorts files into the correct collection based on key prefix matching.

---

### 6. `vault_sync_log` delta sync can miss updates for renamed/replaced files
**Problem:** The delta filter is `modifiedAt > lastSyncedAt`. If someone overwrites a file in R2 with
the same key (same name, new content), the modified timestamp changes but the `r2_key` already exists
in `vault_files` — so the file row is not updated (size, mime, etc. stay stale).  
**Fix:** During sync, also check if size or lastModified differ for existing keys and update those rows.

---

### 7. No pagination in `getTrashFiles` UI
**File:** `src/components/Vault/TrashView.jsx`  
**Problem:** `getTrashFiles()` supports `page` + `pageSize` but the UI loads everything at once.
For users with many deleted files this could be slow.  
**Fix:** Add "Load more" button in `TrashView.jsx` using the existing `hasMore` flag from the API.

---

## 🟢 Code Quality

### 8. `deleteStudyNote` hard-delete exists alongside soft-delete pattern
**File:** `src/services/api.js` → `deleteStudyNote()`  
The UI uses `delete_status: 'yes'` (soft) but `deleteStudyNote()` does a real `supabase.delete()`.
Not used anywhere currently — should be removed or clearly marked as dangerous.

### 9. `getStudyNotes()` fetches soft-deleted notes from DB
**File:** `src/services/api.js` → `getStudyNotes()`  
Missing `.neq('delete_status', 'yes')` — all soft-deleted notes are returned and filtered in JS.
Add the filter at the query level to reduce data transfer.

### 10. Legacy `getStudyFoldersLegacy` / `getStudyNotesLegacy` are just aliases
**File:** `src/services/api.js` (line ~2000)  
```js
export const getStudyFoldersLegacy = () => getStudyFolders(); // pointless alias
export const getStudyNotesLegacy   = () => getStudyNotes();   // pointless alias
```
These exist because the migration UI calls them. Once migration is confirmed complete, remove them.

---

*Last updated: Aug 2026*
