<template>
	<div class="unknownResponsePopup">
		<ObjectPopup :height="'40%'" :width="'30%'">
			<div class="unknownResponsePopup__title">
				<h2>An Error has occured</h2>
			</div>
			<div class="unknownResponsePopup__body">
				<div>
					{{ message }} If the issue persists
					<button>Contact Support</button>
				</div>
				<div v-if="statusCode">
					Staus Code: {{ statusCode ?? -1 }}
				</div>
				<div v-if="logID">
					Log ID: {{ logID }}
				</div>
			</div>
			<div class="unknownResponsePopup__buttons">
				<PopupButton :color="primaryColor" :text="'Ok'" :width="'150px'" :height="'40px'"
                    :fontSize="'18px'" @onClick="onSubmit">
				</PopupButton>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import ObjectPopup from './ObjectPopups/ObjectPopup.vue';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AccountSetupPopup",
	components:
	{
		ObjectPopup
	},
    emits: ['onOk'],
	props: ['statusCode', 'logID'],
	setup(props, ctx)
	{
		const message: ComputedRef<string> = computed(() => props.statusCode ? "Please check your connection and try again." : "An error has occured. Please try again.")
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

        function onSubmit()
        {
            ctx.emit('onOk');
        }

		return {
			primaryColor,
			message,
            onSubmit
		}
	}
})
</script>

<style>
.unknownResponsePopup {
	color: white;
}

.unknownResponsePopup__title {
	position: absolute;
	top: 5%;
	left: 50%;
	transform: translate(-50%);
}

.unknownResponsePopup__body {
	position: absolute;
	top: 20%;
	left: 50%;
	transform: translateX(-50%);
	width: 80%;
}

</style>
