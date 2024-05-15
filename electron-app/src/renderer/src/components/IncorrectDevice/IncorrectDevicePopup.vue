<template>
	<div class="incorrectDevicePopup">
		<ObjectPopup :height="'20%'" :min-height="'150px'" :width="'30%'" :minWidth="'300px'" :preventClose="true">
			<div class="incorrectDevicePopup__body">
				<div class="incorrectDevicePopup__header">
					<h2>Unregistered device detected</h2>
				</div>
				<div class="incorrectDevicePopup__content">
					We've detected that you're using a device different than your registered one. For your safety, only
					requests from registered devices are allowed. If you want to trust this device, delete one of your
					old devices.
				</div>
				<div class="incorrectDevicePopup__buttons">
					<PopupButton :color="currentPrimaryColor" :text="'Edit Devices'" :width="'6vw'" :minWidth="'80px'"
						:maxWidth="'175px'" :height="'2.5vh'" :minHeight="'25px'" :maxHeight="'45px'"
						:fontSize="'0.8vw'" :minFontSize="'11px'" :maxFontSize="'20px'"
						@onClick="showDevicePopup = true">
					</PopupButton>
					<PopupButton :color="currentPrimaryColor" :text="'Cancel'" :width="'6vw'" :minWidth="'80px'"
						:maxWidth="'175px'" :height="'2.5vh'" :minHeight="'25px'" :maxHeight="'45px'"
						:fontSize="'0.8vw'" :minFontSize="'11px'" :maxFontSize="'20px'" @onClick="close">
					</PopupButton>
				</div>
			</div>
		</ObjectPopup>
		<Teleport to="#body">
			<Transition name="fade">
				<DevicePopup v-if="showDevicePopup" :incorrectDeviceResponse="response" :color="currentPrimaryColor"
					@onClose="close" />
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';

import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import DevicePopup from './DevicePopup.vue';
import PopupButton from '../InputFields/PopupButton.vue';

import { stores } from '@renderer/Objects/Stores';
import { popups } from '@renderer/Objects/Stores/PopupStore';

export default defineComponent({
	name: "IncorrectDevicePopup",
	components:
	{
		DevicePopup,
		ObjectPopup,
		PopupButton
	},
	emits: ['onClose'],
	props: ['response'],
	setup(_, ctx)
	{
		const showDevicePopup: Ref<boolean> = ref(false);
		const popupInfo = popups.incorrectDevice;
		const currentPrimaryColor: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);

		function close()
		{
			showDevicePopup.value = false;
			ctx.emit('onClose');
		}

		onMounted(() =>
		{
			stores.popupStore.addOnEnterHandler(popupInfo.enterOrder!, close);
		});

		onUnmounted(() =>
		{
			stores.popupStore.removeOnEnterHandler(popupInfo.enterOrder!);
		});

		return {
			currentPrimaryColor,
			showDevicePopup,
			zIndex: popupInfo.zIndex,
			close
		}
	}
})
</script>

<style>
.incorrectDevicePopup {
	color: white;
	position: fixed;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
	z-index: v-bind(zIndex);
}

.incorrectDevicePopup__body {
	width: 80%;
	margin: auto;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.incorrectDevicePopup__header {
	font-size: clamp(10px, 1vw, 20px);
}

.incorrectDevicePopup__content {
	font-size: clamp(10px, 0.8vw, 20px);
	margin-top: 2%;
}

.incorrectDevicePopup__buttons {
	display: flex;
	flex-grow: 1;
	align-items: flex-end;
	margin-bottom: 2%;
	column-gap: 20px;
}
</style>
