<template>
	<div class="controlsContainer">
		<div class="filterButtons">
			<FilterButton v-for="filter in filters" :key="filter.id" :id="filter.id" :text="filter.text"
				:isActive="filter.isActive" />
		</div>
		<!-- <div class="controlsButtons" :class="{ forceButtonsRight: filterButtonCount == 0 }">
            <div class="showfilterPopupButon controlButton" @click="doShowEditControlsPopup(0)"
                :class="{ didHover: didHoverFilterButton }" @mouseenter="didHoverFilterButton = true">
                <ion-icon class="rowIcon" name="filter-outline"></ion-icon>
            </div>
            <div class="addRow controlButton" @click="doShowEditControlsPopup(2)" :class="{ didHover: didHoverAddButton }"
                @mouseenter="didHoverAddButton = true">
                <ion-icon class="rowIcon" name="add-outline"></ion-icon>
            </div>
        </div> -->
	</div>
	<AddItemPopup v-show="showEditControlsPopup" @closePopup="showEditControlsPopup = false"
		:initalActiveContent="initalActiveContent" />
</template>

<script lang="ts">
import { defineComponent, computed, ComputedRef, Ref, ref, onMounted, inject } from 'vue';
import FilterButton from "./FilterButton.vue"
import AddItemPopup from "./AddItemPopup.vue"
import { Filter } from '../../../Types/Table';
import { PrimaryColorKey } from '../../../Types/Keys';

export default defineComponent({
	name: "TableControls",
	components: {
		FilterButton,
		AddItemPopup
	},
	props: ["filterButtons"],
	setup(props)
	{
		let tableColor: Ref<string> | undefined = inject(PrimaryColorKey);
		let filterButtonCount: ComputedRef<number> = computed(() => props.filterButtons.length);
		let filters: ComputedRef<Filter[]> = computed(() => props.filterButtons);
		let initalActiveContent: Ref<number> = ref(0);

		let showEditControlsPopup: Ref<boolean> = ref(false);

		// used so that we don't trigger the exit hover animation right away
		let didHoverFilterButton: Ref<boolean> = ref(false);
		let didHoverAddButton: Ref<boolean> = ref(false);

		onMounted(() =>
		{
			didHoverFilterButton.value = false;
			didHoverAddButton.value = false;
		});

		function doShowEditControlsPopup(activeContent: number)
		{
			initalActiveContent.value = activeContent;
			showEditControlsPopup.value = true;
			// stores.appStore.addGlass(glassId, 5, () => showEditControlsPopup.value = false);
		}

		return {
			initalActiveContent,
			showEditControlsPopup,
			tableColor,
			didHoverFilterButton,
			didHoverAddButton,
			filters,
			filterButtonCount,
			doShowEditControlsPopup
		}
	}
})
</script>

<style>
.controlsContainer {
	display: flex;
	flex-grow: 1;
	justify-content: space-between;
	margin-top: 50px;
	height: 40px;
	margin-bottom: 50px;
	width: 20%;
	position: absolute;
	top: 38.5%;
	left: -1%;
}

.controlsContainer .filterButtons {
	/* width: 50%; */
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	margin-left: 100px;
	justify-content: start;
}

.controlsContainer .controlsButtons {
	display: flex;
	gap: 20px;
	margin-right: 50px;
}

.controlsContainer .forceButtonsRight {
	position: absolute;
	right: 50px;
	height: 50px;
}

.controlsContainer .controlsButtons .controlButton {
	width: 50px;
	height: 50px;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 25px;
	cursor: pointer;
}

.controlsContainer .controlsButtons .rowIcon {
	font-size: 40px;
	color: white;
}

.controlsContainer .controlsButtons .addRow.didHover {
	animation: AddButton 0.5s linear forwards;
}

.controlsContainer .controlsButtons .addRow:hover {
	animation: hoverAddButton 0.2s linear forwards;
}

@keyframes AddButton {
	0% {
		background-color: rgb(16, 216, 123);
	}

	100% {
		background-color: transparent;
	}
}

@keyframes hoverAddButton {
	0% {
		background-color: transparent;
	}

	100% {
		background-color: rgb(16, 216, 123);
	}
}

.controlsContainer .controlsButtons .showfilterPopupButon.didHover {
	animation: filterButton 0.5s linear forwards;
}

.controlsContainer .controlsButtons .showfilterPopupButon:hover {
	animation: hoverFilterButton 0.2s linear forwards;
}

@keyframes filterButton {
	0% {
		background-color: v-bind(tableColor);
	}

	100% {
		background-color: transparent;
	}
}

@keyframes hoverFilterButton {
	0% {
		background-color: transparent;
	}

	100% {
		background-color: v-bind(tableColor);
	}
}
</style>
