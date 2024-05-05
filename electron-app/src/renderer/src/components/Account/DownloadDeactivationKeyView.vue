<template>
	<div class="downloadDeactivationKeyView">
		<AccountSetupView :color="color" :title="'Download Deactivation Key'" :buttonText="'Download'"
			:displayGrid="false" :titleMargin="'clamp(15px, 1.2vw, 25px)'" :titleMarginTop="'clamp(15px, 1.2vw, 30px)'"
			@onSubmit="onDownload">
			<div class="downloadDeactivationKeyView__content">
				<div>
					Your deactivation key is used to deactivate your subscription in the event you forget your master
					key and are unable to access your account. Note, it will only stop furture payments from
					occuring. It will not delete your account or any of your data. If you remember your master key after
					deactivating, you can renew your subscription by signing in to the app.
				</div>
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "DownloadDeactivationKeyView",
	components:
	{
		AccountSetupView,
	},
	emits: ['onDownloaded'],
	props: ['color'],
	setup(props, ctx)
	{
		async function onDownload()
		{
			stores.popupStore.showLoadingIndicator(props.color, "Downloading");

			const result = await window.api.helpers.vaultic.downloadDeactivationKey();
			if (!result.Success)
			{
				stores.popupStore.hideLoadingIndicator();
				defaultHandleFailedResponse(result);

				return;
			}

			ctx.emit('onDownloaded');
		}

		return {
			onDownload
		}
	}
})
</script>

<style>
.downloadDeactivationKeyView {
	height: 100%;
}

.downloadDeactivationKeyView__filePicker {
	display: none;
	position: absolute;
}

.downloadDeactivationKeyView__content {
	color: white;
}
</style>
