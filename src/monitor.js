import { configLoader } from './config/loader.js';
import { depopSearch } from './depop/search.js';
import { discordSender } from './discord/message.js';

export class DepopMonitor {
    constructor() {
        this.processedIds = new Set();
        this.maxProcessedIds = 10000; // Limit to prevent memory leaks
        this.cleanupInterval = null;
    }

    //load searches to monitor from json config
    async loadSearches() {
        const result = await configLoader.importSearches();
        if (result.success) {
            console.log(`Imported ${result.importedCount} searches.`);
            await configLoader.exportSearches(configLoader.searchesList);
        } else {
            console.error('\nImport failed:', result.error);
            process.exit(1);
        }
    }

    //first run to prevent all items from being posted on startup
    async firstPass() {
        configLoader.searchesList.forEach((search, index) => {
            setTimeout(async () => {
                try {
                    console.log('init', search.name);
                    const inits = await depopSearch.getItems(search.params);
                    inits.forEach(item => { this.processedIds.add(item.id); });
                } catch (err) {
                    console.error('\nError in initializing:', err);
                    process.exit(1);
                }
            }, index * 1000);
        });
    }

    //create intervals for each search
    runSearchCycle(client, search) {
        setInterval(async () => {
            try {
                process.stdout.write('.');
                const newItems = await depopSearch.getItems(search.params, this.processedIds);
                if (newItems && newItems.length > 0) {
                    console.log(search.name + ' => +' + newItems.length);
                    newItems.forEach(item => { this.processedIds.add(item.id); });
                    await discordSender.post(newItems, client.channels.cache.get(search.channel));
                }
            } catch (err) {
                console.error('\nError during search cycle for', search.name, err);
                process.exit(1);
            }
        }, search.delay * 1000);
    }

    cleanup() {
        if (this.processedIds.size > this.maxProcessedIds * 0.8) {
            const toDelete = Math.floor(this.processedIds.size * 0.3);
            const iterator = this.processedIds.values();
            for (let i = 0; i < toDelete; i++) {
                const value = iterator.next().value;
                if (value) this.processedIds.delete(value);
            }
            console.log("Memory cleanup");
        }
    }

    async start(client) {
        await this.loadSearches();
        await this.firstPass();
        configLoader.searchesList.forEach((search, index) => {
            setTimeout(() => {
                this.runSearchCycle(client, search);
            }, index * 1000);
        });
        setInterval(() => {this.cleanup()}, 3600000);
    }
}

export const depopMonitor = new DepopMonitor();