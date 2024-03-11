<template>
	<div class="devicePopup">
		<ObjectPopup>
			<div>
				<div>
					<h2>Trusted Devices</h2>
				</div>
				<DeviceView :response="response" />
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { IncorrectDeviceResponse } from '@renderer/Types/AccountSetup';
import DeviceView from './DeviceView.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';

export default defineComponent({
	name: "DeviceView",
	emits: ['onUpdated', 'onCancelled'],
	props: ['incorrectDeviceResponse'],
	setup(props)
	{
		const response: ComputedRef<IncorrectDeviceResponse> = computed(() => props.incorrectDeviceResponse);

		return {
			response,
		}
	}
})
</script>

<style></style>
