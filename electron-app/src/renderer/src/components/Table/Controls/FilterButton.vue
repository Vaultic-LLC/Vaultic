<template>
	<div class="filterButton" @click="onFilterButtonClicked" :class="{ active: active }">
		<div class="filterButtonText">
			{{ text }}
		</div>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, inject } from 'vue';
import { PrimaryColorKey, SecondaryColorOneKey, SecondaryColorTwoKey } from '../../../Types/Keys';
import { stores } from '../../../Objects/Stores/index';

export default defineComponent({
	name: "FilterButton",
	props: ["id", "text", "isActive"],
	setup(props)
	{
		const active: Ref<boolean> = ref(props.isActive);

		let primaryColor: Ref<string> | undefined = inject(PrimaryColorKey);
		let secondaryColorOne: Ref<string> | undefined = inject(SecondaryColorOneKey);
		let secondaryColorTwo: Ref<string> | undefined = inject(SecondaryColorTwoKey);

		function onFilterButtonClicked()
		{
			const filterStatus: boolean | undefined = stores.filterStore.toggleFilter(props.id);
			if (filterStatus === undefined)
			{
				return;
			}

			active.value = filterStatus;
		}

		return {
			active,
			onFilterButtonClicked,
			primaryColor,
			secondaryColorOne,
			secondaryColorTwo
		}
	}
})
</script>

<style>
.filterButton {
	width: 150px;
	height: 40px;
	/* background-color: var(--app-color); */
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	position: relative;
	padding: 0.25rem;
	transition: 0.25s ease-out;
	background-clip: padding-box;
	/* border: 5px solid #2e324d; */
	border-radius: 25px;
	font: 700 1rem Raleway, sans-serif;
	color: white;
	background: linear-gradient(145deg, #121a20, #0f161b);
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630;
}

/* .filterButton::before, */
/* .filterButton::after {
    content: "";
    border-radius: inherit;
    transition: inherit;
    position: absolute;
    inset: 0;
    pointer-events: none;
} */

/* Gradient Shadow */
/* .filterButton::before {
    inset: -0.2em;
    z-index: -1;

    background: linear-gradient(hsla(var(--shadow-top), .68), hsla(var(--orig-color), 1));
    filter: blur(1.2em) saturate(1.2);

    transform-origin: bottom;
    opacity: 1;
} */

/* // Semi-transparent blended box-shadow brightens up the border */
/* .filterButton::after {
    box-shadow: inset 0 0 0 1px white,
        0 0 0 4px white,
        1px 1px 0 4px white;

    mix-blend-mode: overlay;

    opacity: 1;
} */

/* .filterButton:hover,
.filterButton:focus {
    color: hsla(var(--text-hover), 1);

    border-color: transparent;

    box-shadow:
        inset 0 1.4em 0 hsla(var(--app-color), 0.1),
        inset 0 0 1.4em hsla(var(--app-color), 0.32),
        0 1px 1px hsla(var(--app-color), 0.32);
} */

/* // Show effects */
/* .filterButton:hover::after,
.filterButton:hover::before {
    transform: none;
    opacity: 1;
} */

.filterButton .filterButtonText {
	color: inherit;
	user-select: none;
}

/* .filterButton:hover {
    animation: filterButtonHover .2s linear forwards;
} */

/* @keyframes filterButtonHover {

    0% {
        box-shadow: 0 0 0px v-bind(primaryColor);
    }

    100% {
        box-shadow: 0 0 5px v-bind(primaryColor),
            0 0 25px v-bind(primaryColor),
            0 0 50px v-bind(primaryColor),
            0 0 200px v-bind(primaryColor);
    }
} */

.filterButton.active {
	/* border: 5px solid var(--app-color); */
	/* background: linear-gradient(90deg,
            v-bind(secondaryColorOne) 0%,
            v-bind(primaryColor) 50%); */
	/* background: v-bind(primaryColor); */
	background: #11181e;
	box-shadow: inset 5px 5px 10px #070a0c,
		inset -5px -5px 10px #1b2630;
}
</style>
