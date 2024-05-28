<template>
	<div class="unknownResponsePopup">
		<ObjectPopup :preventClose="true" :height="'20%'" :width="'30%'" :minWidth="'300px'" :minHeight="'200px'"
			:closePopup="onOk">
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
						Staus Code: {{ statusCode }}
					</div>
					<div v-if="axiosCode">
						Code: {{ axiosCode }}
					</div>
					<div v-if="logID">
						Log ID: {{ logID }}
					</div>
				</div>
				<div class="unknownResponsePopup__buttons">
					<PopupButton :color="primaryColor" :text="leftButton.text" :width="'6vw'" :minWidth="'75px'"
						:maxWidth="'100px'" :height="'30%'" :minHeight="'30px'" :maxHeight="'35px'" :fontSize="'0.7vw'"
						:minFontSize="'15px'" :maxFontSize="'20px'" @onClick="onLeftButtonClick">
					</PopupButton>
					<PopupButton v-if="rightButton" :color="primaryColor" :text="rightButton?.text" :width="'6vw'"
						:minWidth="'75px'" :maxWidth="'100px'" :height="'30%'" :minHeight="'30px'" :maxHeight="'35px'"
						:fontSize="'0.7vw'" :minFontSize="'15px'" :maxFontSize="'20px'" @onClick="onRightButtonClick">
					</PopupButton>
				</div>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent, onMounted, onUnmounted } from 'vue';

import ObjectPopup from './ObjectPopups/ObjectPopup.vue';
import PopupButton from './InputFields/PopupButton.vue';
import ButtonLink from './InputFields/ButtonLink.vue';

import { stores } from '@renderer/Objects/Stores';
import { popups } from '@renderer/Objects/Stores/PopupStore';
import { ButtonModel } from '@renderer/Types/Models';

export default defineComponent({
	name: "AlertPopup",
	components:
	{
		ObjectPopup,
		PopupButton,
		ButtonLink
	},
	emits: ['onOk'],
	props: ['title', 'message', 'showContactSupport', 'statusCode', 'logID', 'axiosCode', 'leftButton', 'rightButton'],
	setup(props, ctx)
	{
		const okButtonModel: ButtonModel = { text: "Ok", onClick: () => { } };
		const title: ComputedRef<string> = computed(() => props.title ? props.title : "An Error has occured");
		const message: ComputedRef<string> = computed(getMessage);
		const primaryColor: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);
		const popupInfo = popups.alert;

		const leftButton: ComputedRef<ButtonModel> = computed(() => props.leftButton ?? okButtonModel);

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
				return "An error has occured, please try again. If the issue persists, restart the app or"
			}
		}

		function onOk()
		{
			ctx.emit('onOk');
		}

		function onLeftButtonClick()
		{
			leftButton.value.onClick();
			onOk();
		}

		function onRightButtonClick()
		{
			props.rightButton?.onClick();
			onOk();
		}

		onMounted(() =>
		{
			stores.popupStore.addOnEnterHandler(popupInfo.enterOrder!, onLeftButtonClick);
		});

		onUnmounted(() =>
		{
			stores.popupStore.removeOnEnterHandler(popupInfo.enterOrder!);
		});

		return {
			title,
			primaryColor,
			message,
			zIndex: popupInfo.zIndex,
			leftButton,
			onLeftButtonClick,
			onRightButtonClick,
			onOk
		}
	}
})
</script>

<style>
.unknownResponsePopup {
	color: white;
	z-index: v-bind(zIndex);
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
	row-gap: 5%;
}

.unknownResponsePopup__title {
	font-size: clamp(10px, 1vw, 20px);
	top: 5%;
	left: 50%;
	margin-top: 3%;
}

.unknownResponsePopup__body {
	font-size: clamp(10px, 1vw, 20px);
	top: 20%;
	left: 50%;
	width: 80%;
}

.unknownResponsePopup__buttons {
	flex-grow: 1;
	margin-bottom: clamp(10px, 1.5vh, 10px);
	display: flex;
	justify-content: center;
	align-items: flex-end;
	column-gap: max(10px, 2vw);
}
</style>
