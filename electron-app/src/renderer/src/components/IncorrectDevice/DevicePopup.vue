<template>
	<div class="devicePopup">
		<ObjectPopup>
			<div>
				<div>
					<h2>Trusted Devices</h2>
				</div>
				<DeviceView :response="response" />
				<div>
					<PopupButton :color="color" :text="'Close'" :width="'150px'" :height="'40px'"
						:fontSize="'18px'" @onClick="closePopup">
					</PopupButton>
				</div>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import DeviceView from './DeviceView.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';

import { IncorrectDeviceResponse } from '@renderer/Types/AccountSetup';

export default defineComponent({
	name: "DeviceView",
	components:
	{
		ObjectPopup,
		DeviceView,
		PopupButton
	},
	emits: ['onClose'],
	props: ['incorrectDeviceResponse', 'color'],
	setup(props, ctx)
	{
		const response: ComputedRef<IncorrectDeviceResponse> = computed(() => props.incorrectDeviceResponse);

		function closePopup()
		{
			ctx.emit('onClose');
		}

		return {
			response,
			closePopup
		}
	}
})
</script>

<style></style>
