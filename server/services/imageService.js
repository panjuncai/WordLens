const axios = require('axios');
const cheerio = require('cheerio');

async function fetchImages(word, offset = 0) {
  const query = `${word} photo`;
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${offset + 1}&count=5&cc=FR&setLang=fr`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
  });
  const $ = cheerio.load(response.data);
  const urls = [];
  const seen = new Set();
  $('.iusc').each((_, el) => {
    const meta = $(el).attr('m');
    if (meta) {
      try {
        const m = JSON.parse(meta);
        if (m?.murl && /^https?:\/\//.test(m.murl) && !seen.has(m.murl)) {
          urls.push(m.murl);
          seen.add(m.murl);
        }
      } catch (err) {
        // ignore parse errors
      }
    }
    if (urls.length >= 5) return false;
    return undefined;
  });
  return urls;
}

module.exports = { fetchImages };
