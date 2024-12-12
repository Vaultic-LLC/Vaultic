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
    private internalDevices: ComputedRef<Field<ClientDevice>[]>;
    private internalPinnedDeviceIDs: ComputedRef<Set<number>>;
    private internalPinnedDevices: ComputedRef<Field<ClientDevice>[]>;

    get devices() { return this.internalDevices.value; }
    get failedToGetDevices() { return this.state.failedToGetDevices.value; }
    get pinnedDevices() { return this.internalPinnedDevices.value; }

    constructor()
    {
        super('deviceStore');

        this.internalDevices = computed(() => this.state.devices.value.valueArray());
        this.internalPinnedDeviceIDs = computed(() => new Set([...app.userPreferences.pinnedDesktopDevices.value.keyArray(), ...app.userPreferences.pinnedMobileDevices.value.keyArray()]));

        this.internalPinnedDevices = computed(() =>
            this.state.devices.value.mapWhere((k, v) => v.value.userDesktopDeviceID.value ? this.internalPinnedDeviceIDs.value.has(v.value.userDesktopDeviceID.value) :
                this.internalPinnedDeviceIDs.value.has(v.value.userMobileDeviceID.value!),
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
                userDesktopDeviceID: new Field(devices[i].UserDesktopDeviceID),
                userMobileDeviceID: new Field(devices[i].UserMobileDeviceID),
                name: new Field(devices[i].Name),
                model: new Field(devices[i].Model),
                version: new Field(devices[i].Version),
                type: new Field(desktop ? "Desktop" : "Mobile")
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

        const response = await api.server.user.deleteDevice(masterKey, device.value.userDesktopDeviceID.value, device.value.userMobileDeviceID.value);
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