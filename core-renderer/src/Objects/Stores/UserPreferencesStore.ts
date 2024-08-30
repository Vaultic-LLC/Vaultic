import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { Store } from "./Base";
import { Ref, ref, watch } from "vue";
import { DataType } from "../../Types/Table";
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { api } from "../../API";
import app, { AppStore } from "./AppStore";

export interface UserPreferencesStoreState
{
    currentColorPalette: ColorPalette;
}

// TODO: this should use the state of the last known users prefereences before signing in, and then, 
// if a different user signed in, use their state instead

// TODO: this stuff isn't that important and is mostly visual. We should update the state first
// so that the app doesn't seem like its slow from waitin for it to save. 
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
        const transaction = new StoreUpdateTransaction(Entity.User);
        this.updateCurrentColorPalette(transaction, colorPalette);

        await transaction.commit('');
    }

    public async updateCurrentColorPalette(transaction: StoreUpdateTransaction, colorPalette: ColorPalette)
    {
        const pendingState = this.cloneState();
        // TODO: remove comment
        // This is needed for tracking to work. Otherwise some things won't register that the color palette has changed
        // this.state.currentColorPalette = emptyColorPalette;
        pendingState.currentColorPalette = colorPalette;
        transaction.addStore(this, pendingState, () => this.setCurrentPrimaryColor(app.activePasswordValuesTable))
    }
}