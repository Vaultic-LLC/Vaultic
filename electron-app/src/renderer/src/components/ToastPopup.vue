<template>
	<div class="toastContainer">
		<div class="toastContainerIcons">
			<ion-icon v-if="isSuccess" class="toastIcon success" name="checkmark-outline"></ion-icon>
			<ion-icon v-else class="toastIcon error" name="close-circle-outline"></ion-icon>
		</div>
		<div class="toastContainterText">
			{{ toastText }}
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

export default defineComponent({
	name: 'ToastPopup',
	props: ['color', 'text', 'success'],
	setup(props)
	{
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const toastText: ComputedRef<string> = computed(() => props.text);
		const isSuccess: ComputedRef<boolean> = computed(() => props.success);

		return {
			toastText,
			isSuccess,
			primaryColor
		}
	}
});
</script>

<style>
.toastContainer {
	position: fixed;
	width: 12.5%;
	height: 5%;
	bottom: 5%;
	left: 40%;
	border: 2px solid v-bind('primaryColor');
	border-radius: 20px;
	background-color: var(--app-color);
	display: flex;
	justify-content: space-evenly;
	align-items: center;
	box-shadow: 0 0 25px v-bind('primaryColor');
	z-index: 20;
}

.toastContainerIcons {
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 40px;
}

.toastContainerIcons .toastIcon.success {
	color: v-bind('primaryColor');
}

.toastContainerIcons .toastIcon.error {
	color: v-bind('primaryColor');
}

.toastContainer .toastContainterText {
	font-size: 18px;
	color: white;
}
</style>
