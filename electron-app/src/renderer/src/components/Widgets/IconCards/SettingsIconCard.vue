<template>
	<div>
		<IconCard :icon="'settings-outline'" :text="'Settings'" @click="showEditSettingsPopup = true" />
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditSettingsPopup" :closePopup="closeSettings">
					<EditSettingsPopup :model="settingsState" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import EditSettingsPopup from "../../ObjectPopups/EditPopups/EditSettingsPopup.vue"
import { stores } from '@renderer/Objects/Stores';
import { SettingsState } from '@renderer/Objects/Stores/SettingsStore';

export default defineComponent({
	name: "SettingsIconCard",
	components:
	{
		IconCard,
		ObjectPopup,
		EditSettingsPopup
	},
	setup()
	{
		const showEditSettingsPopup: Ref<boolean> = ref(false);
		const settingsState: ComputedRef<SettingsState> = computed(() => stores.settingsStore.state);

		function closeSettings()
		{
			showEditSettingsPopup.value = false;
		}

		return {
			settingsState,
			showEditSettingsPopup,
			closeSettings
		}
	}
})
</script>
<style></style>
