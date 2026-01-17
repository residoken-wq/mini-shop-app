import { getShopSettings, getCarriers } from "./actions";
import { SettingsClient } from "./settings-client";
import { CarrierManagement } from "./carrier-management";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getShopSettings();
    const carriers = await getCarriers();

    return (
        <div className="space-y-6">
            <SettingsClient initialSettings={settings} />
            <CarrierManagement initialCarriers={carriers} />
        </div>
    );
}
