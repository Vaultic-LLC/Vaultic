import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { Store } from "./Base";
import { Ref, ref, watch } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";
import { validateObject } from "../../Helpers/TypeScriptHelper";
import { isHexString } from "../../Helpers/ColorHelper";
import { DataType } from "../../Types/DataTypes";

export interface UserPreferencesStoreState
{
    currentColorPalette: ColorPalette;
}

export class UserPreferencesStore extends Store<UserPreferencesStoreState>
{
    private internalCurrentPrimaryColor: Ref<string>;

    get currentColorPalette() { return this.state.currentColorPalette; }
    set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
    get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

    constructor(appStore: AppStore)
    {
        super("userPreferencesStoreState");

        this.internalCurrentPrimaryColor = ref('');
        this.setCurrentPrimaryColor(DataType.Passwords);

        this.init(appStore)
    }

    public updateState(state: UserPreferencesStoreState): void 
    {
        let stateToUse = state;
        if (!stateToUse.currentColorPalette)
        {
            stateToUse = this.defaultState();
        }
        else 
        {
            if (!validateObject(stateToUse.currentColorPalette, emptyColorPalette, testProperty))
            {
                stateToUse = this.defaultState();
            }
        }

        super.updateState(stateToUse);

        function testProperty(propName: string, propValue: string): boolean
        {
            if (propName == 'id')
            {
                return typeof propValue == "number";
            }
            else if (propName == 'active' || propName == 'isCreated' || propName == 'editable')
            {
                return typeof propValue == 'boolean';
            }
            else 
            {
                return isHexString(propValue);
            }
        }
    }

    public init(appStore: AppStore)
    {
        watch(() => this.state.currentColorPalette, () =>
        {
            this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
        });

        watch(() => appStore.activePasswordValuesTable, (newValue) =>
        {
            this.setCurrentPrimaryColor(newValue);
        });

        this.setCurrentPrimaryColor(appStore.activePasswordValuesTable);
    }

    protected defaultState(): UserPreferencesStoreState
    {
        return {
            currentColorPalette: colorPalettes[0]
        };
    }

    public async loadLastUsersPreferences()
    {
        const state = await api.repositories.users.getLastUsedUserPreferences();
        if (state)
        {
            const parsedState: UserPreferencesStoreState = JSON.parse(state);
            if (parsedState.currentColorPalette)
            {
                Object.assign(this.state, parsedState);
            }
        }
    }

    private setCurrentPrimaryColor(dataType: DataType)
    {
        switch (dataType)
        {
            case DataType.NameValuePairs:
                this.currentPrimaryColor.value = this.state.currentColorPalette.valuesColor.primaryColor;
                break;
            case DataType.Passwords:
            default:
                this.currentPrimaryColor.value = this.state.currentColorPalette.passwordsColor.primaryColor;
        }
    }

    public async updateAndCommitCurrentColorPalette(colorPalette: ColorPalette)
    {
        const transaction = new StoreUpdateTransaction();
        this.updateCurrentColorPalette(transaction, colorPalette);

        await transaction.commit('');
    }

    public async updateCurrentColorPalette(transaction: StoreUpdateTransaction, colorPalette: ColorPalette)
    {
        // Update the state right away so there is no potential delay for themeing
        this.state.currentColorPalette = colorPalette;
        this.setCurrentPrimaryColor(app.activePasswordValuesTable);

        const pendingState = this.cloneState();
        transaction.updateUserStore(this, pendingState, () => this.setCurrentPrimaryColor(app.activePasswordValuesTable))
    }
}