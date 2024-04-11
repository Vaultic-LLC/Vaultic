<template>
    <div class="breachedPasswordsContainer">
        <div class="breachedPasswordsContainer__content">
            <div class="breachedPasswordsContainer__scanButton" :class="{ scanning: scanning }"
                @click="startScan(true)">
                <span v-if="scanning">Scanning...</span>
                <span v-else>Scan</span>
            </div>
            <div class="breachedPasswordsContainer__title">
                <h2>
                    Breached Passwords
                </h2>
            </div>
            <div class="breachedPasswordsContainer__items">
                <div class="breachedPasswordsContainer__map">
                    <WorldMap :scan="scanning" />
                </div>
                <div class="breachedPasswordsContainer__metric">
                    <SmallMetricGauge :model="metricModel" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import WorldMap from './WorldMap.vue';

import { IGroupableSortedCollection, SortedCollection } from '@renderer/Objects/DataStructures/SortedCollections';
import { DataType } from '@renderer/Types/Table';
import { SmallMetricGaugeModel, TableRowData } from '@renderer/Types/Models';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import SmallMetricGauge from '../Dashboard/SmallMetricGauge.vue';
import { stores } from '@renderer/Objects/Stores';
import { ReactivePassword } from '@renderer/Objects/Stores/ReactivePassword';

export default defineComponent({
    name: "BreachedPasswords",
    components:
    {
        WorldMap,
        SmallMetricGauge
    },
    setup()
    {
        const tableRef: Ref<HTMLElement | null> = ref(null);
        const color: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor);
        const passwords: SortedCollection<ReactivePassword> = new IGroupableSortedCollection(DataType.Passwords, [], "passwordFor");
        const tableRowDatas: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection());
        const scanning: Ref<boolean> = ref(false);

        const metricModel: Ref<SmallMetricGaugeModel> = ref(updateMetricModel())

        function updateMetricModel()
        {
            return {
                key: `pbreached${3}${stores.passwordStore.passwords.length}`,
                title: 'Breached',
                filledAmount: 3,
                totalAmount: stores.passwordStore.passwords.length,
                color: color.value,
                active: false,
                pulse: true,
                pulseColor: color.value,
                onClick: function ()
                {
                    //
                }
            };
        }

        function resetMetricModels()
        {
            return {
                key: `pbreached${0}${stores.passwordStore.passwords.length}`,
                title: 'Breached',
                filledAmount: 0,
                totalAmount: stores.passwordStore.passwords.length,
                color: color.value,
                active: false,
                pulse: true,
                pulseColor: 'transparent',
                onClick: function ()
                {
                    //
                }
            };
        }

        const minScanTime: number = 10000;
        function startScan(notifyComplete: boolean)
        {
            scanning.value = true;
            metricModel.value = resetMetricModels();

            const minScanPromise: Promise<void> = new Promise((resolve, _) =>
            {
                setTimeout(() => resolve(), minScanTime);
            });

            const getBreechesPromise: Promise<any> = getBreaches();
            Promise.all([minScanPromise, getBreechesPromise]).then(() =>
            {
                scanning.value = false;
                metricModel.value = updateMetricModel();

                if (notifyComplete)
                {
                    stores.popupStore.showToast(color.value, "Scan Complete", true);
                }
            });
        }

        // hit server to get updated breaches
        function getBreaches(): Promise<any>
        {
            return Promise.resolve();
        }

        // should request the data breeches once when the app first loads and store them somewhere
        onMounted(() =>
        {
            passwords.updateValues(stores.passwordStore.passwords.filter((_, i) => i < 4));

            if (passwords.values.length > 0)
            {
                startScan(false);
            }
        });

        watch(() => stores.passwordStore.passwords.length, (newValue, oldValue) =>
        {
            passwords.updateValues(stores.passwordStore.passwords.filter((_, i) => i < 4));
            if (newValue > oldValue)
            {
                if (passwords.values.length > 0)
                {
                    startScan(false);
                }
            }
        });

        watch(() => color.value, () =>
        {
            metricModel.value = updateMetricModel();
        });

        return {
            color,
            tableRef,
            tableRowDatas,
            scanning,
            metricModel,
            startScan
        }
    }
})
</script>
<style>
.breachedPasswordsContainer {
    position: absolute;
    padding-top: 0.7vw;
    top: max(12px, 4%);
    left: max(325px, 31%);
    width: 25%;
    height: 24.5%;
    min-width: 280px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 20px;
    background: rgb(44 44 51 / 16%);
}

@media (max-width: 1300px) {
    .breachedPasswordsContainer {
        left: max(325px, 28.5%);
    }
}

@media (max-height: 650px) {
    .breachedPasswordsContainer {
        top: max(12px, 2%);
    }
}

.breachedPasswordsContainer__content {
    width: 100%;
    height: 100%;
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
    margin-top: 0.3vw;
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
    margin-top: max(20px, 1vw);
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
    padding: 5px;
    width: 10%;
    height: 7%;
    color: white;
    border-radius: min(1vw, 1rem);
    border: clamp(1.5px, 0.1vw, 2px) solid v-bind(color);
    transition: 0.3s;
    font-size: clamp(10px, 0.8vw, 17px);
}

.breachedPasswordsContainer__scanButton.scanning {
    color: grey;
    border: clamp(1.5px, 0.1vw, 2px) solid grey;
    width: 15%;
    left: 3%
}

.breachedPasswordsContainer__scanButton:not(.scanning):hover {
    box-shadow: 0 0 25px v-bind(color);
}

/* .breachedPasswordsContainer__scanner {
	position: absolute;
	z-index: 2;
	top: 0%;
	width: 100%;
	height: 5%;
	filter: blur(10px);
	background-color: v-bind(color);
	animation: scan 5s infinite;
}

@keyframes scan {
	0% {
		top: 0%;
	}

	50% {
		top: 100%;
	}

	100% {
		top: 0%;
	}
} */
</style>
