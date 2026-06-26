// ═══════════════════════════════════════════════════════════════
// SAVED VIDEOS & SYNC — Copy and paste this block into the BOTTOM of
// your Code.gs file, then add the Case lines to doPost().
//
// Add these lines inside the switch(action) in doPost:
//   case 'getSavedVideos':  result = getSavedVideos();         break;
//   case 'saveVideo':       result = saveVideo(params);        break;
//   case 'getYTChannels':    result = getYTChannels();          break;
//   case 'saveYTChannel':   result = saveYTChannel(params);    break;
//   case 'removeYTChannel': result = removeYTChannel(params);  break;
//   case 'getYTDismissed':  result = getYTDismissed();        break;
//   case 'saveYTDismissed': result = saveYTDismissed(params);  break;
// ═══════════════════════════════════════════════════════════════

var S_VIDEOS = 'SAVED_VIDEOS';
var S_YT_CHANS = 'YT_CHANNELS';
var S_YT_DISMISSED = 'YT_DISMISSED';

/**
 * Ensure the YouTube-related sheets exist.
 */
function initYouTubeSync() {
  var ss = _ss();
  var defs = {};
  defs[S_VIDEOS] = ['video_id', 'title', 'channel_title', 'channel_id', 'thumbnail', 'published_at', 'saved_at'];
  defs[S_YT_CHANS] = ['id', 'title', 'thumbnail', 'uploadsId', 'subs', 'added_at'];
  defs[S_YT_DISMISSED] = ['video_id', 'dismissed_at'];

  Object.keys(defs).forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow(defs[name]);
    }
  });
}

// --- Saved Library ---
function getSavedVideos() {
  initYouTubeSync();
  return _sheetToObjects(S_VIDEOS).sort(function(a, b) {
    return String(b.saved_at).localeCompare(String(a.saved_at));
  });
}

function saveVideo(params) {
  initYouTubeSync();
  if (_findRow(S_VIDEOS, 'video_id', params.video_id) > 0) return { success: true, exists: true };
  params.saved_at = _now();
  _appendRow(S_VIDEOS, params);
  return { success: true };
}

// --- Channels Sync ---
function getYTChannels() {
  initYouTubeSync();
  return _sheetToObjects(S_YT_CHANS);
}

function saveYTChannel(params) {
  initYouTubeSync();
  if (_findRow(S_YT_CHANS, 'id', params.id) > 0) return { success: true, exists: true };
  params.added_at = _now();
  _appendRow(S_YT_CHANS, params);
  return { success: true };
}

function removeYTChannel(params) {
  initYouTubeSync();
  var sheet = _sheet(S_YT_CHANS);
  var row = _findRow(S_YT_CHANS, 'id', params.id);
  if (row > 0) {
    sheet.deleteRow(row);
    return { success: true };
  }
  return { success: false, error: 'Channel not found' };
}

// --- Dismissed Videos Sync ---
function getYTDismissed() {
  initYouTubeSync();
  return _sheetToObjects(S_YT_DISMISSED).map(function(r) { return r.video_id; });
}

function saveYTDismissed(params) {
  initYouTubeSync();
  if (_findRow(S_YT_DISMISSED, 'video_id', params.video_id) > 0) return { success: true, exists: true };
  _appendRow(S_YT_DISMISSED, {
    video_id: params.video_id,
    dismissed_at: _now()
  });
  return { success: true };
}
