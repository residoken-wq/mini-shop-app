/**
 * Convert Google Drive sharing URL to direct image URL
 * Supports formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
 * - https://drive.google.com/open?id={FILE_ID}
 * 
 * Returns the direct thumbnail URL or original URL if not a Google Drive link
 */
export function getImageUrl(url: string | null | undefined): string {
    if (!url) return "";

    // Check if it's a Google Drive link
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
        const fileId = driveFileMatch[1];
        // Use Google Drive direct link format
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Check for open?id= format
    const openIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openIdMatch) {
        const fileId = openIdMatch[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Check for uc?id= format (already correct, but normalize)
    const ucIdMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (ucIdMatch) {
        const fileId = ucIdMatch[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Return original URL for non-Google Drive links
    return url;
}

/**
 * Fallback image URL when image fails to load
 */
export const FALLBACK_PRODUCT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='40'%3E🥬%3C/text%3E%3C/svg%3E";
