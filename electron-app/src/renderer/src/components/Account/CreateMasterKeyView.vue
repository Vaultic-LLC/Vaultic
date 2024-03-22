<template>
	<div class="createMasterKeyViewContainer">
		<Transition name="fade" mode="out-in">
			<AccountSetupView :color="color" :title="'Create Master Key'" :buttonText="'Submit'" :displayGrid="false"
				:titleMargin="'0%'" :titleMarginTop="'1.5%'" @onSubmit="onSubmit">
				<div class="createMasterKeyViewContainer__content">
					<Transition name="fade" mode="out-in">
						<AlertBanner :key="refreshKey" :message="alertMessage" />
					</Transition>
					<div class="createMasterKeyViewContainer__info"> See
						<ButtonLink :color="color" :text="'Creating a Strong and Memorable Key'"
							@onClick="openCreateStrongAndMemorablePasswords" />
						for help.
					</div>
					<div class="createMasterKeyViewContainer__inputs">
						<EncryptedInputField ref="encryptedInputField" class="key" :label="'Master Key'"
							:colorModel="colorModel" v-model="key" :required="true" :width="'350px'"
							:style="{ 'grid-row': '1 / span 2', 'grid-column': '2' }" />
						<div class="createMasterKeyViewContainer__keyRequirements"
							:style="{ 'grid-row': '3 / span 4', 'grid-column': '2 / span 12' }">
							<CheckboxInputField class="greaterThanTwentyCharacters" :label="'At Least 20 Characters'"
								:color="color" v-model="greaterThanTwentyCharacters" :fadeIn="true" :width="'100%'"
								:height="'auto'" :disabled="true" />
							<CheckboxInputField class="containsUpperAndLowerCaseLetters"
								:label="'Contains an Upper and Lower Case Letter'" :color="color"
								v-model="containesUpperAndLowerCase" :fadeIn="true" :width="'100%'" :height="'auto'"
								:disabled="true" />
							<CheckboxInputField class="containsNumber" :label="'Contains a Number'" :color="color"
								v-model="hasNumber" :fadeIn="true" :width="'100%'" :height="'auto'" :disabled="true" />
							<CheckboxInputField class="containsSpecialCharacter" :label="'Contains a Special Character'"
								:color="color" v-model="hasSpecialCharacter" :fadeIn="true" :width="'100%'"
								:height="'auto'" :disabled="true" />
						</div>
						<EncryptedInputField ref="confirmEncryptedInputField" :label="'Confirm Key'"
							:colorModel="colorModel" v-model="reEnterKey" :width="'350px'"
							:style="{ 'grid-row': '7 / span 2', 'grid-column': '2' }" />
						<CheckboxInputField class="createMasterKeyViewContainer__matchesKey" :label="'Matches Key'"
							:color="color" v-model="matchesKey" :fadeIn="true" :width="'100%'" :height="'auto'"
							:disabled="true" :style="{ 'grid-row': '9', 'grid-column': '2 / span 12' }" />
					</div>
				</div>
			</AccountSetupView>
		</Transition>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';
import AlertBanner from './AlertBanner.vue';

import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';
import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { Account } from '@renderer/Types/AccountSetup';

export default defineComponent({
	name: "CreateOTPView",
	components:
	{
		AccountSetupView,
		EncryptedInputField,
		CheckboxInputField,
		ButtonLink,
		AlertBanner
	},
	emits: ['onSuccess'],
	props: ['color', 'account'],
	setup(props, ctx)
	{
		const refreshKey: Ref<string> = ref('');

		const key: Ref<string> = ref('');
		const reEnterKey: Ref<string> = ref('');

		const account: ComputedRef<Account> = computed(() => props.account);

		const encryptedInputField: Ref<InputComponent | null> = ref(null);
		const confirmEncryptedInputField: Ref<InputComponent | null> = ref(null);

		const greaterThanTwentyCharacters: Ref<boolean> = ref(false);
		const containesUpperAndLowerCase: Ref<boolean> = ref(false);
		const hasNumber: Ref<boolean> = ref(false);
		const hasSpecialCharacter: Ref<boolean> = ref(false);
		const matchesKey: Ref<boolean> = ref(false);

		const alertMessage: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		async function showAlertMessage(message: string)
		{
			stores.popupStore.hideLoadingIndicator();
			refreshKey.value = Date.now.toString();
			await new Promise((resolve) => setTimeout(resolve, 300));
			alertMessage.value = message;
		}

		async function onSubmit()
		{
			if (!greaterThanTwentyCharacters.value ||
				!containesUpperAndLowerCase.value ||
				!hasNumber.value ||
				!hasSpecialCharacter.value)
			{
				encryptedInputField.value?.invalidate("Please meet all the requirements below");
				return;
			}
			else if (!matchesKey.value)
			{
				confirmEncryptedInputField.value?.invalidate("Keys do not match");
				return;
			}

			const data = {
				FirstName: account.value.firstName,
				LastName: account.value.lastName,
				Email: account.value.email,
				Key: key.value,
				...stores.getStates(),
			}

			stores.popupStore.showLoadingIndicator(props.color);
			const response = await window.api.server.session.createAccount(JSON.stringify(data));
			if (response.success)
			{
				stores.popupStore.hideLoadingIndicator();

				await stores.handleUpdateStoreResponse(key.value, response);
				ctx.emit('onSuccess');
			}
			else
			{
				if (response.DeviceIsTaken)
				{
					showAlertMessage("There is already an account associated with this device. Please sign in using that account");
					return;
				}

				if (response.EmailIsTaken)
				{
					showAlertMessage("Email is already in use. Please use a different one");
				}
				else if (response.UnknownError)
				{
					stores.popupStore.showErrorResponse(response);
				}
			}
		}

		function openCreateStrongAndMemorablePasswords()
		{
			// TODO: Make sure website mentions how much better it is to create a key that is
			// at least 32 digits long, even though we don't require it.
			// Also mention the benefit of replacing letters in words with numbers to prevent
			// dictionary attacks
		}

		watch(() => key.value, (newValue) =>
		{
			greaterThanTwentyCharacters.value = newValue.length >= 20;
			containesUpperAndLowerCase.value = window.api.helpers.validation.containsUppercaseAndLowercaseNumber(newValue);
			hasNumber.value = window.api.helpers.validation.containsNumber(newValue);
			hasSpecialCharacter.value = window.api.helpers.validation.containsSpecialCharacter(newValue);
		});

		watch(() => reEnterKey.value, (newValue) =>
		{
			if (!greaterThanTwentyCharacters.value ||
				!containesUpperAndLowerCase.value ||
				!hasNumber.value ||
				!hasSpecialCharacter.value)
			{
				return;
			}

			matchesKey.value = newValue == key.value;
		});

		onMounted(() =>
		{
			alertMessage.value = "Your Master Key is used to encrypt and decrypt all your data. Ideally it should never be written down. If your key is forgotten, it can never be recovered."
		});

		return {
			refreshKey,
			key,
			reEnterKey,
			encryptedInputField,
			confirmEncryptedInputField,
			greaterThanTwentyCharacters,
			containesUpperAndLowerCase,
			hasNumber,
			hasSpecialCharacter,
			matchesKey,
			colorModel,
			alertMessage,
			onSubmit,
			openCreateStrongAndMemorablePasswords
		}
	}
})
</script>

<style>
.createMasterKeyViewContainer {
	height: 100%;
}

.createMasterKeyViewContainer__info {
	width: 80%;
	color: white;
}

.createMasterKeyViewContainer__content {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	row-gap: 15px;
}

.createMasterKeyViewContainer__inputs {
	display: grid;
	grid-template-rows: repeat(10, 30px);
	grid-template-columns: repeat(14, 30px);
}

.createMasterKeyViewContainer__keyRequirements {
	grid-area: 3 / 3 / span 4 / span 12;
	display: flex;
	flex-direction: column;
	row-gap: 5px;
	transform: translateX(10px);
	margin-top: 5px;
}

.createMasterKeyViewContainer__matchesKey {
	transform: translateX(10px);
}
</style>
