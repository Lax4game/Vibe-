async function run() {
  try {
    const url = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.youtube.com/results?search_query=sontung+official+audio');
    const r = await fetch(url);
    const d = await r.json();
    const match = d.contents.match(/"videoId":"([^"]{11})"/);
    console.log('SUCCESS:', match ? match[1] : 'NOT FOUND');
  } catch(e) {
    console.error(e);
  }
}
run();
