// Type definition for market products - separate from scraper to avoid SSR issues
export interface MarketProduct {
    name: string;
    code: string;
    price: number;
    imageUrl?: string;
    unit?: string;
}
