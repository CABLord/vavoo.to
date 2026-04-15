// ============================================
// VAVOO API — Cloudflare Worker
// Deploy: wrangler deploy
// ============================================

const CCAPI = 'https://vavoo.to/ccapi/';
const TMDB = 'https://api.themoviedb.org/3/';
const TMDB_KEY = '86dd18b04874d9c94afadde7993d94e3';
const LOKKE = 'https://www.lokke.app/api/app/ping';
const MACLIST_URL = 'https://raw.githubusercontent.com/michaz1988/michaz1988.github.io/releases/latest/download/maclist.json';
const VAVOO_LIVE = 'https://www2.vavoo.to/live2/index?output=json';
const MEDIAHUB = 'https://vavoo.to/mediahubmx-';

// ---- In-Memory-Cache ----
const MC = new Map();
const mcGet = (k, ttl = 3600000) => { const e = MC.get(k); if (e && Date.now() - e.t < ttl) return e.v; MC.delete(k); return null; };
const mcSet = (k, v) => MC.set(k, { v, t: Date.now() });

// ---- Auth-Signatur ----
let _sig = null, _sigT = 0;
async function getSig() {
  if (_sig && Date.now() - _sigT < 300000) return _sig;
  const payload = {
    token: "ldCvE092e7gER0rVIajfsXIvRhwlrAzP6_1oEJ4q6HH89QHt24v6NNL_jQJO219hiLOXF2hqEfsUuEWitEIGN4EaHHEHb7Cd7gojc5SQYRFzU3XWo_kMeryAUbcwWnQrnf0-",
    reason: "app-blur", locale: "de", theme: "dark",
    metadata: {
      device: { type: "Handset", brand: "google", model: "Nexus", name: "21081111RG", uniqueId: "d10e5d99ab665233" },
      os: { name: "android", version: "7.1.2", abis: ["arm64-v8a"], host: "android" },
      app: { platform: "android", version: "1.1.0", buildId: "97215000", engine: "hbc85", signatures: ["6e8a975e3cbf07d5de823a760d4c2547f86c1403105020adee5de67ac510999e"], installer: "com.android.vending" },
      version: { package: "app.lokke.main", binary: "1.1.0", js: "1.1.0" },
      platform: { isAndroid: true, isIOS: false, isTV: false, isWeb: false, isMobile: true, isWebTV: false, isElectron: false }
    },
    appFocusTime: 0, playerActive: false, playDuration: 0, devMode: true, hasAddon: true, castConnected: false,
    package: "app.lokke.main", version: "1.1.0", process: "app",
    firstAppStart: Date.now(), lastAppStart: Date.now(),
    ipLocation: null, adblockEnabled: false,
    proxy: { supported: ["ss", "openvpn"], engine: "openvpn", ssVersion: 1, enabled: false, autoServer: true, id: "fi-hel" },
    iap: { supported: true }
  };
  const r = await fetch(LOKKE, {
    method: 'POST',
    headers: { 'user-agent': 'okhttp/4.11.0', 'accept': 'application/json', 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  _sig = j.addonSig;
  _sigT = Date.now();
  return _sig;
}

// ---- CCAPI-Proxy (Fetch-Loop) ----
async function ccReq(action, params, method = 'GET', body = null) {
  const sig = await getSig();
  const u = new URL(CCAPI + action);
  if (method === 'GET' && params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  const opts = { method, headers: { 'auth-token': sig, 'user-agent': 'okhttp/4.11.0' } };
  if (body) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const resp = await fetch(u.toString(), opts);
  return resp.json();
}

async function cc2(action, params) {
  let res = await ccReq(action, params);
  for (let i = 0; i < 12; i++) {
    if (!res || typeof res !== 'object' || !('id' in res) || !('data' in res)) return res;
    const d = res.data;
    if (typeof d === 'object' && d?.type === 'fetch') {
      const fp = d.params || {};
      const b = fp.body ? atob(fp.body) : undefined;
      const h = fp.headers ? Object.fromEntries(Object.entries(fp.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) : {};
      const fr = await fetch(d.url, { method: (fp.method || 'GET').toUpperCase(), headers: h, body: b, redirect: fp.redirect === 'follow' ? 'follow' : 'manual' });
      const rh = Object.fromEntries(fr.headers.entries());
      const rb = fp.body ? btoa(await fr.text()) : null;
      res = await ccReq('res', { id: res.id }, 'POST', { status: fr.status, url: fr.url, headers: rh, data: rb });
    } else if (typeof d === 'object' && d?.error) {
      return null;
    } else {
      return d;
    }
  }
  return null;
}

// ---- TMDB ----
async function tmdb(path, extra = {}) {
  const u = new URL(TMDB + path);
  u.searchParams.set('api_key', TMDB_KEY);
  u.searchParams.set('language', 'de-DE');
  Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return (await fetch(u.toString())).json();
}

// ---- Stream-Quellen ----
async function getSources(type, tmdbId, name, s, e) {
  const sig = await getSig();
  const data = {
    language: 'de', region: 'AT',
    type: type.startsWith('series') ? 'series' : 'movie',
    ids: { tmdb_id: String(tmdbId) }, name,
    episode: s && e ? { season: Number(s), episode: Number(e) } : {},
    clientVersion: '3.0.2'
  };
  const r = await fetch(MEDIAHUB + 'source.json', {
    method: 'POST',
    headers: { 'user-agent': 'MediaHubMX/2', 'content-type': 'application/json; charset=utf-8', 'mediahubmx-signature': sig },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function resolveUrl(url) {
  const sig = await getSig();
  const data = { language: 'de', region: 'AT', url, clientVersion: '3.0.2' };
  const r = await fetch(MEDIAHUB + 'resolve.json', {
    method: 'POST',
    headers: { 'user-agent': 'MediaHubMX/2', 'content-type': 'application/json; charset=utf-8', 'mediahubmx-signature': sig },
    body: JSON.stringify(data)
  });
  const j = await r.json();
  return j?.[0]?.url || j?.data?.url || j?.url || null;
}

// ---- VAVOO Live ----
async function getLiveGroups() {
  const r = await fetch(VAVOO_LIVE);
  const chans = await r.json();
  const groups = [...new Set(chans.map(c => c.group))].sort();
  return { groups, hash: await crypto.subtle.digest('MD5', new TextEncoder().encode(JSON.stringify(chans))).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')).catch(() => '') };
}

async function getLiveChannels(groups) {
  const sig = await getSig();
  const all = [];
  for (const group of groups) {
    let cursor = 0;
    while (cursor !== null && cursor !== undefined) {
      const data = { language: 'de', region: 'AT', catalogId: 'iptv', id: 'iptv', adult: false, search: '', sort: 'name', filter: { group }, cursor, clientVersion: '3.0.2' };
      try {
        const r = await fetch(MEDIAHUB + 'catalog.json', {
          method: 'POST',
          headers: { 'user-agent': 'MediaHubMX/2', 'content-type': 'application/json; charset=utf-8', 'mediahubmx-signature': sig },
          body: JSON.stringify(data)
        });
        const j = await r.json();
        if (j.items) all.push(...j.items);
        cursor = j.nextCursor ?? null;
      } catch { break; }
    }
  }
  return all;
}

// ---- Stalker-Portal ----
async function stalkerReq(portalUrl, mac, params, token = null) {
  const base = portalUrl.replace(/\/c$/, '/server/load.php');
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  u.searchParams.set('JsHttpRequest', '1-xml');
  const cookies = [`mac=${encodeURIComponent(mac)}`, 'stb_lang=en', `timezone=${encodeURIComponent('Europe/Paris')}`];
  if (token) cookies.push(`token=${encodeURIComponent(token)}`);
  const headers = {
    'Accept': '*/*', 'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 1812 Mobile Safari/533.3',
    'Referer': portalUrl, 'Accept-Language': 'en-US,en;q=0.5', 'Pragma': 'no-cache',
    'X-User-Agent': 'Model: MAG250; Link: WiFi', 'Cookie': cookies.join('; '), 'Connection': 'Close'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(u.toString(), { headers });
  if (r.status === 403) return { error: 'IP_BLOCKED' };
  const t = await r.text();
  if (t.includes('IP adresiniz engellenmistir')) return { error: 'IP_BLOCKED' };
  try { return JSON.parse(t).js; } catch { return null; }
}

// ---- Kanalnamen-Filter (vereinfacht) ----
function filterName(n) {
  if (!n) return '';
  let s = n.toUpperCase().replace(/\s+/g, ' ').trim();
  const map = {
    'DAS ERSTE': 'ARD', 'BIBELTV': 'BIBEL TV', 'SPORT1': 'SPORT 1',
    'COMEDY CENTRAL': 'COMEDY CENTRAL', 'E! ENTERTAINMENT': 'E! ENTERTAINMENT',
    'DISCOVERY CHANNEL': 'DISCOVERY', 'NICK JR': 'NICK JUNIOR',
  };
  if (map[s]) return map[s];
  s = s.replace(/(F|Q|U)?HD\+?|(2|4|8)K|(720|1080|2160)p?|HEVC|H265|RAW|SD|AUSTRIA|GERMANY|DEUTSCHLAND/g, '').trim();
  s = s.replace(/\((DE|AT|CH)\)/g, '').replace(/(^\|?\s*(DE|AT|CH)\s*[\|:\-]?\s*|\s+(DE|AT|CH)\s*$)/, '').trim();
  return s || n;
}

// ---- CORS + Response ----
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (data, s = 200) => new Response(JSON.stringify(data), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

// ---- Router ----
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const { pathname: p, searchParams: q } = new URL(request.url);
    try {
      // Explicit /api/ccapi/list for frontend compatibility (fallback to cc2)
      if (p === '/api/ccapi/list') {
        console.log('CCAPI list:', Object.fromEntries(q));
        try {
          const data = await cc2('list', Object.fromEntries(q));
          return json(data || { error: 'No data from CCAPI' });
        } catch (e) {
          console.error('CCAPI error:', e);
          return json({ error: 'CCAPI failed: ' + e.message }, 500);
        }
      }
      switch (p) {
        // Inhalt durchsuchen (CCAPI + browse)
        case '/api/ccapi': {
          console.log('CCAPI generic:', Object.fromEntries(q));
          try {
            return json(await cc2('list', Object.fromEntries(q)));
          } catch (e) {
            console.error('CCAPI cc2 error:', e);
            return json({ error: 'CCAPI cc2 failed: ' + e.message }, 500);
          }
        }
        case '/api/browse': {
          const id = q.get('id'), cursor = q.get('cursor') || '0';
          const k = `b:${id}:${cursor}`;
          let d = mcGet(k, 86400000);
          if (!d) { d = await cc2('list', { id, cursor }); mcSet(k, d); }
          return json(d);
        }
        // TMDB-Metadaten
        case '/api/meta': {
          const id = q.get('id'), s = q.get('s'), e = q.get('e');
          const [mt, tid] = id.replace('series', 'tv').split('.');
          let path = `${mt}/${tid}`;
          const app = mt === 'movie' ? 'credits,videos,external_ids,release_dates,keywords,translations' : 'credits,videos,external_ids,content_ratings,keywords,translations';
          if (s && !e) path += `/season/${s}`;
          if (s && e) path += `/season/${s}/episode/${e}`;
          const k = `m:${id}:${s}:${e}`;
          let d = mcGet(k, 604800000);
          if (!d) { d = await tmdb(path, { append_to_response: app }); mcSet(k, d); }
          return json(d);
        }
        // Stream-Quellen
        case '/api/sources': {
          const id = q.get('id'), name = q.get('name'), s = q.get('s'), e = q.get('e');
          const [type, tid] = id.split('.');
          const k = `s:${id}:${s}:${e}`;
          let d = mcGet(k, 3600000);
          if (!d) { d = await getSources(type, tid, name, s, e); mcSet(k, d); }
          return json(d);
        }
        // Stream-URL auflösen
        case '/api/resolve': {
          const url = q.get('url');
          const k = `r:${url}`;
          let d = mcGet(k, 3600000);
          if (!d) { d = await resolveUrl(url); mcSet(k, d); }
          return json({ url: d });
        }
        // Suche
        case '/api/search': {
          const type = q.get('type') || 'movie', query = q.get('q');
          const id = `${type}.search=${encodeURIComponent(query)}`;
          const k = `sr:${id}`;
          let d = mcGet(k, 86400000);
          if (!d) { d = await cc2('list', { id }); mcSet(k, d); }
          return json(d);
        }
        // Genre-Liste (hardcoded wie im Original)
        case '/api/genres': {
          const type = q.get('type') || 'movie';
          const movieGenres = ["Action","Abenteuer","Animation","Komödie","Krimi","Dokumentarfilm","Drama","Familie","Fantasy","Historie","Horror","Musik","Mystery","Liebesfilm","Science Fiction","TV-Film","Thriller","Kriegsfilm","Western"];
          const seriesGenres = ["Action & Adventure","Animation","Komödie","Krimi","Dokumentarfilm","Drama","Familie","Kids","Mystery","News","Reality","Sci-Fi & Fantasy","Soap","Talk","War & Politics","Western"];
          return json(type === 'series' ? seriesGenres : movieGenres);
        }
        // VAVOO Live: Gruppen
        case '/api/live/groups': {
          const k = 'lg';
          let d = mcGet(k, 3600000);
          if (!d) { d = await getLiveGroups(); mcSet(k, d); }
          return json(d);
        }
        // VAVOO Live: Alle Kanäle (frontend-kompatibel)
        case '/api/live': {
          const k = 'live:all';
          let data = mcGet(k, 3600000);
          if (!data) {
            const groupsData = await getLiveGroups();
            const groups = groupsData.groups;
            data = await getLiveChannels(groups);
            data.forEach(ch => {
              ch.group = groups.find(g => ch.name?.toLowerCase().includes(g.toLowerCase())) || 'Sonstige';
            });
            mcSet(k, data);
          }
          return json(data);
        }
        // VAVOO Live: Kanäle
        case '/api/live/channels': {
          const groups = JSON.parse(q.get('groups') || '[]');
          const k = `lc:${groups.join(',')}`;
          let d = mcGet(k, 3600000);
          if (!d) { d = await getLiveChannels(groups); mcSet(k, d); }
          return json(d);
        }
        // VAVOO Live: Stream auflösen
        case '/api/live/resolve': {
          const url = q.get('url');
          const d = await resolveUrl(url);
          return json({ url: d });
        }
        // Stalker: Handshake
        case '/api/stalker/handshake': {
          const portal = q.get('portal'), mac = q.get('mac');
          const r = await stalkerReq(portal, mac, { type: 'stb', action: 'handshake' });
          return json({ token: r?.token || null });
        }
        // Stalker: Profile (Token-Refresh)
        case '/api/stalker/profile': {
          const portal = q.get('portal'), mac = q.get('mac'), token = q.get('token');
          const r = await stalkerReq(portal, mac, { type: 'stb', action: 'get_profile', hd: '1', ver: 'ImageDescription: 0.2.18-r23-250', stb_type: 'MAG250', client_type: 'STB', auth_second_step: '1', not_valid_token: '0', timestamp: Math.floor(Date.now() / 1000), api_signature: '262', prehash: '' }, token);
          return json({ token: r?.token || token });
        }
        // Stalker: Genres
        case '/api/stalker/genres': {
          const portal = q.get('portal'), mac = q.get('mac'), token = q.get('token');
          const r = await stalkerReq(portal, mac, { type: 'itv', action: 'get_genres' }, token);
          if (r?.error) return json(r);
          const genres = {};
          if (Array.isArray(r)) r.forEach(g => { if (g.title && g.id && g.id !== '*') genres[g.title] = g.id; });
          return json(genres);
        }
        // Stalker: Kanäle
        case '/api/stalker/channels': {
          const portal = q.get('portal'), mac = q.get('mac'), token = q.get('token');
          const r = await stalkerReq(portal, mac, { type: 'itv', action: 'get_all_channels' }, token);
          if (r?.error) return json(r);
          return json(r?.data || []);
        }
        // Stalker: Stream-URL
        case '/api/stalker/resolve': {
          const portal = q.get('portal'), mac = q.get('mac'), token = q.get('token'), cmd = q.get('cmd');
          const r = await stalkerReq(portal, mac, { type: 'itv', action: 'create_link', cmd }, token);
          if (r?.error) return json(r);
          return json({ url: r?.cmd?.split(' ').pop() || null });
        }
        // MAC-Listen
        case '/api/maclists': {
          const k = 'ml';
          let d = mcGet(k, 86400000);
          if (!d) { d = await (await fetch(MACLIST_URL)).json(); mcSet(k, d); }
          return json(d);
        }
        default:
          return json({ error: 'Not found', endpoints: ['/api/browse','/api/meta','/api/sources','/api/resolve','/api/search','/api/genres','/api/live/groups','/api/live/channels','/api/live/resolve','/api/stalker/handshake','/api/stalker/genres','/api/stalker/channels','/api/stalker/resolve','/api/maclists'] }, 404);
      }
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};