<template>
	<div class="unknownResponsePopup">
		<ObjectPopup :preventClose="true" :height="'20%'" :width="'30%'" :beforeHeight="'300%'" :closePopup="onOk">
			<div class="unknownResponsePopup__content">
				<div class="unknownResponsePopup__title">
					<h2>{{ title }}</h2>
				</div>
				<div class="unknownResponsePopup__body">
					<div>
						{{ message }}
						<ButtonLink v-if="showContactSupport" :color="primaryColor" :text="'Contact Support'" />
					</div>
					<div v-if="statusCode">
						Staus Code: {{ statusCode ?? -1 }}
					</div>
					<div v-if="logID">
						Log ID: {{ logID }}
					</div>
				</div>
				<div class="unknownResponsePopup__buttons">
					<PopupButton :color="primaryColor" :text="'Ok'" :width="'150px'" :height="'40px'" :fontSize="'18px'"
						@onClick="onOk">
					</PopupButton>
				</div>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import ObjectPopup from './ObjectPopups/ObjectPopup.vue';
import PopupButton from './InputFields/PopupButton.vue';
import ButtonLink from './InputFields/ButtonLink.vue';

import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AlertPopup",
	components:
	{
		ObjectPopup,
		PopupButton,
		ButtonLink
	},
	emits: ['onOk'],
	props: ['title', 'message', 'showContactSupport', 'statusCode', 'logID', 'axiosCode'],
	setup(props, ctx)
	{
		const title: ComputedRef<string> = computed(() => props.title ? props.title : "An Error has occured");
		const message: ComputedRef<string> = computed(getMessage);
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		function getMessage()
		{
			if (props.message)
			{
				return props.message;
			}
			else if (props.statusCode || (props.axiosCode && (props.axiosCode == "ERR_NETWORK" || props.axiosCode == "ECONNABORTED")))
			{
				return "Please check your connection and try again. If the issue persists";
			}
			else
			{
				return "An error has occured, please try again. If the issue persits, restart the app or"
			}
		}

		function onOk()
		{
			ctx.emit('onOk');
		}

		return {
			title,
			primaryColor,
			message,
			onOk
		}
	}
})
</script>

<style>
.unknownResponsePopup {
	color: white;
	z-index: 160;
	width: 100%;
	height: 100%;
	top: 0%;
	position: fixed;
}

.unknownResponsePopup__content {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.unknownResponsePopup__title {
	/* position: absolute; */
	top: 5%;
	left: 50%;
	margin-top: 3%;
	/* transform: translate(-50%); */
}

.unknownResponsePopup__body {
	/* position: absolute; */
	top: 20%;
	left: 50%;
	/* transform: translateX(-50%); */
	width: 80%;
}

.unknownResponsePopup__buttons {
	flex-grow: 1;
	margin-bottom: 5%;
	display: flex;
	justify-content: center;
	align-items: flex-end;
}
</style>
