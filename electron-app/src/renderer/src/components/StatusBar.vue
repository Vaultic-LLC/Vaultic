<template>
	<div class="statusBarContainer">
		<div class="statusBarContainer__onlineStatusContainer">
			<div class="statusBarContainer__onlineStatusIcon" :class="{ online: online}">
			</div>
			<Transition name="fade" mode="out-in">
				<div class="statusBarContainer__onlineStatusText" :key="refreshKey">
					{{ text }}
				</div>
			</Transition>
		</div>
	</div>
</template>

<script lang="ts">
import { stores } from '@renderer/Objects/Stores';
import { Ref, defineComponent, ref, watch } from 'vue';

export default defineComponent({
	name: "StatusBar",
	setup()
	{
		const refreshKey: Ref<string> = ref('');
		const online: Ref<boolean> = ref(stores.appStore.isOnline);
		const text: Ref<string>  = ref(online.value ? "Online" : "Offline");

		watch(() => stores.appStore.isOnline, (newValue) =>
		{
			online.value = newValue;
			text.value = newValue ? "Online" : "Offline";
			refreshKey.value = Date.now().toString();
		});

		return {
			refreshKey,
			online,
			text
		}
	}
})
</script>

<style>
.statusBarContainer {
	position: fixed;
	width: 3%;
	height: 1%;
	top: 1.5%;
	right: 2%;
	background-color: transparent;
	z-index: 151;
	display: flex;
	justify-content: center;
	align-items: center;
}

.statusBarContainer__onlineStatusContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;
	height: 100%;
}

.statusBarContainer__onlineStatusIcon {
	height: 90%;
	aspect-ratio: 1 / 1;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	background-color: red;
	transition: 0.3s;
}

.statusBarContainer__onlineStatusIcon.online {
	background-color: #52e052;
}

.statusBarContainer__onlineStatusText {
	color: white;
}
</style>
