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
                    Data Breaches
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
import SmallMetricGauge from '../Dashboard/SmallMetricGauge.vue';

import { SmallMetricGaugeModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';
import { AtRiskType, DataType } from '../../Types/DataTypes';

export default defineComponent({
    name: "BreachedPasswords",
    components:
    {
        WorldMap,
        SmallMetricGauge,
    },
    setup()
    {
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value);
        const scanning: Ref<boolean> = ref(false);

        const metricModel: ComputedRef<SmallMetricGaugeModel> = computed(() =>
        {
            if (scanning.value)
            {
                return {
                    key: `pbreached${0}${app.currentVault.passwordStore.passwords.length}`,
                    title: 'Breached',
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
                    title: 'Breached',
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

        const minScanTime: number = 7000;
        async function startScan(notifyComplete: boolean)
        {
            scanning.value = true;

            const minScanPromise: Promise<void> = new Promise((resolve, _) =>
            {
                setTimeout(() => resolve(), minScanTime);
            });

            const getBreechesPromise: Promise<any> = getUserBreaches(notifyComplete);
            const result = await Promise.all([minScanPromise, getBreechesPromise]);

            scanning.value = false;

            if (notifyComplete)
            {
                if (result[1] === true)
                {
                    app.popups.showToast(color.value, "Scan Complete", true);
                }
                else
                {
                    app.popups.showToast(color.value, "Scan Failed", false);
                }
            }
        }

        async function getUserBreaches(notifyFailed: boolean): Promise<boolean>
        {
            const requestData = 
            {
                LimitedPasswords: app.currentVault.passwordStore.passwords.map(p =>
                {
                    return {
                        id: p.value.id.value,
                        domain: p.value.domain.value
                    }
                })
            };

            const response = await api.server.user.getUserDataBreaches(JSON.vaulticStringify(requestData));
            if (response.Success)
            {
                app.userDataBreaches.updateUserBreaches(response.DataBreaches!);
                return true;
            }
            // don't be showing random popups when we were updating in the background
            else if (notifyFailed)
            {
                defaultHandleFailedResponse(response);
            }

            return false;
        }

        // should request the data breeches once when the app first loads and store them somewhere
        onMounted(() =>
        {
            if (app.currentVault.passwordStore.passwords.length > 0)
            {
                startScan(false);
            }
        });

        watch(() => app.currentVault.passwordStore.passwords.length, (newValue, oldValue) =>
        {
            if (newValue > oldValue)
            {
                startScan(false);
            }
        });

        watch(() => app.isOnline, () =>
        {
            if (app.currentVault.passwordStore.passwords.length == 0)
            {
                return;
            }

            // wait for the main global animation to finish before sending a request to help prevent it glitching
            setTimeout(() => startScan(false), 3000);
        });

        return {
            color,
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
    left: max(325px, 38%);
    width: 23%;
    height: 24.5%;
    min-width: 280px;
    min-height: 190px;
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
    cursor: pointer;
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
