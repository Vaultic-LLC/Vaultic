<template>
	<ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :color="color" :label="'Password For'" v-model="passwordState.passwordFor"
			:style="{ 'position': 'absolute', 'left': '10%' }" :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
		<!-- <div class="vaulticPasswordContainer" v-if="passwordState.isVaultic"
            :style="{ 'grid-row': '2 / span 1', 'grid-column': '2 / span 2', 'margin-top': '10px', 'margin-left': '5px' }">
            <CheckboxInputField :label="'Vaultic Account'" :color="color" v-model="passwordState.isVaultic"
                :fadeIn="true" :style="{ 'grid-row': '4 / span 2', 'grid-column': '2 / span 2', 'z-index': '8' }" />
            <ToolTip :color="color" :size="'clamp(10px, 1vw, 20px)'" :fadeIn="true"
                :message="'This password is the one used to Sign in with your Master Key. Updating it will automatically update your Vaultic Account'" />
        </div> -->
		<TextInputField :color="color" :label="'Domain'" v-model="passwordState.domain" :showToolTip="true"
			:toolTipMessage="'Domain is used to search for Breached Passwords. An example is facebook.com'"
			:toolTipSize="'clamp(15px, 1vw, 28px)'" :style="{ 'position': 'absolute', 'left': '30%' }" :width="'8vw'"
			:height="'4vh'" :minHeight="'30px'" />
		<TextInputField :color="color" :label="'Email'" v-model="passwordState.email"
			:style="{ 'position': 'absolute', 'left': '10%', 'top': 'max(47px, 15%)' }" :width="'8vw'" :height="'4vh'"
			:minHeight="'30px'" :isEmailField="true" />
		<TextInputField :color="color" :label="'Username'" v-model="passwordState.login"
			:style="{ 'position': 'absolute', 'left': '30%', 'top': 'max(47px, 15%)' }" :width="'8vw'" :height="'4vh'"
			:minHeight="'30px'" />
		<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="passwordState.password"
			:initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted" :showRandom="true"
			:showUnlock="true" :required="true" showCopy="true" :width="'11vw'" :maxWidth="'285px'" :height="'4vh'"
			:minHeight="'30px'" :style="{ 'position': 'absolute', 'left': '10%', 'top': 'max(95px, 30%)' }"
			@onDirty="passwordIsDirty = true" />
		<TextAreaInputField :colorModel="colorModel" :label="'Additional Information'"
			v-model="passwordState.additionalInformation" :width="'19vw'" :height="'15vh'" :minWidth="'216px'"
			:minHeight="'91px'" :maxHeight="'203px'"
			:style="{ 'position': 'absolute', 'left': '10%', 'bottom': '10%' }" />
		<TableTemplate ref="tableRef" :color="color" id="passwordView__table"
			:style="{ 'left': '50%', 'bottom': '10%' }" class="scrollbar" :scrollbar-size="1"
			:headerModels="groupHeaderModels" :border="true" :row-gap="0" :emptyMessage="emptyMessage"
			:showEmptyMessage="showEmptyMessage" :headerTabs="headerTabs" :headerHeight="'clamp(45px, 5.8vh, 80px)'"
			@scrolled-to-bottom="scrolledToBottom">
			<template #headerControls>
				<Transition name="fade" mode="out-in">
					<div v-if="activeTab == 0" class="passwordViewTableHeaderControls">
						<UnlockButton v-if="locked" :color="color" @onAuthSuccessful="locked = false" />
						<AddButton :color="color" @click="onAddSecurityQuestion" />
					</div>
					<SearchBar v-else v-model="searchText" :color="color" :width="'8vw'" :maxWidth="'250px'"
						:minWidth="'100px'" :minHeight="'27px'" />
				</Transition>
			</template>
			<template #body>
				<SecurityQuestionRow v-if="activeTab == 0" v-for="(sq, index) in passwordState.securityQuestions"
					:key="sq.id" :rowNumber="index" :colorModel="colorModel" :model="sq" :disabled="false"
					:hideInitialRow="true" :moveButtonsToBottomRatio="1" @onQuesitonDirty="onQuestionDirty(sq.id)"
					@onAnswerDirty="onAnswerDirty(sq.id)" @onDelete="onDeleteSecurityQuestion(sq.id)"
					:isInitiallyEncrypted="sq.question != ''" />
				<SelectableTableRow v-else v-for="(trd, index) in groupModels.visualValues" class="hover" :key="trd.id"
					:rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:style="{ width: '5%', 'height': 'clamp(40px, 3.5vw, 100px)' }" :color="color" />
			</template>
		</TableTemplate>
	</ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, provide, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import SecurityQuestionInputField from '../InputFields/SecurityQuestionInputField.vue';
import ObjectSelectorInputField from '../InputFields/ObjectSelectorInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import SelectableTableRow from '../Table/SelectableTableRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import SecurityQuestionRow from '../Table/Rows/SecurityQuestionRow.vue';
import UnlockButton from "../UnlockButton.vue"
import ToolTip from '../ToolTip.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';

import { HeaderDisplayField, Password, defaultPassword } from '../../Types/EncryptedData';
import { GridDefinition, HeaderTabModel, InputColorModel, SelectableTableRowData, SortableHeaderModel, defaultInputColorModel } from '../../Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { DirtySecurityQuestionQuestionsKey, DirtySecurityQuestionAnswersKey } from '../../Types/Keys';
import { createSortableHeaderModels, getEmptyTableMessage, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Group } from '../../Types/Table';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import { stores } from '@renderer/Objects/Stores';
import { generateUniqueID } from '@renderer/Helpers/generatorHelper';

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
		AddButton,
		SelectableTableRow,
		SecurityQuestionRow,
		UnlockButton,
		ToolTip,
		CheckboxInputField
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const tableRef: Ref<HTMLElement | null> = ref(null);
		const securityQuestionInputField: Ref<null> = ref(null);
		const refreshKey: Ref<string> = ref("");
		const passwordState: Ref<Password> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor);
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

		// @ts-ignore
		const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(stores.groupStore.passwordGroups, "name"));
		// @ts-ignore
		const groupModels: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
		const initalLength: Ref<number> = ref(passwordState.value.passwordLength ?? 0);
		const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

		const passwordIsDirty: Ref<boolean> = ref(false);
		const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
		const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

		const locked: Ref<boolean> = ref(!props.creating);

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

		provide(DirtySecurityQuestionQuestionsKey, dirtySecurityQuestionQuestions);
		provide(DirtySecurityQuestionAnswersKey, dirtySecurityQuestionAnswers);

		const gridDefinition: GridDefinition = {
			rows: 1,
			rowHeight: '100%',
			columns: 1,
			columnWidth: '100%'
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
				width: 'clamp(25px, 4vw, 100px)',
				clickable: true
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: 'clamp(80px, 6vw, 150px)',
				clickable: true
			},
			{
				displayName: "Color",
				backingProperty: "color",
				width: 'clamp(50px, 4vw, 100px)',
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
				// don't need headers for security questions
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
							width: 'clamp(80px, 6vw, 150px)'
						},
						{
							component: "TableRowColorValue",
							color: g.color,
							copiable: true,
							width: 'clamp(50px, 4vw, 100px)',
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

			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function onSave()
		{
			stores.popupStore.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);
			return new Promise((resolve, reject) =>
			{
				saveSucceeded = resolve;
				saveFailed = reject;
			});
		}

		async function onAuthenticationSuccessful(key: string)
		{
			stores.popupStore.showLoadingIndicator(color.value, "Saving Password");
			if (props.creating)
			{
				if (await stores.passwordStore.addPassword(key, passwordState.value))
				{
					passwordState.value = defaultPassword();
					refreshKey.value = Date.now().toString();

					handleSaveResponse(true);
					return;
				}

				handleSaveResponse(false);
			}
			else
			{
				if (await stores.passwordStore.updatePassword(
					passwordState.value, passwordIsDirty.value, dirtySecurityQuestionQuestions.value,
					dirtySecurityQuestionAnswers.value, key))
				{
					handleSaveResponse(true);
					return;
				}

				handleSaveResponse(false);
			}
		}

		function handleSaveResponse(succeeded: boolean)
		{
			stores.popupStore.hideLoadingIndicator();
			if (succeeded)
			{
				if (saveSucceeded)
				{
					saveSucceeded(true);
				}
			}
			else
			{
				if (saveFailed)
				{
					saveFailed(true);
				}
			}
		}

		function onAuthenticationCanceled()
		{
			saveFailed(false);
		}

		async function onAddSecurityQuestion()
		{
			passwordState.value.securityQuestions.push({
				id: await generateUniqueID(passwordState.value.securityQuestions),
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
			initalLength,
			isInitiallyEncrypted,
			passwordIsDirty,
			gridDefinition,
			searchText,
			activeTab,
			headerTabs,
			emptyMessage,
			showEmptyMessage,
			locked,
			colorModel,
			tableRef,
			onAuthenticationSuccessful,
			onAuthenticationCanceled,
			onSave,
			onAddSecurityQuestion,
			onQuestionDirty,
			onAnswerDirty,
			onDeleteSecurityQuestion,
			scrolledToBottom,
		};
	},
})
</script>

<style>
#passwordView__table {
	transform: translateY(12px);
	height: 29vh;
	width: 27vw;
	min-height: 174px;
	min-width: 308px;
}

.passwordViewTableHeaderControls {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	column-gap: clamp(10px, 1vw, 25px);
}

.domainContainer {
	display: flex;
	flex-direction: row;
}

.vaulticPasswordContainer {
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
	column-gap: 10px;
}
</style>
