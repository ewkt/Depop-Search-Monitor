import fs from 'fs/promises';

class JSONStorage {
    constructor(filePath) {
        this.filePath = filePath;
    }
    
    async save(data) {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async load() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return { success: true, data: JSON.parse(data) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

class ConfigLoader {
    constructor(path) {
        this.searches = new Array();
        this.searchHistory = [];
        this.storage = new JSONStorage(path);
    }
    
    //export searches to monitor
    async exportSearches(searches) {
        const data = {
            filters: searches,
            meta: {
                exported_at: new Date().toISOString(),
                total_searches: searches.size,
                version: '1.0'
            }
        };
        return await this.storage.save(data);
    }

    //import searches to monitor
    async importSearches() {
        try {
            const result = await this.storage.load();
            if (!result.success) throw new Error(result.error);
            let importedCount = 0;
            
            for (const [_, conf] of Object.entries(result.data.filters)) {
                const params = this.buildSearchQueryParams(conf.params);
                this.searches.push(
                    {
                        name: conf.name,
                        channel: conf.channel, 
                        delay: conf.delay, 
                        params: params
                    }
                );
                importedCount++;
            }
            return { success: true, importedCount };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    //init, format and order api query parameters
    buildSearchQueryParams(filters = {}) {
        const queryParams = {
            what: filters.what || "",
            cursor: filters.cursor || "",
            items_per_page: filters.items_per_page || 1,
            country: filters.country || process.env.COUNTRY,
        };
        
        const arrayFields = ['brands', 'sizes', 'conditions', 'colours', 'discount_types'];
        arrayFields.forEach(field => {
            if (filters[field]) {
                queryParams[field] = filters[field].join(",");
            }
        });

        queryParams.sort = filters.sort || "newlyListed";
        queryParams.currency = filters.currency || "USD";

        const directFields = [
            'user_id', 'price_min', 'price_max', 'is_discounted', 
            'min_discount', 'max_discount', 'groups', 
            'product_types', 'is_kids', 'gender'
        ];
        directFields.forEach(field => {
            if (filters[field] !== undefined) {
                queryParams[field] = filters[field];
            }
        });

        queryParams.force_fee_calculation = filters.force_fee_calculation || false;
        queryParams.from = filters.from || "in_country_search";
        
        return queryParams;
    }

    //searches getter
    get searchesList() {
        return this.searches;
    }
}

export const configLoader = new ConfigLoader('./conf/searches.json');