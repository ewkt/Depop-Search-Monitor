import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

class DiscordSender {
    constructor() {}

    //create message buttons
    createComponents(itemSlug) {
        const username = itemSlug.split('-')[0];
        
        return [
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setLabel("Details")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://www.depop.com/products/" + itemSlug),
                new ButtonBuilder()
                    .setLabel("Profile")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://www.depop.com/" + username),
            ]),
        ];
    }

    //format the timestamp
    cleanTime(time) {
        let delay;
        if (time < 1000) {
            delay = `${time.toFixed(0)}ms`;
        } else if (time < 60000) {
            delay = `${(time/1000).toFixed(0)}s`;
        } else if (time < 3600000) {
            delay = `${(time / 60000).toFixed(0)}min`;
        } else {
            delay = `${(time / 3600000).toFixed(0)}h`;
        }
        return delay;
    }

    //create message embed
    createEmbed(item) {
        const price = item.pricing.original_price.total_price;
        const title = item.slug.split(/-(.+)/)[1].replace(/-/g, " ");
        const size = item.sizes.length > 1 ? item.sizes.join(", ") : item.sizes[0] || "NA";
        const currency = item.pricing.currency_name;
        const timestamp = new Date(item.date_created);
        const msDelay = Math.abs((Date.now() - timestamp.valueOf()));
        const delay = this.cleanTime(msDelay);

        const embed = {
            title: `${title.substring(0, 25)} (${~~price}) ${size}`,
            url: item.url,
            fields: [
                {
                    name: "\u200B",
                    value: `\`\`\`YAML\n Size: ${size} - ${price}${currency}  (${delay})\`\`\``,
                    inline: true,
                },
                {
                    name: "\u200B",
                    value: `\`\`\`YAML\n ${title} \`\`\``,
                },
            ],
            image: { url: item.preview[Object.keys(item.preview)[1]] },
            timestamp,
            color: parseInt("09b1ba", 16),
        };
        return embed;
    }

    //send formatted message to discord channel
    async post(items, channel) {
        const messages = items.slice(0, 10).map(async (item) => {
            try {
                const components = this.createComponents(item.slug);
                const embed = this.createEmbed(item);

                return await channel.send({
                    embeds: [embed],
                    components,
                });

            } catch (error) {
                throw `Failed to send message for item ${item.id}:`, error.message;
            }
        });

        try {
            await Promise.all(messages);
        } catch (error) {
            throw "while sending batch messages:" + error;
        }
    }
}

export const discordSender = new DiscordSender();