<template>
	<div class="createMasterKeyViewContainer">
		<Transition name="fade" mode="out-in">
			<AccountSetupView :color="color" :title="'Create Master Key'" :buttonText="'Submit'" :displayGrid="false"
				:titleMargin="'0%'" :titleMarginTop="'1.5%'" @onSubmit="onSubmit">
				<div class="createMasterKeyViewContainer__content">
					<div class="createMasterKeyViewContainer__inputs">
						<EncryptedInputField ref="encryptedInputField" class="key" :label="'Master Key'"
							:colorModel="colorModel" v-model="key" :required="true" :width="'12vw'" :maxWidth="'300px'"
							:height="'4vh'" :minHeight="'35px'"
							:style="{ 'grid-row': '1 / span 2', 'grid-column': '3' }" />
						<div class="createMasterKeyViewContainer__keyRequirements"
							:style="{ 'grid-row': '3 / span 4', 'grid-column': '3 / span 12' }">
							<CheckboxInputField class="greaterThanTwentyCharacters" :label="'20 Characters'"
								:color="color" v-model="greaterThanTwentyCharacters" :fadeIn="true" :width="'100%'"
								:height="'1.25vh'" :minHeight="'10px'" :disabled="true" />
							<CheckboxInputField class="containsUpperAndLowerCaseLetters" :label="'Upper and Lower Case'"
								:color="color" v-model="containesUpperAndLowerCase" :fadeIn="true" :width="'100%'"
								:height="'1.25vh'" :minHeight="'10px'" :disabled="true" />
							<CheckboxInputField class="containsNumber" :label="'Number'" :color="color"
								v-model="hasNumber" :fadeIn="true" :width="'100%'" :height="'1.25vh'"
								:minHeight="'10px'" :disabled="true" />
							<CheckboxInputField class="containsSpecialCharacter" :label="'Special Character'"
								:color="color" v-model="hasSpecialCharacter" :fadeIn="true" :width="'100%'"
								:height="'1.25vh'" :minHeight="'10px'" :disabled="true" />
						</div>
						<EncryptedInputField ref="confirmEncryptedInputField" :label="'Confirm Key'"
							:colorModel="colorModel" v-model="reEnterKey" :width="'12vw'" :maxWidth="'300px'"
							:height="'4vh'" :minHeight="'35px'"
							:style="{ 'grid-row': '7 / span 2', 'grid-column': '3', 'margin-top': '5px' }" />
						<CheckboxInputField class="createMasterKeyViewContainer__matchesKey" :label="'Matches Key'"
							:color="color" v-model="matchesKey" :fadeIn="true" :width="'100%'" :height="'1.25vh'"
							:minHeight="'10px'" :disabled="true"
							:style="{ 'grid-row': '9', 'grid-column': '3 / span 12' }" />
					</div>
					<div class="createMasterKeyViewContainer__info">
						<ButtonLink :color="color" :text="'Help Creating a Strong and Memorable Key'"
							@onClick="openCreateStrongAndMemorablePasswords" />
					</div>
				</div>
			</AccountSetupView>
		</Transition>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';

import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';
import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { Account } from '@renderer/Types/SharedTypes';

export default defineComponent({
	name: "CreateMasterKeyView",
	components:
	{
		AccountSetupView,
		EncryptedInputField,
		CheckboxInputField,
		ButtonLink,
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
			stores.popupStore.showAlert('Unable to create master key', message, false);
			refreshKey.value = Date.now.toString();
			await new Promise((resolve) => setTimeout(resolve, 300));
			stores.popupStore.hideLoadingIndicator();
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
				MasterKey: key.value,
				...stores.getStates(),
			}

			stores.popupStore.showLoadingIndicator(props.color);
			const response = await window.api.server.session.createAccount(JSON.stringify(data));
			if (response.Success)
			{
				await stores.appStore.setKey(key.value);
				await stores.handleUpdateStoreResponse(key.value, response);

				ctx.emit('onSuccess');
			}
			else
			{
				stores.popupStore.hideLoadingIndicator();
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
					stores.popupStore.showErrorResponseAlert(response);
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

			matchesKey.value = newValue == reEnterKey.value;
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
	width: 100%;
	display: flex;
	flex-grow: 1;
	justify-content: center;
	align-items: center;
	margin-bottom: 15px;
}

.createMasterKeyViewContainer__content {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
	width: 100%;
}

.createMasterKeyViewContainer__inputs {
	margin-top: 5px;
	display: grid;
	grid-template-rows: repeat(10, clamp(20px, 2.2vh, 35px));
	grid-template-columns: repeat(14, clamp(12px, 1.25vw, 30px));
}

.createMasterKeyViewContainer__keyRequirements {
	min-height: 50px;
	grid-area: 3 / 3 / span 4 / span 12;
	display: flex;
	flex-direction: column;
	row-gap: clamp(7.5px, 11%, 10px);
	transform: translateX(10px);
	margin-top: 5px;
}

.createMasterKeyViewContainer__matchesKey {
	transform: translate(15px, 5px);
	margin-top: 5px;
}
</style>
@renderer/Types/SharedTypes
