const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const keyMatch = env.match(/VITE_YOUTUBE_API_KEY=(.*)/);
const API_KEY = keyMatch ? keyMatch[1].trim() : '';

async function test() {
    const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UC_X5cNV8qJ60N6L9N5-v0Lg&maxResults=5&type=video&key=' + API_KEY);
    const data = await res.json();
    
    if (data.items) {
        const ids = data.items.map(i => i.id.videoId).join(',');
        const res2 = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=' + ids + '&key=' + API_KEY);
        const data2 = await res2.json();
        
        console.log(data2.items.map(i => ({
            title: i.snippet.title,
            liveBroadcastContent: i.snippet.liveBroadcastContent,
            actualEndTime: i.liveStreamingDetails?.actualEndTime
        })));
    } else {
        console.log(data);
    }
}
test();
