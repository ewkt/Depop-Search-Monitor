import { configLoader } from './config/loader.js';
import { depopSearch } from './depop/search.js';
import { discordSender } from './discord/message.js';

export class DepopMonitor {
    constructor() {
        this.processedIds = new Set();
    }

    //load searches to monitor from json config
    async loadSearches() {
        const result = await configLoader.importSearches();
        if (result.success) {
            console.log(`Imported ${result.importedCount} searches.`);
            await configLoader.exportSearches(configLoader.searchesList);
        } else {
            console.error('\nImport failed:', result.error);
            process.exit(1); // Stop the code execution
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
            }
        }, search.delay * 1000);
    }

    async start(client) {
        await this.loadSearches();
        await this.firstPass();
        configLoader.searchesList.forEach((search, index) => {
            setTimeout(() => {
                this.runSearchCycle(client, search);
            }, index * 1000);
        });
    }
}

export const depopMonitor = new DepopMonitor();