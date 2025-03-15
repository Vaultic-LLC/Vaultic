<template>
    <div class="breachedPasswordsContainer">
        <div class="breachedPasswordsContainer__content">
            <div v-if="canLoadWidget" class="breachedPasswordsContainer__scanButton" :class="{ scanning: scanning }"
                @click="startScan(true)">
                <span v-if="scanning">Scanning...</span>
                <span v-else>Scan</span>
            </div>
            <div v-if="canLoadWidget" class="breachedPasswordsContainer__clearButton" @click="clearBreaches">
                <span>Clear</span>
            </div>
            <div class="breachedPasswordsContainer__title">
                <h2>
                    Data Breaches
                </h2>
            </div>
            <div class="breachedPasswordsContainer__items" v-if="!canLoadWidget">
                <WidgetSubscriptionMessage />
            </div>
            <div class="breachedPasswordsContainer__items" v-else-if="!failedToLoad">
                <div class="breachedPasswordsContainer__map">
                    <VaulticTable id="breachPasswordsByVault" :color="color" :columns="tableColumns" 
                        :dataSources="tableDataSources" :emptyMessage="'No Data Breaches for any Vaults'" :loading="scanning"
                        :allowSearching="false" :hidePaginator="true" :allowPinning="false" :smallRows="true" />
                </div>
                <div class="breachedPasswordsContainer__metric">
                    <SmallMetricGauge :model="metricModel" />
                </div>
            </div>
            <div class="breachedPasswordsContainer__items" v-else>
                <WidgetErrorMessage :message="'Unable to load Breached Passwords at this time. Please try again later'" />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import SmallMetricGauge from '../Dashboard/SmallMetricGauge.vue';
import WidgetErrorMessage from '../Widgets/WidgetErrorMessage.vue';
import VaulticTable from '../Table/VaulticTable.vue';
import WidgetSubscriptionMessage from '../Widgets/WidgetSubscriptionMessage.vue';

import { SmallMetricGaugeModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { AtRiskType, DataType, Password, VaultAndBreachCount } from '../../Types/DataTypes';
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { Field } from '@vaultic/shared/Types/Fields';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';

export default defineComponent({
    name: "BreachedPasswords",
    components:
    {
        SmallMetricGauge,
        WidgetErrorMessage,
        VaulticTable,
        WidgetSubscriptionMessage
    },
    setup()
    {
        const canLoadWidget: ComputedRef<boolean> = computed(() => app.canShowSubscriptionWidgets.value);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value);
        const scanning: Ref<boolean> = ref(false);
        const failedToLoad: ComputedRef<boolean> = computed(() => app.vaultDataBreaches.failedToLoadDataBreaches);
        let backingVaultsAndBreachCount: Map<string, VaultAndBreachCount> = new Map();
        const vaultAndBreachCountCollection: SortedCollection = new SortedCollection([], () => backingVaultsAndBreachCount, "vault");

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 0,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Data Breaches",
                    collection: vaultAndBreachCountCollection                
                },
            ]
        });

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            models.push(new TableColumnModel("Vault", "vault").setIsFielded(false));
            models.push(new TableColumnModel("Breaches", "breachCount").setIsFielded(false));

            return models;
        });

        const metricModel: ComputedRef<SmallMetricGaugeModel> = computed(() =>
        {
            if (scanning.value)
            {
                return {
                    key: `pbreached${0}${app.currentVault.passwordStore.passwords.length}`,
                    title: 'This Vault',
                    filledAmount: 0,
                    totalAmount: app.currentVault.passwordStore.passwords.length,
                    color: color.value,
                    active: false,
                    pulse: true,
                    pulseColor: 'transparent',
                    onClick: function ()
                    {
                        // don't do anything while we are scanning
                    }
                };
            }
            else
            {
                const breachedCount: number = app.currentVault.passwordStore.breachedPasswords.length;
                return {
                    key: `pbreached${breachedCount}${app.currentVault.passwordStore.passwords.length}`,
                    title: 'This Vault',
                    filledAmount: breachedCount,
                    totalAmount: app.currentVault.passwordStore.passwords.length,
                    color: color.value,
                    active: app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.Breached,
                    pulse: breachedCount > 0,
                    pulseColor: color.value,
                    onClick: function ()
                    {
                        app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Breached);
                    }
                };
            }
        })

        async function startScan(notifyComplete: boolean)
        {
            if (!canLoadWidget.value)
            {
                return;
            }

            if (scanning.value)
            {
                return;
            }
            
            scanning.value = true;

            const result: boolean = await app.vaultDataBreaches.getVaultDataBreaches();
            scanning.value = false;

            if (notifyComplete)
            {
                if (result)
                {
                    app.popups.showToast("Scan Complete", true);
                }
                else
                {
                    app.popups.showToast("Scan Failed", false);
                }
            }
        }

        async function checkPasswordForBreach(password: Field<ReactivePassword>)
        {
            if (!canLoadWidget.value)
            {
                return;
            }

            scanning.value = true;
            await app.vaultDataBreaches.checkPasswordForBreach(password);
            scanning.value = false;          
        }

        async function checkPasswordsForBreach(passwords: Password[])
        {
            if (!canLoadWidget.value)
            {
                return;
            }

            scanning.value = true;
            await app.vaultDataBreaches.checkPasswordsForBreach(passwords);
            scanning.value = false;          
        }

        function setRows()
        {
            backingVaultsAndBreachCount = new Map();
            const rows: TableRowModel[] = [];           

            app.vaultDataBreaches.vaultDataBreachCountByVaultID.forEach((v, k, map) => 
            {
                const vault = app.userVaultsByVaultID.get(k);
                if (vault)
                {
                    const vaultAndBreachCount: VaultAndBreachCount = 
                    {
                        vaultID: k,
                        vault: vault.name,
                        breachCount: v
                    }

                    backingVaultsAndBreachCount.set(k.toString(), vaultAndBreachCount);
                    rows.push(new TableRowModel(k.toString(), undefined, undefined, vaultAndBreachCount));
                }
            });

            vaultAndBreachCountCollection.updateValues(rows);
        }

        function clearBreaches()
        {
            app.popups.showClearDataBreachesPopup();
        }

        watch(() => app.loadedUser.value, (newValue) =>
        {
            if (!newValue)
            {
                return;
            }

            if (app.currentVault.passwordStore.passwords.length == 0)
            {
                return;
            }

            startScan(false);
        });

        onMounted(() =>
        {
            app.vaultDataBreaches.addEvent("onBreachesUpdated", setRows);
            app.vaultDataBreaches.addEvent("onBreachDismissed", setRows);

            app.currentVault.passwordStore.addEvent("onCheckPasswordBreach", checkPasswordForBreach);
            app.currentVault.passwordStore.addEvent("onCheckPasswordsForBreach", checkPasswordsForBreach);
        });

        onUnmounted(() =>
        {
            app.vaultDataBreaches.removeEvent("onBreachesUpdated", setRows);
            app.vaultDataBreaches.removeEvent("onBreachDismissed", setRows);
            
            app.currentVault.passwordStore.removeEvent("onCheckPasswordBreach", checkPasswordForBreach);
            app.currentVault.passwordStore.addEvent("onCheckPasswordsForBreach", checkPasswordsForBreach);
        });

        return {
            canLoadWidget,
            color,
            scanning,
            metricModel,
            failedToLoad,
            tableDataSources,
            tableColumns,
            startScan,
            clearBreaches
        }
    }
})

</script>
<style>
.breachedPasswordsContainer {
    position: absolute;
    padding-top: 0.7vw;
    top: max(12px, 4%);
    left: max(325px, 38%);
    width: 23%;
    height: 24.5%;
    /* min-width: 280px; */
    min-height: 190px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 20px;
    background: rgb(44 44 51 / 16%);
}

/* @media (max-width: 1300px) {
    .breachedPasswordsContainer {
        left: max(325px, 28.5%);
    }
} */

@media (max-height: 650px) {
    .breachedPasswordsContainer {
        top: max(12px, 2%);
    }
}

.breachedPasswordsContainer__content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.breachedPasswordsContainer__title {
    color: white;
    height: 10%;
    font-size: clamp(10px, 0.8vw, 17px);
}

.breachedPasswordsContainer__items {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 82.5%;
    margin-top: 0.7vw;
    flex-grow: 1;
}

.breeachedPasswordTable {
    position: relative;
    width: 60%;
    height: 100%;
}

.breachedPasswordsContainer .spinningGlobe {
    position: relative;
    width: 35%;
    height: 100%;
}

.breachedPasswordsContainer__map {
    position: relative;
    width: 70%;
    height: 100%;
    /* background: rgb(44 44 51 / 16%); */
    border-radius: 20px;
}

.breachedPasswordsContainer__metric {
    width: 30%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    /* margin-top: max(20px, 1vw); */
    transform: translateX(-2%);
}

.breachedItemContainer {
    display: flex;
    row-gap: 30px;
    flex-direction: column;
}

.breachedPasswordsContainer__scanButton {
    position: absolute;
    top: 5%;
    left: 2%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    width: 10%;
    min-width: 35px;
    height: 7%;
    color: white;
    border-radius: clamp(7px, 0.4vw, 0.425rem);
    border: clamp(1.5px, 0.1vw, 2px) solid v-bind(color);
    transition: 0.3s;
    font-size: clamp(10px, 0.8vw, 17px);
    cursor: pointer;
}

.breachedPasswordsContainer__scanButton.scanning {
    color: grey;
    border: clamp(1.5px, 0.1vw, 2px) solid grey;
    width: 17%;
    min-width: 60px;
    left: 3%
}

.breachedPasswordsContainer__scanButton:not(.scanning):hover {
    box-shadow: 0 0 25px v-bind(color);
}

.breachedPasswordsContainer__clearButton {
    position: absolute;
    top: 5%;
    right: 2%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    width: 10%;
    min-width: 35px;
    height: 7%;
    color: white;
    border-radius: clamp(7px, 0.4vw, 0.425rem);
    border: clamp(1.5px, 0.1vw, 2px) solid v-bind(color);
    transition: 0.3s;
    font-size: clamp(10px, 0.8vw, 17px);
    cursor: pointer;
}

.breachedPasswordsContainer__clearButton:hover {
    box-shadow: 0 0 25px v-bind(color);
}

#breachPasswordsByVault {
    position: relative;
    height: 100%;
    width: 93%;
}
</style>
