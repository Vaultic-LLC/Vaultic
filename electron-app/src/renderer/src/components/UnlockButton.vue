<template>
	<div class="unlockButtonContainer" @click.stop="onClick">
		<div class="unlockButtonContainer__button">
			<ion-icon name="lock-open-outline"></ion-icon>
		</div>
	</div>
</template>

<script lang="ts">
import { DecryptFunctionsKey, RequestAuthorizationKey } from '@renderer/Types/Keys';
import { Ref, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

export default defineComponent({
	name: "UnlockButton",
	props: ['color'],
	emits: ['onAuthSuccessful'],
	setup(_, ctx)
	{
		const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));
		const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));

		function onAuthSuccessful(_: string)
		{
			ctx.emit('onAuthSuccessful');
		}

		function onClick()
		{
			requestAuthorization.value = true;
		}

		onMounted(() => decryptFunctions.value.push(onAuthSuccessful));

		onUnmounted(() => decryptFunctions.value.splice(decryptFunctions.value.indexOf(onAuthSuccessful), 1));

		return {
			onClick
		}
	}
})
</script>

<style>
.unlockButtonContainer {
	cursor: pointer;
}

.unlockButtonContainer__button {
	height: 35px;
	width: 35px;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 25px;

	border-radius: 50%;
	/* background: v-bind(primaryColor); */
	color: white;
	transition: 0.5s;
	border: 2px solid v-bind(color);
}

.unlockButtonContainer__button:hover {
	box-shadow: 0 0 25px v-bind(color);
}
</style>
