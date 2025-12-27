import * as cheerio from 'cheerio';
import { MarketProduct } from './market-types';

// Re-export type for backwards compatibility
export type { MarketProduct } from './market-types';

export async function scrapeBinhDienMarket(): Promise<MarketProduct[]> {
    try {
        const response = await fetch('https://chodaumoibinhdien.com.vn/rau-nam-tuoi-trung-va-dau/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        const products: MarketProduct[] = [];

        // Based on inspection, we look for product containers. 
        // Common CMS classes: .product-item, .item, .col-md-*, etc. 
        // We look for elements that contain "Mã SP" and a price.

        // Inspecting the specific structural patterns from the screenshot context:
        // Each product box seems to have an image, a title, a code, and a price.

        // Strategy: Find all price elements, then traverse up to find the container

        $('.product-item, .box-product, .item').each((_: any, el: any) => {
            const container = $(el);

            // Name: usually h3 or a tag
            let name = container.find('h3 a').text().trim() || container.find('.name a').text().trim();
            if (!name) name = container.find('a').first().attr('title') || "";

            // Code: "Mã SP: 9999"
            const codeText = container.text().match(/Mã SP:\s*([0-9]+)/);
            const code = codeText ? codeText[1] : "";

            // Price: "60,000đ"
            const priceText = container.find('.price, .current-price, span[style*="color:red"], font[color="red"]').text().trim();
            const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

            // Image
            const img = container.find('img').attr('src');

            if (name && price > 0) {
                products.push({
                    name,
                    code,
                    price,
                    imageUrl: img,
                    unit: 'kg' // Default assumption based on market norms
                });
            }
        });

        return products;
    } catch (error) {
        console.error("Scrape Error:", error);
        return [];
    }
}
