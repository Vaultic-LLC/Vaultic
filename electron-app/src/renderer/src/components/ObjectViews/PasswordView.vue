<template>
	<ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :color="color" :label="'Password For'" v-model="passwordState.passwordFor"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 /span 2' }" />
		<TextInputField :color="color" :label="'Login'" v-model="passwordState.login"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
		<EncryptedInputField :color="color" :label="'Password'" v-model="passwordState.password"
			:initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted" :showRandom="true" :showUnlock="true"
			showCopy="true" :style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }"
			@onDirty="passwordIsDirty = true" />
		<TextAreaInputField :color="color" :label="'Additional Information'" v-model="passwordState.additionalInformation"
			:style="{ 'grid-row': '8 / span 4', 'grid-column': '2 / span 4' }" />
		<!-- <SearchBar v-if="activeTab == 1" v-model="searchText" :color="color"
			:style="{ 'grid-row': '4 / span 2', 'grid-column': '9 / span 3' }" /> -->
		<!-- <TabbedInputContainer :tabOneText="'Security Questions'" :tabTwoText="'Groups'" :color="color"
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
		</TabbedInputContainer> -->
		<TableTemplate :color="color"
			:style="{ 'position': 'relative', 'grid-row': '4 / span 8', 'grid-column': '9 / span 7' }" class="scrollbar"
			:scrollbar-size="1" :headerModels="groupHeaderModels" :border="true" :row-gap="0" :emptyMessage="emptyMessage"
			:showEmptyMessage="showEmptyMessage" @scrolled-to-bottom="scrolledToBottom">
			<template #header>
				<TableHeaderRow :color="color" :model="groupHeaderModels" :tabs="headerTabs" :border="true">
					<template #controls>
						<Transition name="fade" mode="out-in">
							<AddButton v-if="activeTab == 0" :color="color" @click="onAddSecurityQuestion" />
							<SearchBar v-else v-model="searchText" :color="color" />
							<!-- <div :style="{ 'margin-top': '20px' }">
							</div> -->
						</Transition>
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<SecurityQuestionRow v-if="activeTab == 0" v-for="(sq, index) in passwordState.securityQuestions"
					:key="sq.id" :rowNumber="index" :color="color" :model="sq" :disabled="false"
					@onQuesitonDirty="onQuestionDirty(sq.id)" @onAnswerDirty="onAnswerDirty(sq.id)"
					@onDelete="onDeleteSecurityQuestion(sq.id)" :isInitiallyEncrypted="sq.question != ''" />
				<SelectableTableRow v-else v-for="(trd, index) in groupModels.visualValues" class="hover" :key="trd.id"
					:rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:style="{ width: '5%', 'height': '75px' }" :color="color" />
			</template>
		</TableTemplate>
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
import SelectableTableRow from '../Table/SelectableTableRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import SecurityQuestionRow from '../Table/Rows/SecurityQuestionRow.vue';

import { HeaderDisplayField, Password, defaultPassword } from '../../Types/EncryptedData';
import { GridDefinition, HeaderTabModel, SelectableTableRowData, SortableHeaderModel } from '../../Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { PasswordStore } from '../../Objects/Stores/PasswordStore';
import { stores } from '../../Objects/Stores';
import { DirtySecurityQuestionQuestionsKey, DirtySecurityQuestionAnswersKey, RequestAuthenticationFunctionKey } from '../../Types/Keys';
import { createSortableHeaderModels, getEmptyTableMessage, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Group } from '../../Types/Table';
import idGenerator from '@renderer/Utilities/IdGenerator';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';

export default defineComponent({
	name: "PasswordView",
	components: {
		ObjectView,
		TextInputField,
		SecurityQuestionInputField,
		ObjectSelectorInputField,
		EncryptedInputField,
		TextAreaInputField,
		SearchBar,
		TableTemplate,
		TableHeaderRow,
		AddButton,
		SelectableTableRow,
		SecurityQuestionRow
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const securityQuestionInputField: Ref<null> = ref(null);
		const refreshKey: Ref<string> = ref("");
		const groupPickerRefreshKey: Ref<string> = ref("");
		const passwordState: Ref<Password> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.passwordsColor.primaryColor);

		// @ts-ignore
		const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(stores.groupStore.passwordGroups, "name"));
		// @ts-ignore
		const groupModels: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
		const initalLength: Ref<number> = ref((passwordState.value as PasswordStore).passwordLength ?? 0);
		const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

		const passwordIsDirty: Ref<boolean> = ref(false);
		const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
		const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);

		provide(DirtySecurityQuestionQuestionsKey, dirtySecurityQuestionQuestions);
		provide(DirtySecurityQuestionAnswersKey, dirtySecurityQuestionAnswers);

		const gridDefinition: GridDefinition = {
			rows: 13,
			rowHeight: '50px',
			columns: 16,
			columnWidth: '100px'
		}

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const showEmptyMessage: ComputedRef<boolean> = computed(() =>
			(activeTab.value == 0 && passwordState.value.securityQuestions.length == 0) ||
			(activeTab.value == 1 && groupModels.value.visualValues.length == 0));

		const emptyMessage: ComputedRef<string> = computed(() =>
		{
			if (activeTab.value == 0)
			{
				return getEmptyTableMessage("Security Questions");
			}

			return getObjectPopupEmptyTableMessage("Groups", "Password", "Group");
		});

		const activeGroupHeader: Ref<number> = ref(1);
		const groupHeaderDisplayFields: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: " ",
				width: '100px',
				clickable: true
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: '150px',
				clickable: true
			},
			{
				displayName: "Color",
				backingProperty: "color",
				width: "100px",
				clickable: true
			}
		];

		const activeTab: Ref<number> = ref(0);
		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Security Questions',
				active: computed(() => activeTab.value == 0),
				color: color,
				onClick: () =>
				{
					activeTab.value = 0;
				}
			},
			{
				id: uuidv4(),
				name: 'Groups',
				active: computed(() => activeTab.value == 1),
				color: color,
				onClick: () =>
				{
					activeTab.value = 1;
				}
			},
		];

		// @ts-ignore
		const groupHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
		{
			if (activeTab.value == 0)
			{
				return [];
			}

			return createSortableHeaderModels<Group>(
				activeGroupHeader, groupHeaderDisplayFields, groups.value, undefined, setGroupModels);
		});

		function setGroupModels()
		{
			groupModels.value.setValues(groups.value.calculatedValues.map(g =>
			{
				const values: any[] =
					[
						{
							component: "TableRowTextValue",
							value: g.name,
							copiable: false,
							width: '150px'
						},
						{
							component: "TableRowColorValue",
							color: g.color,
							copiable: true,
							width: '100px',
							margin: false
						}
					];

				const model: SelectableTableRowData = {
					id: uuidv4(),
					key: g.id,
					values: values,
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
			}));

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

		function onAddSecurityQuestion()
		{
			passwordState.value.securityQuestions.push({
				id: idGenerator.uniqueId(passwordState.value.securityQuestions),
				question: '',
				questionLength: 0,
				answer: '',
				answerLength: 0
			});
		}

		function onQuestionDirty(id: string)
		{
			if (!dirtySecurityQuestionQuestions.value.includes(id))
			{
				dirtySecurityQuestionQuestions.value.push(id);
			}
		}

		function onAnswerDirty(id: string)
		{
			if (!dirtySecurityQuestionAnswers.value.includes(id))
			{
				dirtySecurityQuestionAnswers.value.push(id);
			}
		}

		function onDeleteSecurityQuestion(id: string)
		{
			passwordState.value.securityQuestions = passwordState.value.securityQuestions.filter(sq => sq.id != id);

			if (dirtySecurityQuestionQuestions.value.includes(id))
			{
				dirtySecurityQuestionQuestions.value.splice(dirtySecurityQuestionQuestions.value.indexOf(id), 1);
			}

			if (dirtySecurityQuestionAnswers.value.includes(id))
			{
				dirtySecurityQuestionAnswers.value.splice(dirtySecurityQuestionAnswers.value.indexOf(id), 1);
			}
		}

		function scrolledToBottom()
		{
			if (activeTab.value == 0)
			{
				return;
			}

			groupModels.value.loadNextChunk();
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
			refreshKey,
			groupPickerRefreshKey,
			initalLength,
			isInitiallyEncrypted,
			passwordIsDirty,
			gridDefinition,
			searchText,
			activeTab,
			headerTabs,
			emptyMessage,
			showEmptyMessage,
			onAuthenticationSuccessful,
			onAuthenticationCanceled,
			onSave,
			onAddSecurityQuestion,
			onQuestionDirty,
			onAnswerDirty,
			onDeleteSecurityQuestion,
			scrolledToBottom
		};
	},
})
</script>

<style></style>
