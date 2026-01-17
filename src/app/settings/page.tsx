import { getShopSettings, getDistricts } from "./actions";
import { SettingsClient } from "./settings-client";
import { DistrictManagement } from "./district-management";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getShopSettings();
    const districtsResult = await getDistricts();
    const districts = districtsResult.success && districtsResult.districts ? districtsResult.districts : [];

    return (
        <div className="space-y-6">
            <SettingsClient initialSettings={settings} />
            <DistrictManagement initialDistricts={districts} />
        </div>
    );
}
