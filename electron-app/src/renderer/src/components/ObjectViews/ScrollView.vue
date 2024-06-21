<template>
	<div class="scrollViewContainer">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from 'vue';


export default defineComponent({
	name: 'ScrollView',
	props: ['color'],
	setup()
	{
		const scrollbarColor: Ref<string> = ref('#0f111d');

		return {
			scrollbarColor
		}
	}
});
</script>

<style scoped>
.scrollViewContainer {
	overflow-y: scroll;
	overflow-x: hidden;
	direction: rtl;
}

.scrollViewContainer::-webkit-scrollbar {
	width: clamp(7px, 0.7vw, 10px);
}

.scrollViewContainer::-webkit-scrollbar-track {
	transition: 0.3s;
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.scrollViewContainer::-webkit-scrollbar-thumb {
	max-width: 50%;
	transition: 0.3s;
	background: v-bind(color);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}
</style>
