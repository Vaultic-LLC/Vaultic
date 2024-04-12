<template>
	<div class="aboutPopupHeader">
		<TableSelector class="aboutPopupHeader__controls"
			:singleSelectorItems="[featuresTableControl, infoTableControl]" />
	</div>
	<div class="aboutPopupContainer">
		<Transition name="fade" mode="out-in">
			<div v-if="activeSection == 0" class="aboutPopupContainer__sections">
				<div class="aboutPopupContainer__section" :style="{ height: '50%', 'margin-top': '2%' }">
					<h3 class="aboutPopupContainer__section__header">Storing Multi Factor Authentication Keys</h3>
					<div class="aboutPopupContainer__section__text">
						It seems like almost everyone is using Multi Factor Authentication these days. Luckily, you can
						easily store your MFA Key in case you ever need to re set it up. Simply creat a Value with Type
						set to MFA Key and you'll be able to see the original QR Code in the Value Row.
					</div>
					<div>
						<img class="aboutPopupContainer__image" src="../../assets/Files/pickMFAKey.png"
							:style="{ position: 'absolute', left: '0', width: '20vw', height: '11vw' }" />
						<img class="aboutPopupContainer__image" src="../../assets/Files/selectRow.png"
							:style="{ position: 'absolute', left: '25%', width: '25vw', height: '11vw' }" />
						<img class="aboutPopupContainer__image" src="../../assets/Files/qrCode.png"
							:style="{ position: 'absolute', left: '63%', width: '20vw', height: '11vw' }" />
					</div>
				</div>
				<div class="aboutPopupContainer__section" :style="{ height: '50%' }">
					<h3 class="aboutPopupContainer__section__header">Metrics</h3>
					<div class="aboutPopupContainer__section__text">
						The Metric Gauges track important information about your data. But that's not all! Upon
						clicking them, the data
						that needs updating will be pinned to the top of the relevant table, allowing you to easily
						identify
						and fix it
					</div>
					<img class="aboutPopupContainer__image" src="../../assets/Files/metrics.png"
						:style="{ position: 'absolute', left: '5%', width: '25vw', height: '13vw' }" />
					<img class="aboutPopupContainer__image" src="../../assets/Files/hoverAtRiskIcon.png"
						:style="{ position: 'absolute', left: '47%', width: '25vw', height: '13vw' }" />
				</div>
				<div class="aboutPopupContainer__section" :style="{ height: '50%' }">
					<h3 class="aboutPopupContainer__section__header">Searching</h3>
					<div class="aboutPopupContainer__section__text">
						Searching allows you to quickly find a record by one of its values. The one thing to remember
						about
						searching, though,
						is that ony the current sorted header column will be searched. If you want to search for a value
						in
						a different column,
						you'll have to sort on it first.
					</div>
					<div>
						<img class="aboutPopupContainer__image" src="../../assets/Files/clickingOnHeader.png"
							:style="{ position: 'absolute', left: '0', width: '20vw', height: '11vw' }" />
						<img class="aboutPopupContainer__image" src="../../assets/Files/searching.png"
							:style="{ position: 'absolute', left: '33%', width: '20vw', height: '11vw' }" />
						<img class="aboutPopupContainer__image" src="../../assets/Files/searchedValue.png"
							:style="{ position: 'absolute', left: '63%', width: '20vw', height: '11vw' }" />
					</div>
				</div>
				<div class="aboutPopupContainer__section">
					<h3 class="aboutPopupContainer__section__header">Graph Target</h3>
					<div class="aboutPopupContainer__section__text">
						Knowing how secure all your Passwords / Values should be is important. By default, the target
						line on
						the Password / Value Graph is turned off but, you can toggle
						it on by clicking on the Target Legend Icon.
					</div>
					<div>
						<img class="aboutPopupContainer__image" src="../../assets/Files/graphHideTarget.png"
							:style="{ position: 'absolute', left: '5%', width: '25vw', height: '13vw' }" />
						<img class="aboutPopupContainer__image" src="../../assets/Files/graphShowTarget.png"
							:style="{ position: 'absolute', left: '47%', width: '25vw', height: '13vw' }" />
					</div>
				</div>
			</div>
			<div v-else class="aboutPopupContainer__sections">
				<div class="aboutPopupContainer__section">
					<h3>Terms and Conditions</h3>
					// link to terms and conditions on website
				</div>
				<div class="aboutPopupContainer__section">
					<h3>Privacy Policy</h3>
					// link to Privacy Policy on website
				</div>
				<div>
					Copywrite
				</div>
			</div>
		</Transition>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableSelector from '../TableSelector.vue';

import { SingleSelectorItemModel } from '@renderer/Types/Models';
import { defaultInputTextColor } from '@renderer/Types/Colors';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AboutPopup",
	components:
	{
		TableSelector
	},
	setup()
	{
		const activeSection: Ref<number> = ref(0);
		const scrollbarColor: Ref<string> = ref('#0f111d');
		const thumbColor: Ref<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value)

		const featuresTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Additional Features"),
				color: ref(stores.userPreferenceStore.currentPrimaryColor.value),
				isActive: computed(() => activeSection.value == 0),
				onClick: () => { activeSection.value = 0; }
			}
		});

		const infoTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Info"),
				color: ref(stores.userPreferenceStore.currentPrimaryColor.value),
				isActive: computed(() => activeSection.value == 1),
				onClick: () => { activeSection.value = 1; }
			}
		});

		return {
			featuresTableControl,
			infoTableControl,
			activeSection,
			defaultInputTextColor,
			scrollbarColor,
			thumbColor
		}
	}
})
</script>

<style>
.aboutPopupHeader {
	width: 100%;
}

.aboutPopupHeader__controls {
	left: 50%;
	transform: translateX(-50%);
	top: 0%;
	width: 40%;
	z-index: 10;
}

.aboutPopupContainer {
	position: absolute;
	top: 10%;
	width: 100%;
	height: 95%;
}

.aboutPopupContainer__sections {
	position: relative;
	color: v-bind(defaultInputTextColor);
	/* margin: clamp(10px, 5vw, 20px); */
	margin-left: auto;
	margin-right: auto;
	margin-top: 0;
	width: 90%;
	height: 90%;
	overflow-y: scroll;
	direction: rtl;
	padding: 5px;
}

.aboutPopupContainer__section__header {
	font-size: clamp(15px, 1vw, 20px)
}

.aboutPopupContainer__section__text {
	font-size: clamp(10px, 0.8vw, 15px)
}

.aboutPopupContainer__image {
	border-radius: min(1vw, 1rem);
	transform: scale(0.75);
}

.aboutPopupContainer__sections::-webkit-scrollbar {
	width: clamp(7px, 0.7vw, 10px);
}

.aboutPopupContainer__sections::-webkit-scrollbar-track {
	background: transparent;
}

.aboutPopupContainer__sections::-webkit-scrollbar-track {
	transition: 0.3s;
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.aboutPopupContainer__sections::-webkit-scrollbar-thumb {
	max-width: 50%;
	transition: 0.3s;
	background: v-bind(thumbColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}
</style>
