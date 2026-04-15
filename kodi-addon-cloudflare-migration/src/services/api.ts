import axios from 'axios';

const VAVOO_BASE = 'https://vavoo.to';
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; // For development purposes

export interface MovieItem {
  id: string;
  name: string;
  url?: string;
  group?: string;
  poster?: string;
  type?: 'movie' | 'series' | 'live';
}

export class VavooAPI {
  private static signature: string | null = null;

  static async getSignature() {
    if (this.signature) return this.signature;

    const data = {
      token: "ldCvE092e7gER0rVIajfsXIvRhwlrAzP6_1oEJ4q6HH89QHt24v6NNL_jQJO219hiLOXF2hqEfsUuEWitEIGN4EaHHEHb7Cd7gojc5SQYRFzU3XWo_kMeryAUbcwWnQrnf0-",
      reason: "app-blur",
      locale: "de",
      theme: "dark",
      metadata: {
        device: { type: "Handset", brand: "google", model: "Nexus", name: "21081111RG", uniqueId: "d10e5d99ab665233" },
        os: { name: "android", version: "7.1.2", abis: ["arm64-v8a"], host: "android" },
        app: { platform: "android", version: "1.1.0", buildId: "97215000", engine: "hbc85", signatures: ["6e8a975e3cbf07d5de823a760d4c2547f86c1403105020adee5de67ac510999e"], installer: "com.android.vending" },
        version: { package: "app.lokke.main", binary: "1.1.0", js: "1.1.0" },
        platform: { isAndroid: true, isIOS: false, isTV: false, isWeb: false, isMobile: true, isWebTV: false, isElectron: false }
      },
      package: "app.lokke.main",
      version: "1.1.0",
      process: "app",
    };

    try {
      const response = await axios.post(`${VAVOO_BASE}/api/app/ping`, data, {
        headers: {
          "user-agent": "okhttp/4.11.0",
          "accept": "application/json",
          "content-type": "application/json; charset=utf-8",
        }
      });
      this.signature = response.data.addonSig;
      return this.signature;
    } catch (error) {
      console.error("Ping Error:", error);
      return null;
    }
  }

  static async getCatalog(type: 'movie' | 'series' | 'live', group?: string) {
    const sig = await this.getSignature();
    const data = {
      language: "de",
      region: "AT",
      catalogId: "iptv",
      id: "iptv",
      adult: false,
      search: "",
      sort: "name",
      filter: group ? { group } : {},
      cursor: 0,
      clientVersion: "3.0.2"
    };

    try {
      const response = await axios.post(`${VAVOO_BASE}/mediahubmx-catalog.json`, data, {
        headers: {
          "mediahubmx-signature": sig || '',
          "user-agent": "okhttp/4.11.0",
          "content-type": "application/json; charset=utf-8",
        }
      });
      return response.data.items as MovieItem[];
    } catch (error) {
      console.error("Catalog Error:", error);
      return [];
    }
  }

  static async getLiveGroups() {
    try {
      const response = await axios.get(`${VAVOO_BASE}/live2/index?output=json`);
      const groups = Array.from(new Set(response.data.map((c: any) => c.group))).sort();
      return groups as string[];
    } catch (error) {
      console.error("Groups Error:", error);
      return [];
    }
  }

  static async resolve(url: string) {
    const sig = await this.getSignature();
    const data = {
      language: "de",
      region: "AT",
      url,
      clientVersion: "3.0.2"
    };

    try {
      const response = await axios.post(`${VAVOO_BASE}/mediahubmx-resolve.json`, data, {
        headers: {
          "mediahubmx-signature": sig || '',
          "user-agent": "MediaHubMX/2",
          "content-type": "application/json; charset=utf-8",
        }
      });
      return response.data[0]?.url || response.data.url;
    } catch (error) {
      console.error("Resolve Error:", error);
      return null;
    }
  }
}
