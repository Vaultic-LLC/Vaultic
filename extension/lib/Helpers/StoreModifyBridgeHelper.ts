import { PendingStoreState } from "@vaultic/shared/Types/Stores";
import { AddPasswordFunc, PasswordStoreStateKeys, IPasswordStoreState, UpdatePasswordFunc, DeletePasswordFunc, UpdatePasswordResponse } from "../renderer/Objects/Stores/PasswordStore";
import { Password, SecurityQuestion, NameValuePair, Filter, FilterCondition, Group } from "../renderer/Types/DataTypes";
import { RuntimeMessages } from "../Types/RuntimeMessages";
import { FilterStoreStateKeys, IFilterStoreState } from "../renderer/Objects/Stores/FilterStore";
import { GroupStoreState } from "../renderer/Objects/Stores/GroupStore";
import { PrimarydataTypeStoreStateKeys, SecondarydataTypeStoreStateKeys } from "../renderer/Objects/Stores/Base";
import { ReactivePassword } from "../renderer/Objects/Stores/ReactivePassword";
import { ReactiveValue } from "../renderer/Objects/Stores/ReactiveValue";
import { IValueStoreState } from "../renderer/Objects/Stores/ValueStore";
import app from "../renderer/Objects/Stores/AppStore";
import { DictionaryAsList } from "@vaultic/shared/Types/Stores";
import syncManager from "../Utilities/SyncManager";

export default function setupStoreModifyBridges()
{
    setupPasswordStoreModifyBridge();
    setupValueStoreModifyBridge();
    setupFilterStoreModifyBridge();
    setupGroupStoreModifyBridge();
}

function setupPasswordStoreModifyBridge()
{
    const addPasswordFunc: AddPasswordFunc = async (
        masterKey: string, 
        password: Password, 
        addedSecurityQuestions: SecurityQuestion[], 
        pendingPasswordStoreState: PendingStoreState<IPasswordStoreState, PasswordStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.AddPassword, masterKey, password, addedSecurityQuestions, pendingPasswordStoreState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const updatePasswordFunc: UpdatePasswordFunc = async (
        masterKey: string,
        updatingPassword: Password,
        passwordWasUpdated: boolean,
        addedSecurityQuestions: SecurityQuestion[],
        updatedSecurityQuestionQuestions: SecurityQuestion[],
        updatedSecurityQuestionAnswers: SecurityQuestion[],
        deletedSecurityQuestions: string[],
        addingGroups: DictionaryAsList,
        pendingPasswordState: PendingStoreState<IPasswordStoreState, PasswordStoreStateKeys>): Promise<UpdatePasswordResponse> => 
    {
        const result: UpdatePasswordResponse = await browser.runtime.sendMessage({ type: RuntimeMessages.UpdatePassword, masterKey, updatingPassword, passwordWasUpdated,addedSecurityQuestions, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers, deletedSecurityQuestions, addingGroups, pendingPasswordState });
        if (result == UpdatePasswordResponse.Success)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const deletePasswordFunc: DeletePasswordFunc = async (
        masterKey: string,
        password: ReactivePassword) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.DeletePassword, masterKey, password });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    app.currentVault.passwordStore.setModifyBridge(
    { 
        add: addPasswordFunc, 
        update: updatePasswordFunc, 
        delete: deletePasswordFunc 
    });
}

function setupValueStoreModifyBridge()
{
    const addValueFunc = async (
        masterKey: string, 
        value: NameValuePair, 
        pendingValueStoreState: PendingStoreState<IValueStoreState, PrimarydataTypeStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.AddValue, masterKey, value, pendingValueStoreState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const updateValueFunc = async (
        masterKey: string,
        updatedValue: NameValuePair,
        valueWasUpdated: boolean,
        groups: DictionaryAsList,
        pendingValueStoreState: PendingStoreState<IValueStoreState, PrimarydataTypeStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.UpdateValue, masterKey, updatedValue, valueWasUpdated, groups, pendingValueStoreState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const deleteValueFunc = async (
        masterKey: string,
        value: ReactiveValue) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.DeleteValue, masterKey, value });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    app.currentVault.valueStore.setModifyBridge(
    { 
        add: addValueFunc, 
        update: updateValueFunc, 
        delete: deleteValueFunc 
    });
}

function setupFilterStoreModifyBridge()
{
    const addFilterFunc = async (
        masterKey: string, 
        filter: Filter, 
        pendingFilterState: PendingStoreState<IFilterStoreState, FilterStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.AddFilter, masterKey, filter, pendingFilterState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const updateFilterFunc = async (
        masterKey: string,
        updatedFilter: Filter,
        addedConditions: FilterCondition[],
        removedConditions: string[],
        pendingFilterState: PendingStoreState<IFilterStoreState, FilterStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.UpdateFilter, masterKey, updatedFilter, addedConditions, removedConditions, pendingFilterState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const deleteFilterFunc = async (
        masterKey: string,
        filter: Filter) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.DeleteFilter, masterKey, filter });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    app.currentVault.filterStore.setModifyBridge(
    { 
        add: addFilterFunc, 
        update: updateFilterFunc, 
        delete: deleteFilterFunc 
    });
}

function setupGroupStoreModifyBridge()
{
    const addGroupFunc = async (
        masterKey: string, 
        group: Group, 
        pendingStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.AddGroup, masterKey, group, pendingStoreState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const updateGroupFunc = async (
        masterKey: string,
        updatedGroup: Group,
        updatedPrimaryObjects: DictionaryAsList,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.UpdateGroup, masterKey, updatedGroup, updatedPrimaryObjects, pendingGroupStoreState });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    const deleteGroupFunc = async (
        masterKey: string,
        group: Group) => 
    {
        const result = await browser.runtime.sendMessage({ type: RuntimeMessages.DeleteGroup, masterKey, group });
        if (result)
        {
            await syncManager.syncData();
        }

        return result;
    }

    app.currentVault.groupStore.setModifyBridge(
    { 
        add: addGroupFunc, 
        update: updateGroupFunc, 
        delete: deleteGroupFunc 
    });
}