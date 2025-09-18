import { fetch, Agent } from "undici";
import UserAgent from 'user-agents';
// import { v4 as uuidv4 } from "uuid";
import dotenv from 'dotenv';
dotenv.config();

class DepopSearch {
    constructor() {
        this.http3Agent = new Agent({
            allowH2: true,
            http3: true
        });

        // this.deviceId = uuidv4();
        this.BASE_URL = process.env.BASE_URL;
        this.API_URL = process.env.API_URL;
        this.ITEM_ENDPOINT = process.env.ITEM_ENDPOINT

        this.ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
    }

    //fetch request handler
    async makeRequest(url, headers, processedIds) {
        try {
            const res = await fetch(url.href, { 
                headers,
                dispatcher: this.http3Agent
            });
            
            if (res.status === 200) {
                const data = await res.json();
                if (processedIds) {
                    data.products = data.products.filter(item => !processedIds.has(item.id));
                }
                return data;
            } else {
                throw `HTTP ${res.status}: ${res.statusText}`;
            };
        } catch (error) {
            throw "Fetch error " + error;
        }
    }

    //format request and call fetch
    async getItems(params, processedIds = false) {
        try {
            const url = new URL(this.API_URL+this.ITEM_ENDPOINT);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            const headers = {
                "User-Agent": this.ua,
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip",
                "Referer": this.BASE_URL,
                "Origin": this.BASE_URL,
            };
            const items = await this.makeRequest(url, headers, processedIds);

            return items.products;
        } catch (error) {
            throw "while getting items: " + error;
        }
    }
}

export const depopSearch = new DepopSearch();