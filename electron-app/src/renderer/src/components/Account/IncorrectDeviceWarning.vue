<template>
	<div class="incorrectDeviceWarning">
		<ObjectPopup :height="'40%'" :width="'30%'" :preventClose="true">
			<div>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';

import { Device } from '@renderer/Types/AccountSetup';

export default defineComponent({
	name: "IncorrectDeviceWarning",
	components:
	{
		ObjectPopup
	},
	props: ['updatesLeft', 'devices'],
	setup(props)
	{
		const updatesLeft: ComputedRef<number> = computed(() => props.updatesLeft);
		const devices: ComputedRef<Device[]> = computed(() => props.devices);

		return {
			updatesLeft,
			devices
		}
	}
})
</script>

<style></style>
