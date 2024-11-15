import { Store, StoreState } from "./Base";
import { ClientDevice, Device } from "@vaultic/shared/Types/Device";
import { Field } from "@vaultic/shared/Types/Fields";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { ComputedRef, computed } from "vue";
import app from "./AppStore";

export interface DeviceStoreState extends StoreState
{
    devices: Field<Map<string, Field<ClientDevice>>>;
    failedToGetDevices: Field<boolean>;
}

export class DeviceStore extends Store<DeviceStoreState>
{
    private internalPinnedDeviceIDs: ComputedRef<Set<number>>;
    private internalPinnedDevices: ComputedRef<Field<ClientDevice>[]>;

    get failedToGetDevices() { return this.state.failedToGetDevices.value; }
    get pinnedDevices() { return this.internalPinnedDevices.value; }

    constructor()
    {
        super('deviceStore');

        this.internalPinnedDeviceIDs = computed(() => new Set([...app.userPreferences.pinnedDesktopDevices.value.keyArray(), ...app.userPreferences.pinnedMobileDevices.value.keyArray()]));

        this.internalPinnedDevices = computed(() =>
            this.state.devices.value.mapWhere((k, v) => v.value.UserDesktopDeviceID ? this.internalPinnedDeviceIDs.value.has(v.value.UserDesktopDeviceID) :
                this.internalPinnedDeviceIDs.value.has(v.value.UserMobileDeviceID!),
                (k, v) => v));
    }

    protected defaultState()
    {
        return {
            devices: new Field(new Map<string, Field<ClientDevice>>()),
            failedToGetDevices: new Field(false)
        }
    }

    async getDevices(): Promise<boolean>
    {
        // reset so we don't have any duplicates
        this.updateState(this.defaultState());

        const response = await api.server.user.getDevices();
        if (response.Success)
        {

            await this.setDevices(response.DesktopDevices, true);
            await this.setDevices(response.MobileDevices, false);

            return true;
        }
        else 
        {
            this.state.failedToGetDevices.value = true;
        }

        return false;
    }

    private async setDevices(devices: Device[] | undefined, desktop: boolean): Promise<void>
    {
        if (!devices)
        {
            return;
        }

        for (let i = 0; i < devices.length; i++)
        {
            const deviceId = await api.utilities.generator.uniqueId();
            const clientDevice: ClientDevice =
            {
                ...devices[i],
                id: new Field(deviceId),
                Type: desktop ? "Desktop" : "Mobile"
            };

            this.state.devices.value.set(deviceId, new Field(clientDevice))
        }
    }

    async deleteDevice(masterKey: string, id: string): Promise<boolean>
    {
        const device = this.state.devices.value.get(id);
        if (!device)
        {
            return true;
        }

        const response = await api.server.user.deleteDevice(masterKey, device.value.UserDesktopDeviceID, device.value.UserMobileDeviceID);
        if (response)
        {
            this.state.devices.value.delete(id);
            return true;
        }
        else 
        {
            defaultHandleFailedResponse(response);
        }

        return false;
    }
}