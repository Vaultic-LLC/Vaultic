<template>
	<div class="incorrectDevicePopup">
		<ObjectPopup :height="'20%'" :width="'30%'" :preventClose="true">
			<div class="incorrectDevicePopup__header">
				<h2>Unregistered device detected</h2>
			</div>
			<div class="incorrectDevicePopup__content">
				We've detected that you're using a device different than your registered one. For your safety, only
				requests from registered devices are allowed.
				Would you like to edit your registered devices?
			</div>
			<div class="incorrectDevicePopup__buttons">
				<PopupButton :color="color" :text="'Edit Devices'" :width="'150px'" :height="'40px'" :fontSize="'18px'"
					@onClick="showDevicePopup = true">
				</PopupButton>
				<PopupButton :color="color" :text="'Cancel'" :width="'150px'" :height="'40px'" :fontSize="'18px'"
					@onClick="close">
				</PopupButton>
			</div>
		</ObjectPopup>
		<Teleport to="#body">
			<Transition>
				<DevicePopup v-if="showDevicePopup" :response="response" @onClose="close" />
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, onUnmounted, ref } from 'vue';

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
	props: ['response', 'color'],
	setup(_, ctx)
	{
		const showDevicePopup: Ref<boolean> = ref(false);
		const popupInfo = popups.incorrectDevice;

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
	left: 100%;
	top: 0;
	left: 0;
	z-index: v-bind(zIndex);
}
</style>
