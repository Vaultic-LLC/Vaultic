<template>
    <div class="syncingPopupContainer">
        <div class="syncingPopupContainer__text">Syncing</div>
        <div class="syncingPopupContainer__indicator">
            <div v-if="!finished" class="syncingPopupContainer__loadingIndictor">
                <div class="spinner center">
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                    <div class="spinner-blade"></div>
                </div>
            </div>
            <div v-else>
                <IonIcon class="syncingPopupContainer__doneIcon" :name="'checkmark-outline'" />
            </div>
            <ProgressBar :mode="mode" :value="progress" :showValue="false"
                :pt="{
                    root: 'syncingPopupContainer__progress',
                    value: 'syncingPopupContainer__progressValue'
                }" />
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, onUnmounted, Ref, ref, watch, ComputedRef, computed } from 'vue';

import ProgressBar from "primevue-vaultic/progressbar";
import IonIcon from '../Icons/IonIcon.vue';

import { popups } from '../../Objects/Stores/PopupStore';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "SyncingPopup",
    components:
    {
        ProgressBar,
        IonIcon
    },
    props: ['finish'],
    setup(props)
    {
        const popupInfo = popups.toast;
        const progress: Ref<number> = ref(0);
        const finished: Ref<boolean> = ref(false);
        const mode: Ref<"determinate" | "indeterminate"> = ref('determinate');
        let interval: any = undefined;

        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        function finish()
        {
            progress.value = 100;
            finished.value = true;
            mode.value = "determinate";
        }

        watch(() => props.finish.value, () =>
        {
            if (props.finish.value)
            {
                clearInterval(interval)
                finish();
                setTimeout(() => app.popups.hideSyncingPopup(), 1500);
            }
        })

        onMounted(() =>
        {
            interval = setInterval(() =>
            {
                progress.value = progress.value + 20;
                if (progress.value > 100)
                {
                    mode.value = "indeterminate"
                }
            }, 2000);
        });

        onUnmounted(() =>
        {
            clearInterval(interval)
        });

        return {
            progress,
            mode,
            zIndex: popupInfo.zIndex,
            primaryColor,
            finished,
            finish
        }
    }
})
</script>
<style>
.syncingPopupContainer {
    position: fixed;
    width: 11%;
    min-width: 150px;
    max-width: 300px;
    height: 5%;
    min-height: 40px;
    top: 5%;
    right: 5%;
    /* transform: translateX(-50%); */
    border: 1.5px solid color-mix(in srgb, rgb(108 101 148), #101010  50%);
    border-radius: min(1vw, 1rem);
    background-color: color-mix(in srgb, #212c6f, #101010  85%);
    display: flex;
    justify-content: space-between;
    z-index: v-bind(zIndex);
    flex-direction: column;
    padding: 10px;
}

.syncingPopupContainer__text {
    display: flex;
}

.syncingPopupContainer__indicator {
    display: flex;
    width: 100%;
    align-items: center;
    column-gap: 10px;
}

.syncingPopupContainer__doneIcon {
    width: 22px;
    height: 22px;
}

.syncingPopupContainer__progress {
    width: 100%;
    height: 7px !important;
}

.syncingPopupContainer__progressValue {
    background: v-bind(primaryColor) !important;
}

.spinner {
  font-size: 18px;
  position: relative;
  display: inline-block;
  width: 1em;
  height: 1em;
}
.spinner .spinner-blade {
  position: absolute;
  left: 0.4629em;
  bottom: 0;
  width: 0.074em;
  height: 0.2777em;
  border-radius: 0.0555em;
  background-color: transparent;
  -webkit-transform-origin: center -0.2222em;
  -ms-transform-origin: center -0.2222em;
  transform-origin: center -0.2222em;
  animation: spinner-fade9234 1s infinite linear;
}

.spinner .spinner-blade:nth-child(1) {
  -webkit-animation-delay: 0s;
  animation-delay: 0s;
  -webkit-transform: rotate(0deg);
  -ms-transform: rotate(0deg);
  transform: rotate(0deg);
}

.spinner .spinner-blade:nth-child(2) {
  -webkit-animation-delay: 0.083s;
  animation-delay: 0.083s;
  -webkit-transform: rotate(30deg);
  -ms-transform: rotate(30deg);
  transform: rotate(30deg);
}

.spinner .spinner-blade:nth-child(3) {
  -webkit-animation-delay: 0.166s;
  animation-delay: 0.166s;
  -webkit-transform: rotate(60deg);
  -ms-transform: rotate(60deg);
  transform: rotate(60deg);
}

.spinner .spinner-blade:nth-child(4) {
  -webkit-animation-delay: 0.249s;
  animation-delay: 0.249s;
  -webkit-transform: rotate(90deg);
  -ms-transform: rotate(90deg);
  transform: rotate(90deg);
}

.spinner .spinner-blade:nth-child(5) {
  -webkit-animation-delay: 0.332s;
  animation-delay: 0.332s;
  -webkit-transform: rotate(120deg);
  -ms-transform: rotate(120deg);
  transform: rotate(120deg);
}

.spinner .spinner-blade:nth-child(6) {
  -webkit-animation-delay: 0.415s;
  animation-delay: 0.415s;
  -webkit-transform: rotate(150deg);
  -ms-transform: rotate(150deg);
  transform: rotate(150deg);
}

.spinner .spinner-blade:nth-child(7) {
  -webkit-animation-delay: 0.498s;
  animation-delay: 0.498s;
  -webkit-transform: rotate(180deg);
  -ms-transform: rotate(180deg);
  transform: rotate(180deg);
}

.spinner .spinner-blade:nth-child(8) {
  -webkit-animation-delay: 0.581s;
  animation-delay: 0.581s;
  -webkit-transform: rotate(210deg);
  -ms-transform: rotate(210deg);
  transform: rotate(210deg);
}

.spinner .spinner-blade:nth-child(9) {
  -webkit-animation-delay: 0.664s;
  animation-delay: 0.664s;
  -webkit-transform: rotate(240deg);
  -ms-transform: rotate(240deg);
  transform: rotate(240deg);
}

.spinner .spinner-blade:nth-child(10) {
  -webkit-animation-delay: 0.747s;
  animation-delay: 0.747s;
  -webkit-transform: rotate(270deg);
  -ms-transform: rotate(270deg);
  transform: rotate(270deg);
}

.spinner .spinner-blade:nth-child(11) {
  -webkit-animation-delay: 0.83s;
  animation-delay: 0.83s;
  -webkit-transform: rotate(300deg);
  -ms-transform: rotate(300deg);
  transform: rotate(300deg);
}

.spinner .spinner-blade:nth-child(12) {
  -webkit-animation-delay: 0.913s;
  animation-delay: 0.913s;
  -webkit-transform: rotate(330deg);
  -ms-transform: rotate(330deg);
  transform: rotate(330deg);
}

@keyframes spinner-fade9234 {
  0% {
    background-color: #69717d;
  }

  100% {
    background-color: transparent;
  }
}
</style>
