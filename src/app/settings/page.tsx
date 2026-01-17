import { getShopSettings, getDistricts, getMessageTemplates } from "./actions";
import { SettingsClient } from "./settings-client";
import { DistrictManagement } from "./district-management";
import { MessageTemplates } from "./message-templates";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getShopSettings();
    const districtsResult = await getDistricts();
    const districts = districtsResult.success && districtsResult.districts ? districtsResult.districts : [];
    const templates = await getMessageTemplates();

    return (
        <div className="space-y-6">
            <SettingsClient initialSettings={settings} />
            <MessageTemplates
                initialShippingTemplate={templates?.smsShippingTemplate || ""}
                initialDeliveredTemplate={templates?.smsDeliveredTemplate || ""}
            />
            <DistrictManagement initialDistricts={districts} />
        </div>
    );
}
