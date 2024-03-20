<template>
	<div class="createMasterKeyViewContainer">
		<Transition name="fade" mode="out-in">
			<AccountSetupView :color="color" :title="'Crete Master Key'" :buttonText="'Submit'"
				:displayGrid="false" :titleMargin="'0.5%'" @onSubmit="onSubmit">
				<div class="createMasterKeyViewContainer__content">
					<div class="createMasterKeyViewContainer__info">Your Master Key is used to encrypt and decrypt all your data. Ideally it should never be written down. See
						<ButtonLink :color="color" :text="'Creating Strong and Memorable Passwords'" @onClick="openCreateStrongAndMemorablePasswords" />
						for help. <b>If your key is forgotten, it can never be recovered!</b>
					</div>
					<div class="createMasterKeyViewContainer__inputs">
						<EncryptedInputField ref="encryptedInputField" class="key" :label="'Master Key'" :colorModel="colorModel"
							v-model="key" :required="true" :width="'300px'" :style="{'grid-row': '1 / span 2', 'grid-column': '3'}" />
						<div class="createMasterKeyViewContainer__keyRequirements" :style="{'grid-row': '3 / span 4', 'grid-column': '3 / span 12'}">
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
								:color="color" v-model="hasSpecialCharacter" :fadeIn="true" :width="'100%'" :height="'auto'"
								:disabled="true" />
						</div>
						<EncryptedInputField ref="confirmEncryptedInputField" :label="'Confirm Key'"
							:colorModel="colorModel" v-model="reEnterKey" :width="'300px'" :style="{'grid-row': '7 / span 2', 'grid-column': '3'}" />
						<CheckboxInputField class="createMasterKeyViewContainer__matchesKey" :label="'Matches Key'" :color="color"
							v-model="matchesKey" :fadeIn="true" :width="'100%'" :height="'auto'" :disabled="true" :style="{'grid-row': '9', 'grid-column': '3 / span 12'}" />
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
import { Account } from '@renderer/Types/AccountSetup';

export default defineComponent({
	name: "CreateOTPView",
	components:
	{
		AccountSetupView,
		EncryptedInputField,
		CheckboxInputField,
		ButtonLink
	},
	emits: ['onDone'],
	props: ['color', 'account'],
	setup(props, ctx)
	{
		const key: Ref<string> = ref('');
		const reEnterKey: Ref<string> = ref('');

		const account: ComputedRef<Account> = computed(() => props.account);

		const encryptedInputField: Ref<InputComponent | null> = ref(null);
		const confirmEncryptedInputField:Ref<InputComponent | null> = ref(null);

		const greaterThanTwentyCharacters: Ref<boolean> = ref(false);
		const containesUpperAndLowerCase: Ref<boolean> = ref(false);
		const hasNumber: Ref<boolean> = ref(false);
		const hasSpecialCharacter: Ref<boolean> = ref(false);
		const matchesKey: Ref<boolean> = ref(false);

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

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
				Key: key.value,
				Password: account.value.password,
				...stores.getStates(),
			}

			const response = await window.api.server.user.finishUserSetup(JSON.stringify(data));
			if (response.success)
			{
				await stores.handleUpdateStoreResponse(key.value, response);
				ctx.emit('onDone');
			}
			else
			{
				stores.popupStore.showErrorResponse(response);
			}
		}

		function openCreateStrongAndMemorablePasswords()
		{

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

		return {
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
	row-gap: 20px;
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
}

.createMasterKeyViewContainer__matchesKey {
	transform: translateX(10px);
}
</style>

