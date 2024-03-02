<template>
	<div class="incorrectDeviceViewContainer">
		<div>

		</div>
	</div>
</template>

<script lang="ts">
import { Device } from '@renderer/Types/AccountSetup';
import { ComputedRef, computed, defineComponent } from 'vue';

export default defineComponent({
	name: "IncorrectDeviceView",
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
