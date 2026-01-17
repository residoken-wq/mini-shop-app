import { getShopSettings } from "./actions";
import { SettingsClient } from "./settings-client";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getShopSettings();

    return <SettingsClient initialSettings={settings} />;
}
