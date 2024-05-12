<template>
	<div class="devicePopup">
		<ObjectPopup :closePopup="closePopup" :minWidth="'800px'" :minHeight="'480px'">
			<div class="devicePopup__content">
				<div class="devicePopup__title">
					<h2>Trusted Devices</h2>
				</div>
				<div class="devicePopup__body">
					<DevicesView :response="response" :color="color" />
				</div>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import DevicesView from './DevicesView.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';

import { IncorrectDeviceResponse } from '@renderer/Types/SharedTypes';
import { popups } from '@renderer/Objects/Stores/PopupStore';

export default defineComponent({
	name: "DeviceView",
	components:
	{
		ObjectPopup,
		DevicesView,
		PopupButton
	},
	emits: ['onClose'],
	props: ['incorrectDeviceResponse', 'color'],
	setup(props, ctx)
	{
		const response: ComputedRef<IncorrectDeviceResponse> = computed(() => props.incorrectDeviceResponse);
		const popupInfo = popups.devicePopup;

		function closePopup()
		{
			ctx.emit('onClose');
		}

		return {
			response,
			zIndex: popupInfo.zIndex,
			closePopup
		}
	}
})
</script>

<style>
.devicePopup {
	position: relative;
	z-index: v-bind(zIndex);
}

.devicePopup__content {
	color: white;
}

.devicePopup__title {
	position: absolute;
	margin: 5%;
	margin-left: 22.3%;
	font-size: clamp(15px, 1vw, 25px);
}

.devicePopup__body {
	position: absolute;
	top: 20%;
	width: 100%;
	height: 80%;
}
</style>
