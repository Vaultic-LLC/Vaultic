import { api } from "@renderer/API";
import app, { AppSettings } from "@renderer/Objects/Stores/AppStore";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { TestContext } from "./test";
import StoreUpdateTransaction from "@renderer/Objects/StoreUpdateTransaction";
import { AutoLockTime } from "@vaultic/shared/Types/Stores";
import { ServerAllowSharingFrom, ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { publicServerDB } from "./serverDatabaseBridge";
import { Member } from "@vaultic/shared/Types/DataTypes";
import localDatabase from "./localDatabaseBridge";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

export class User
{
    private _id: number;
    private _email: string;
    private _vaulticKey: string;
    private _masterKey: string;

    private _publicEncryptingKey: string | undefined;
    private _loadedUserData: boolean;

    get id(): number { return this._id; }
    get email(): string { return this._email; }
    get vaulticKey(): string { return this._vaulticKey; }
    get masterKey(): string { return this._masterKey; }
    get publicEncryptingKey(): string | undefined { return this._publicEncryptingKey; }

    constructor(id: number, email: string, masterKey: string, vaulticKey: string)
    {
        this._id = id;
        this._email = email;
        this._vaulticKey = JSON.stringify({ algorithm: Algorithm.XCHACHA20_POLY1305, key: masterKey });
        this._masterKey = masterKey;

        this._publicEncryptingKey = undefined;
        this._loadedUserData = false;
    }

    async loadUserData(ctx: TestContext): Promise<boolean>
    {
        if (this._loadedUserData)
        {
            return true;
        }

        const user = await publicServerDB.getUserByID(this._id);
        if (!user)
        {
            ctx.assertTruthy("Fetched user succeeded", false);
            return false;
        }

        this._publicEncryptingKey = user!.PublicEncryptingKey;
        this._loadedUserData = true;

        return true;
    }

    toMember(): Member
    {
        return {
            userID: this._id,
            firstName: "Test",
            lastName: "Test",
            username: this._email,
            permission: ServerPermissions.View,
            publicEncryptingKey: this._publicEncryptingKey,
            icon: undefined
        }
    }
}

class UserManager
{
    private createdUsers: number = 1;
    private users: Map<number, User> = new Map();
    private currentUserID: number | undefined;

    constructor() { }

    async createNewUser(ctx: TestContext, email?: string, masterKey?: string): Promise<User | undefined> 
    {
        const masterKeyToUse = masterKey ?? `test${this.createdUsers}`;
        const vaulticKey = JSON.stringify({ algorithm: Algorithm.XCHACHA20_POLY1305, key: masterKey });
        const emailToUse = email ?? `test${new Date().getTime()}@gmail.com`;

        const registerResponse = await this.registerUser(ctx, emailToUse, masterKeyToUse, vaulticKey);
        if (!registerResponse.success)
        {
            ctx.assertTruthy("Register user works", false);
            return undefined;
        }

        const newUser = new User(registerResponse.value!, emailToUse, masterKeyToUse, vaulticKey);

        this.users.set(newUser.id, newUser);
        this.createdUsers++;
        this.currentUserID = newUser.id;

        return newUser;
    }

    getCurrentUserID(): number | undefined
    {
        return this.currentUserID;
    }

    getCurrentUser(): User | undefined
    {
        if (!this.currentUserID)
        {
            return undefined;
        }

        return this.users.get(this.currentUserID);
    }

    private async registerUser(ctx: TestContext, email: string, masterKey: string, vaulticKey: string): Promise<TypedMethodResponse<number>>
    {
        await this.logCurrentUserOut();

        const validateEmailResponse = await api.server.user.validateEmail(email);
        if (!validateEmailResponse.Success)
        {
            ctx.assertTruthy("Validate Email Response Succeeded", false);
            return TypedMethodResponse.fail();
        }
            
        const verifyEmailResponse = await api.server.user.verifyEmail(validateEmailResponse.PendingUserToken!, validateEmailResponse.Code!);
        if (!verifyEmailResponse.Success)
        {
            ctx.assertTruthy("Verify Email Response Succeeded", false);
            return TypedMethodResponse.fail();
        }

        const registerUserResposne = await api.helpers.server.registerUser(masterKey, validateEmailResponse.PendingUserToken!, "Test", "Test");
        if (!registerUserResposne.Success)
        {
            ctx.assertTruthy("Register user works", false);
            return TypedMethodResponse.fail();
        }

        // --- first log in needs to do some more work ---
        const firstLogInResponse = await api.helpers.server.logUserIn(masterKey, email, true, false);
        if (!firstLogInResponse.success || !firstLogInResponse.value?.Success)
        {
            ctx.assertTruthy("Log user in works", false);
            return TypedMethodResponse.fail();
        }

        const createUserResponse = await api.repositories.users.createUser(masterKey, email, "Test", "Test");
        app.isOnline = true;

        const userIDResponse = await localDatabase.query<{ userID: number }>(`SELECT "UserID" FROM "Users" WHERE "Email" = '${email}'`);
        if (userIDResponse.length == 0)
        {
            ctx.assertTruthy("User ID response is empty", false);
            return TypedMethodResponse.fail();
        }

        const loadDataResponse = await app.loadUserData(createUserResponse.value!);
        if (!loadDataResponse)
        {
            ctx.assertTruthy("Load Data works after first login", false);
            return TypedMethodResponse.fail();
        }

        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);

        const state = app.getPendingState()!;
        const reactiveAppSettings: AppSettings = state.createCustomRef("settings", JSON.parse(JSON.stringify(app.settings)));
        reactiveAppSettings.a = AutoLockTime.ThirtyMinutes;

        state.commitProxyObject("settings", reactiveAppSettings);

        transaction.updateUserStore(app, state);
        const updateLocalSettingsResponse = await transaction.commit(vaulticKey);
        ctx.assertTruthy("Update local settings succeeded", updateLocalSettingsResponse);

        const updateUserNameResponse = await api.server.user.updateSettings(email, true, ServerAllowSharingFrom.Everyone);
        ctx.assertTruthy("Update user name succeeded", updateUserNameResponse.Success);
        // --- end of first log in ---

        return TypedMethodResponse.success(userIDResponse[0].userID);
    }

    async logUserIn(ctx: TestContext, userID: number): Promise<boolean>
    {
        if (this.currentUserID === userID || !this.users.has(userID))
        {
            return false;
        }

        const user = this.users.get(userID)!;

        await this.logCurrentUserOut();

        let response = await api.helpers.server.logUserIn(user.masterKey, user.email, false, false);
    
        let logInRetrys = 0;
        while (response.value?.isSyncing)
        {
            if (logInRetrys >= 5)
            {
                ctx.assertTruthy("Syncing is taking too long", false);
                return false;
            }
    
            logInRetrys += 1;
            await new Promise((resolve) =>
                setTimeout(async () =>
                {
                    response = await api.helpers.server.logUserIn(user.masterKey, user.email, false, false);
                    resolve(true);
                }, 1000));
        }
    
        if (!response.success || !response.value?.Success)
        {
            ctx.assertTruthy("Log user in works", false);
            return false;
        }

        app.isOnline = true;
    
        if (response.value?.masterKey)
        {
            const loadDataResponse = await app.loadUserData(response.value?.masterKey!);
            ctx.assertTruthy("Load User Data works", loadDataResponse);
    
            if (loadDataResponse)
            {
                const syncDataResponse = await app.syncVaults(response.value?.masterKey!, user.email, true);
                ctx.assertTruthy("Sync Data Works", syncDataResponse);
            }
        }
        else
        {
            const syncAndLoadDataResponse = await app.syncAndLoadUserData(user.masterKey, user.email);
            ctx.assertTruthy("Sync And Load Data Works", syncAndLoadDataResponse);
        }

        this.currentUserID = userID;
        return true;
    }

    async logCurrentUserOut(redirect: boolean = true, expireSession: boolean = true, syncData: boolean = true)
    {
        if (!this.currentUserID)
        {
            return;
        }

        await app.lock(redirect, expireSession, syncData);
        this.currentUserID = undefined;

        // give time for syncing to finish
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

const userManager = new UserManager();
export default userManager;