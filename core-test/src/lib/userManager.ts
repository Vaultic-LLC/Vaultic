import { api } from "@renderer/API";
import app, { AppSettings } from "@renderer/Objects/Stores/AppStore";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { TestContext } from "./test";
import StoreUpdateTransaction from "@renderer/Objects/StoreUpdateTransaction";
import { AutoLockTime, DictionaryAsList, PendingStoreState } from "@vaultic/shared/Types/Stores";
import { ServerAllowSharingFrom, ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { publicServerDB } from "./serverDatabaseBridge";
import { Member } from "@vaultic/shared/Types/DataTypes";
import localDatabase from "./localDatabaseBridge";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { DataType, Filter, FilterCondition, Group, NameValuePair, Password, SecurityQuestion } from "@renderer/Types/DataTypes";
import { IPasswordStoreState, PasswordStoreStateKeys, UpdatePasswordResponse } from "@renderer/Objects/Stores/PasswordStore";
import { ReactivePassword } from "@renderer/Objects/Stores/ReactivePassword";
import { ReactiveValue } from "@renderer/Objects/Stores/ReactiveValue";
import { EditableDataType } from "./types/store";
import { PrimarydataTypeStoreStateKeys, SecondarydataTypeStoreStateKeys } from "@renderer/Objects/Stores/Base";
import { IValueStoreState } from "@renderer/Objects/Stores/ValueStore";
import { FilterStoreStateKeys, IFilterStoreState } from "@renderer/Objects/Stores/FilterStore";
import { IGroupStoreState } from "@renderer/Objects/Stores/GroupStore";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

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

    constructor(id: number, email: string, masterKey: string)
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

    getEditablePassword(id: string): EditableDataType<ReactivePassword, IPasswordStoreState, PasswordStoreStateKeys>
    {
        const pendingPasswordStoreState = app.currentVault.passwordStore.getPendingState()!;
        let password = app.currentVault.passwordStore.passwordsByID[id];

        if (!password)
        {
            throw new Error(`Password with id ${id} not found`);
        }

        password = pendingPasswordStoreState.createCustomRef('dataTypesByID.dataType', password, password.id);
        return {
            dataType: password,
            pendingStoreState: pendingPasswordStoreState
        }
    }

    async addPassword(testName: string,ctx: TestContext, password: Password, addedSecurityQuestions: SecurityQuestion[] = []): Promise<Password>
    {
        const pendingPasswordStoreState = app.currentVault.passwordStore.getPendingState()!;
        const addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(this._vaulticKey, password, addedSecurityQuestions, pendingPasswordStoreState);

        ctx.assertTruthy("Add Password succeeded for " + testName, addPasswordSucceeded);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("Retrieved password succeeded for " + testName, retrievedPassword);

        return retrievedPassword;
    }

    async updatePassword(
        testName: string, 
        ctx: TestContext, 
        updatingPassword: EditableDataType<Password, IPasswordStoreState, PasswordStoreStateKeys>,
        passwordWasUpdated: boolean,
        addedSecurityQuestions: SecurityQuestion[],
        updatedSecurityQuestionQuestions: SecurityQuestion[],
        updatedSecurityQuestionAnswers: SecurityQuestion[],
        deletedSecurityQuestions: string[],
        groups: DictionaryAsList): Promise<Password>
    {
        const updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(this._vaulticKey, updatingPassword.dataType, passwordWasUpdated, 
            addedSecurityQuestions, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers, deletedSecurityQuestions, groups, updatingPassword.pendingStoreState);

        ctx.assertTruthy("Update Password succeeded for " + testName, updatePasswordSucceeded == UpdatePasswordResponse.Success);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID[updatingPassword.dataType.id];
        ctx.assertTruthy("Retrieved password succeeded for " + testName, retrievedPassword);

        return retrievedPassword;
    }

    async deletePassword(testName: string, ctx: TestContext, deletingPassword: ReactivePassword): Promise<boolean>
    {
        const deletePasswordSucceeded = await app.currentVault.passwordStore.deletePassword(this._vaulticKey, deletingPassword);
        ctx.assertTruthy("Delete Password succeeded for " + testName, deletePasswordSucceeded);

        const retrievedPassword = app.currentVault.passwordStore.passwordsByID[deletingPassword.id];
        ctx.assertTruthy("Didn't retrieve password for " + testName, !retrievedPassword);

        return deletePasswordSucceeded && !retrievedPassword;
    }

    getEditableNameValuePair(id: string): EditableDataType<ReactiveValue, IValueStoreState, PrimarydataTypeStoreStateKeys>
    {
        const pendingValueStoreState = app.currentVault.valueStore.getPendingState()!;
        let value = app.currentVault.valueStore.nameValuePairsByID[id];

        if (!value)
        {
            throw new Error(`Value with id ${id} not found`);
        }

        value = pendingValueStoreState.createCustomRef('dataTypesByID.dataType', value, value.id);
        return {
            dataType: value,
            pendingStoreState: pendingValueStoreState
        }
    }

    async addNameValuePair(testName: string, ctx: TestContext, value: NameValuePair): Promise<NameValuePair>
    {
        const pendingValueStoreState = app.currentVault.valueStore.getPendingState()!;
        const addedNameValuePairSucceeded = await app.currentVault.valueStore.addNameValuePair(this._vaulticKey, value, pendingValueStoreState);
        ctx.assertTruthy("Add Name Value Pair succeeded for " + testName, addedNameValuePairSucceeded);

        let retrievedNameValuePair = app.currentVault.valueStore.nameValuePairsByID[value.id];
        ctx.assertTruthy("Retrieved Name Value Pair succeeded for " + testName, retrievedNameValuePair);

        return retrievedNameValuePair;
    }

    async updateNameValuePair(
        testName: string, 
        ctx: TestContext, 
        updatedNameValuePair: EditableDataType<NameValuePair, IValueStoreState, PrimarydataTypeStoreStateKeys>,
        valueWasUpdated: boolean, 
        updatedGroups: DictionaryAsList): Promise<NameValuePair>
    {
        const updateNameValuePairSucceeded = await app.currentVault.valueStore.updateNameValuePair(this._vaulticKey, updatedNameValuePair.dataType, 
            valueWasUpdated, updatedGroups, updatedNameValuePair.pendingStoreState);
        ctx.assertTruthy("Update Name Value Pair succeeded for " + testName, updateNameValuePairSucceeded);

        let retrievedNameValuePair = app.currentVault.valueStore.nameValuePairsByID[updatedNameValuePair.dataType.id];
        ctx.assertTruthy("Retrieved Name Value Pair succeeded for " + testName, retrievedNameValuePair);

        return retrievedNameValuePair;
    }

    async deleteNameValuePair(testName: string, ctx: TestContext, deletingNameValuePair: ReactiveValue): Promise<boolean>
    {
        const deleteNameValuePairSucceeded = await app.currentVault.valueStore.deleteNameValuePair(this._vaulticKey, deletingNameValuePair);
        ctx.assertTruthy("Delete Name Value Pair succeeded for " + testName, deleteNameValuePairSucceeded);

        let retrievedNameValuePair = app.currentVault.valueStore.nameValuePairsByID[deletingNameValuePair.id];
        ctx.assertTruthy("Didn't retrieve Name Value Pair for " + testName, !retrievedNameValuePair);

        return deleteNameValuePairSucceeded && !retrievedNameValuePair;
    }

    getEditableFilter(id: string, dataType: DataType): EditableDataType<Filter, IFilterStoreState, FilterStoreStateKeys>
    {
        const pendingFilterStoreState = app.currentVault.filterStore.getPendingState()!;
        let filter = dataType == DataType.Passwords ? app.currentVault.filterStore.passwordFiltersByID[id] :
            app.currentVault.filterStore.nameValuePairFiltersByID[id];

        if (!filter)
        {
            throw new Error(`Value with id ${id} not found`);
        }

        const filterPath = dataType == DataType.Passwords ? 'passwordDataTypesByID.dataType' : 'valueDataTypesByID.dataType';
        const conditionPath = dataType == DataType.Passwords ? 'passwordDataTypes.conditions.condition' : 'valueDataTypes.conditions.condition';
        filter = pendingFilterStoreState.createCustomRef(filterPath, filter, filter.id);

        OH.forEachValue(filter.c, (c) =>
        {
            filter.c[c.id] = pendingFilterStoreState.createCustomRef(conditionPath, c, filter.id, c.id);
        });

        return {
            dataType: filter,
            pendingStoreState: pendingFilterStoreState
        }
    }

    async addFilter(testName: string, ctx: TestContext, filter: Filter): Promise<Filter>
    {
        const pendingFilterStoreState = app.currentVault.filterStore.getPendingState()!;
        const addedFilterSucceeded = await app.currentVault.filterStore.addFilter(this._vaulticKey, filter, pendingFilterStoreState);
        ctx.assertTruthy("Add Filter succeeded for " + testName, addedFilterSucceeded);

        let retrievedFilter = filter.t == DataType.Passwords ? app.currentVault.filterStore.passwordFiltersByID[filter.id] :
            app.currentVault.filterStore.nameValuePairFiltersByID[filter.id];

        ctx.assertTruthy("Retrieved filter succeeded for " + testName, retrievedFilter);
        return retrievedFilter;
    }

    async updateFilter(
        testName: string, 
        ctx: TestContext, 
        updatedFilter: EditableDataType<Filter, IFilterStoreState, FilterStoreStateKeys>, 
        addedFilterConditions: FilterCondition[], 
        removedConditions: string[]): Promise<Filter>
    {
        const updateFilterSucceeded = await app.currentVault.filterStore.updateFilter(this._vaulticKey, updatedFilter.dataType,
             addedFilterConditions, removedConditions, updatedFilter.pendingStoreState);
        ctx.assertTruthy("Update Filter succeeded for " + testName, updateFilterSucceeded);

        let retrievedFilter = updatedFilter.dataType.t == DataType.Passwords ? app.currentVault.filterStore.passwordFiltersByID[updatedFilter.dataType.id] :
            app.currentVault.filterStore.nameValuePairFiltersByID[updatedFilter.dataType.id];

        ctx.assertTruthy("Retrieved filter succeeded for " + testName, retrievedFilter);
        return retrievedFilter;
    }

    async deleteFilter(testName: string, ctx: TestContext, deletingFilter: Filter): Promise<boolean>
    {
        const deleteFilterSucceeded = await app.currentVault.filterStore.deleteFilter(this._vaulticKey, deletingFilter);
        ctx.assertTruthy("Delete Filter succeeded for " + testName, deleteFilterSucceeded);

        let retrievedFilter = deletingFilter.t == DataType.Passwords ? app.currentVault.filterStore.passwordFiltersByID[deletingFilter.id] :
            app.currentVault.filterStore.nameValuePairFiltersByID[deletingFilter.id];

        ctx.assertTruthy("Didn't retrieve filter for " + testName, !retrievedFilter);
        return deleteFilterSucceeded && !retrievedFilter;
    }

    getEditableGroup(id: string, dataType: DataType): EditableDataType<Group, IGroupStoreState, SecondarydataTypeStoreStateKeys>
    {
        const pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
        let group = dataType == DataType.Passwords ? app.currentVault.groupStore.passwordGroupsByID[id] :
            app.currentVault.groupStore.valueGroupsByID[id];

        if (!group)
        {
            throw new Error(`Group with id ${id} not found`);
        }

        const key = dataType == DataType.Passwords ? 'passwordDataTypesByID.dataType' : 'valueDataTypesByID.dataType';
        group = pendingGroupStoreState.createCustomRef(key, group, group.id);

        return {
            dataType: group,
            pendingStoreState: pendingGroupStoreState
        }
    }


    async addGroup(testName: string, ctx: TestContext, group: Group): Promise<Group>
    {
        const pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
        const addedGroupSucceeded = await app.currentVault.groupStore.addGroup(this._vaulticKey, group, pendingGroupStoreState);
        ctx.assertTruthy("Add Group succeeded for " + testName, addedGroupSucceeded);

        let retrievedGroup = group.t == DataType.Passwords ? app.currentVault.groupStore.passwordGroupsByID[group.id] :
            app.currentVault.groupStore.valueGroupsByID[group.id];

        ctx.assertTruthy("Retrieved group succeeded for " + testName, retrievedGroup);
        return retrievedGroup;
    }

    async updateGroup(
        testName: string,
        ctx: TestContext,
        updatedGroup: EditableDataType<Group, IGroupStoreState, SecondarydataTypeStoreStateKeys>, 
        updatedPrimaryObjects: DictionaryAsList): Promise<Group>
    {
        const updateGroupSucceeded = await app.currentVault.groupStore.updateGroup(this._vaulticKey, updatedGroup.dataType, 
            updatedPrimaryObjects, updatedGroup.pendingStoreState);
        ctx.assertTruthy("Update Group succeeded for " + testName, updateGroupSucceeded);

        let retrievedGroup = updatedGroup.dataType.t == DataType.Passwords ? app.currentVault.groupStore.passwordGroupsByID[updatedGroup.dataType.id] :
            app.currentVault.groupStore.valueGroupsByID[updatedGroup.dataType.id];

        ctx.assertTruthy("Retrieved group succeeded for " + testName, retrievedGroup);
        return retrievedGroup;
    }

    async deleteGroup(testName: string, ctx: TestContext, deletingGroup: Group): Promise<boolean>
    {
        const deleteGroupSucceeded = await app.currentVault.groupStore.deleteGroup(this._vaulticKey, deletingGroup);
        ctx.assertTruthy("Delete Group succeeded for " + testName, deleteGroupSucceeded);

        let retrievedGroup = deletingGroup.t == DataType.Passwords ? app.currentVault.groupStore.passwordGroupsByID[deletingGroup.id] :
            app.currentVault.groupStore.valueGroupsByID[deletingGroup.id];
        
        ctx.assertTruthy("Didn't retrieve group for " + testName, !retrievedGroup);
        return deleteGroupSucceeded && !retrievedGroup;
    }
}

class UserManager
{
    private _createdUsers: number = 1;
    private _users: Map<number, User> = new Map();
    private _currentUserID: number | undefined;

    // The first user that is created and never deleted
    private _defaultUserID: number;

    get defaultUserID() { return this._defaultUserID; }
    get defaultUser() { return this._users.get(this._defaultUserID)!; }

    constructor() { }

    async createNewUser(ctx: TestContext, email?: string, masterKey?: string): Promise<User | undefined> 
    {
        const masterKeyToUse = masterKey ?? `test${this._createdUsers}`;
        const vaulticKey = JSON.stringify({ algorithm: Algorithm.XCHACHA20_POLY1305, key: masterKey });
        const emailToUse = email ?? `test${new Date().getTime()}@gmail.com`;

        const registerResponse = await this.registerUser(ctx, emailToUse, masterKeyToUse, vaulticKey);
        if (!registerResponse.success)
        {
            ctx.assertTruthy("Register user works", false);
            return undefined;
        }

        const newUser = new User(registerResponse.value!, emailToUse, masterKeyToUse);
        if (!this._defaultUserID)
        {
            this._defaultUserID = newUser.id;
        }

        this._users.set(newUser.id, newUser);
        this._createdUsers++;
        this._currentUserID = newUser.id;

        return newUser;
    }

    getDefaultUser(): User | undefined
    {
        if (!this._defaultUserID)
        {
            return undefined;
        }

        return this._users.get(this._defaultUserID);
    }

    getCurrentUserID(): number | undefined
    {
        return this._currentUserID;
    }

    getCurrentUser(): User | undefined
    {
        if (!this._currentUserID)
        {
            return undefined;
        }

        return this._users.get(this._currentUserID);
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
        if (!this._users.has(userID))
        {
            return false;
        }

        const user = this._users.get(userID)!;
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

        this._currentUserID = userID;
        return true;
    }

    async logUserInOffline(ctx: TestContext, userID: number): Promise<boolean>
    {
        if (!this._users.has(userID))
        {
            return false;
        }

        const user = this._users.get(userID)!;

        // we want to sync data here. Its any changes done after logging into offline 
        // tht we don't want to sync
        await this.logCurrentUserOut();

        const response = await api.repositories.users.setCurrentUser(user.vaulticKey, user.email);
        ctx.assertTruthy("Set Current user worked", response.success)
    
        let loadUserResponse = await app.loadUserData(user.vaulticKey);
        ctx.assertTruthy("Load user data worked", loadUserResponse);

        this._currentUserID = userID;
        return response.success && loadUserResponse;
    }

    async logCurrentUserOut(redirect: boolean = true, expireSession: boolean = true, syncData: boolean = true)
    {
        if (!this._currentUserID)
        {
            return;
        }

        await app.lock(redirect, expireSession, syncData);
        this._currentUserID = undefined;

        // give time for syncing to finish
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

const userManager = new UserManager();
export default userManager;