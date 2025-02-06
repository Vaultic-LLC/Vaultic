import { Store, StoreState } from "./Base";
import { ClientDevice, Device, DeviceInfo } from "@vaultic/shared/Types/Device";
import { api } from "../../API";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { ComputedRef, Ref, computed, ref } from "vue";
import app from "./AppStore";

export class DeviceStore extends Store<StoreState>
{
    private internalCurrentDeviceInfo: Ref<DeviceInfo | undefined>;
    private internalRegisteredCurrentDevice: Ref<ClientDevice | undefined>;
    private internalFailedToGetDevices: Ref<boolean>;
    private internalDevicesByID: Ref<Map<string, ClientDevice>>;
    private internalDevices: ComputedRef<ClientDevice[]>;

    private internalHasRegisteredCurrentDevice: ComputedRef<boolean>;

    get currentDeviceInfo() { return this.internalCurrentDeviceInfo.value; }
    get devices() { return this.internalDevices.value; }
    get failedToGetDevices() { return this.internalFailedToGetDevices.value; }
    get hasRegisteredCurrentDevice() { return this.internalHasRegisteredCurrentDevice.value; }

    constructor()
    {
        super('deviceStore');

        this.internalCurrentDeviceInfo = ref(undefined);
        this.internalRegisteredCurrentDevice = ref(undefined);
        this.internalFailedToGetDevices = ref(false);
        this.internalDevicesByID = ref(new Map());
        this.internalDevices = computed(() => this.internalDevicesByID.value.valueArray());

        this.internalHasRegisteredCurrentDevice = computed(() => this.internalRegisteredCurrentDevice.value != undefined)
    }

    public resetToDefault(): void
    {
        this.internalFailedToGetDevices.value = false;
        this.internalDevicesByID.value = new Map();
        this.internalCurrentDeviceInfo.value = undefined;
        this.internalRegisteredCurrentDevice.value = undefined;
    }

    async getDevices(): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        // reset so we don't have any duplicates
        this.resetToDefault();

        const response = await api.server.user.getDevices();
        if (response.Success)
        {
            await this.setDevices(response.DesktopDevices, true, response.RegisteredCurrentDesktopDeviceID);
            await this.setDevices(response.MobileDevices, false, response.RegisteredCurrentMobileDeviceID);

            this.internalCurrentDeviceInfo.value = await api.getDeviceInfo();
            return true;
        }
        else 
        {
            this.internalFailedToGetDevices.value = true;
        }

        return false;
    }

    private async setDevices(devices: Device[] | undefined, desktop: boolean, currentRegisteredID?: number): Promise<void>
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
                id: deviceId,
                type: desktop ? "Desktop" : "Mobile",
            };

            if (!this.internalRegisteredCurrentDevice.value &&
                (desktop && devices[i].UserDesktopDeviceID == currentRegisteredID) || (!desktop && devices[i].UserMobileDeviceID == currentRegisteredID))
            {
                this.internalRegisteredCurrentDevice.value = clientDevice;
            }

            this.internalDevicesByID.value.set(deviceId, clientDevice);
        }
    }

    async addDevice(device: ClientDevice): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const result = await api.server.user.registerDevice(device.Name, device.RequiresMFA);
        if (!result.Success)
        {
            return false;
        }

        device.UserDesktopDeviceID = result.UserDesktopDeviceID;
        device.UserMobileDeviceID = result.UserMobileDeviceID;

        const deviceId = await api.utilities.generator.uniqueId();
        device.id = deviceId;

        this.internalDevicesByID.value.set(deviceId, device);
        this.internalRegisteredCurrentDevice.value = device;

        return true;
    }

    async updateDevice(device: ClientDevice): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const result = await api.server.user.updateDevice(device.Name, device.RequiresMFA,
            device.UserDesktopDeviceID, device.UserMobileDeviceID);

        if (!result.Success)
        {
            return false;
        }

        const currentDevice = this.internalDevicesByID.value.get(device.id);
        if (currentDevice)
        {
            currentDevice.Name = device.Name;
            currentDevice.RequiresMFA = device.RequiresMFA;
        }

        return true;
    }

    async deleteDevice(id: string): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const device = this.internalDevicesByID.value.get(id);
        if (!device)
        {
            return true;
        }

        const response = await api.server.user.deleteDevice(device.UserDesktopDeviceID, device.UserMobileDeviceID);
        if (response)
        {
            this.internalDevicesByID.value.delete(id);
            if (this.internalRegisteredCurrentDevice.value?.id == id)
            {
                this.internalRegisteredCurrentDevice.value = undefined;
            }

            return true;
        }
        else 
        {
            defaultHandleFailedResponse(response);
        }

        return false;
    }
}