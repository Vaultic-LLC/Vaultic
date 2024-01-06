<template>
	<ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :color="color" :label="'Password For'" v-model="passwordState.passwordFor"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '1 /span 2' }" />
		<TextInputField :color="color" :label="'Login'" v-model="passwordState.login"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '1 ; span 2' }" />
		<EncryptedInputField :color="color" :label="'Password'" v-model="passwordState.password"
			:initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted" :showRandom="true" :showUnlock="true"
			showCopy="true" :style="{ 'grid-row': '5 / span 2', 'grid-column': '1 / span 2' }"
			@onDirty="passwordIsDirty = true" />
		<TextAreaInputField :color="color" :label="'Additional Information'" v-model="passwordState.additionalInformation"
			:style="{ 'grid-row': '8 / span 4', 'grid-column': '1 / span 4' }" />
		<SearchBar v-if="activeTab == 1" v-model="searchText" :color="color"
			:style="{ 'grid-row': '4 / span 2', 'grid-column': '9 / span 3' }" />
		<TabbedInputContainer :tabOneText="'Security Questions'" :tabTwoText="'Groups'" :color="color"
			:style="{ 'grid-row': '6 / span 4', 'grid-column': '6 / span 6' }" @onTabSelected="onTabSelected">
			<template #tabOne>
				<SecurityQuestionInputField ref="securityQuestionInputField" :border="true" :hideTitle="true"
					:scrollbar="true" :color="color" :model="passwordState.securityQuestions" :isInitiallyEncrypted="true"
					:rowGap="20" :minHeight="310" :maxHeight="180" :showUnlock="!creating" />
			</template>
			<template #tabTwo>
				<ObjectSelectorInputField :key="groupPickerRefreshKey" :border="true" :scrollbar="true" :color="color"
					:hideTitle="true" :headerModels="groupHeaderModels" :models="groupModels" :minHeight="310"
					:maxHeight="300" />
			</template>
		</TabbedInputContainer>
	</ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, provide, inject, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import SecurityQuestionInputField from '../InputFields/SecurityQuestionInputField.vue';
import ObjectSelectorInputField from '../InputFields/ObjectSelectorInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';

import { HeaderDisplayField, Password, SecurityQuestion, defaultPassword } from '../../Types/EncryptedData';
import { GridDefinition, SelectableTableRowData, SortableHeaderModel } from '../../Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { PasswordStore } from '../../Objects/Stores/PasswordStore';
import { stores } from '../../Objects/Stores';
import { DirtySecurityQuestionQuestionsKey, DirtySecurityQuestionAnswersKey, RequestAuthenticationFunctionKey } from '../../Types/Keys';
import TabbedInputContainer from '../InputFields/TabbedInputContainer.vue';
import { createSortableHeaderModels } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Group } from '../../Types/Table';

export default defineComponent({
	name: "PasswordView",
	components: {
		ObjectView,
		TextInputField,
		SecurityQuestionInputField,
		ObjectSelectorInputField,
		EncryptedInputField,
		TextAreaInputField,
		TabbedInputContainer,
		SearchBar
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const securityQuestionInputField: Ref<null> = ref(null);
		const refreshKey: Ref<string> = ref("");
		const groupPickerRefreshKey: Ref<string> = ref("");
		const passwordState: Ref<Password> = ref(props.model);
		const securityQuestions: ComputedRef<SecurityQuestion[]> = computed(() => passwordState.value.securityQuestions);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.passwordsColor.primaryColor);

		// @ts-ignore
		const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(stores.groupStore.passwordGroups, "name"));
		const groupModels: Ref<SelectableTableRowData[]> = ref([]);
		const initalLength: Ref<number> = ref((passwordState.value as PasswordStore).passwordLength ?? 0);
		const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

		const passwordIsDirty: Ref<boolean> = ref(false);
		const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
		const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));
		const activeTab: Ref<number> = ref(0);

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);

		provide(DirtySecurityQuestionQuestionsKey, dirtySecurityQuestionQuestions);
		provide(DirtySecurityQuestionAnswersKey, dirtySecurityQuestionAnswers);

		const gridDefinition: GridDefinition = {
			rows: 11,
			rowHeight: '50px',
			columns: 11,
			columnWidth: '100px'
		}

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const activeGroupHeader: Ref<number> = ref(1);
		const groupHeaderDisplayFields: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: "",
				width: '50px'
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: '150px'
			},
		];

		// @ts-ignore
		const groupHeaderModels: Ref<SortableHeaderModel[]> = ref(createSortableHeaderModels<Group>(true,
			activeGroupHeader, groupHeaderDisplayFields, groups.value, undefined, setGroupModels));

		function setGroupModels()
		{
			groupModels.value = groups.value.calculatedValues.map(g =>
			{
				const model: SelectableTableRowData = {
					id: uuidv4(),
					key: g.id,
					values: [{
						value: g.name,
						copiable: false,
						width: '150px'
					}],
					isActive: ref(passwordState.value.groups.includes(g.id)),
					selectable: true,
					onClick: function ()
					{
						if (passwordState.value.groups.includes(g.id))
						{
							passwordState.value.groups = passwordState.value.groups.filter(id => id != g.id);
						}
						else
						{
							passwordState.value.groups.push(g.id);
						}
					}
				}
				return model;
			});

			groupPickerRefreshKey.value = Date.now().toString();
		}

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(onAuthenticationSuccessful, onAuthenticationCanceled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject();
		}

		function onAuthenticationSuccessful(key: string)
		{
			if (props.creating)
			{
				passwordState.value.lastModifiedTime = Date.now();
				stores.encryptedDataStore.addPassword(key, passwordState.value);

				passwordState.value = defaultPassword();
				refreshKey.value = Date.now().toString();
			}
			else
			{
				//@ts-ignore
				passwordState.value.securityQuestions = securityQuestionInputField.value.securityQuestions;
				stores.encryptedDataStore.updatePassword(
					passwordState.value, passwordIsDirty.value, dirtySecurityQuestionQuestions.value,
					dirtySecurityQuestionAnswers.value, key);
			}

			saveSucceeded(true);
		}

		function onAuthenticationCanceled()
		{
			saveFailed(false);
		}

		function onTabSelected(tab: number)
		{
			activeTab.value = tab;
		}

		onMounted(() =>
		{
			setGroupModels();
		});

		watch(() => searchText.value.value, (newValue) =>
		{
			groups.value.search(newValue);
			setGroupModels();
		});

		return {
			securityQuestionInputField,
			color,
			groupHeaderModels,
			groupModels,
			passwordState,
			securityQuestions,
			refreshKey,
			groupPickerRefreshKey,
			initalLength,
			isInitiallyEncrypted,
			passwordIsDirty,
			gridDefinition,
			searchText,
			activeTab,
			onAuthenticationSuccessful,
			onAuthenticationCanceled,
			onSave,
			onTabSelected
		};
	},
})
</script>

<style></style>
