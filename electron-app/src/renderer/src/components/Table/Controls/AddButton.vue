<template>
	<div class="addRowButtonContainer">
		<div class="addRowButtonContainer__button">
			<ion-icon class="addTableItemButtonIcon" name="add-outline"></ion-icon>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: "AddButton",
	props: ['color'],
	setup()
	{
		return {
		}
	}
})
</script>

<style>
.addRowButtonContainer {
	cursor: pointer;
}

.addRowButtonContainer__button {
	height: clamp(15px, 2vw, 35px);
	width: clamp(15px, 2vw, 35px);
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 35px;

	border-radius: 50%;
	/* background: v-bind(primaryColor); */
	color: white;
	transition: 0.5s;
	border: 2px solid v-bind(color);
}

.addRowButtonContainer__button:hover {
	box-shadow: 0 0 25px v-bind(color);
}
</style>
