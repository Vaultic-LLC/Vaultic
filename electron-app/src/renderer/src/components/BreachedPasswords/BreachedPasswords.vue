<template>
	<div class="breechedPasswordsContainer">
		<SpinningGlobe />
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import SpinningGlobe from './SpinningGlobe.vue';

import { stores } from '../../Objects/Stores';

export default defineComponent({
	name: "BreachedPasswords",
	components:
	{
		SpinningGlobe
	},
	setup(props)
	{

		return {

		}
	}
})
</script>
<style>
.breechedPasswordsContainer {
	position: absolute;
	top: 6.5%;
	left: 33%;
	width: 45%;
	height: 19%;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	border-radius: 20px;
	background: linear-gradient(145deg, #121a20, #0f161b);
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630;
}
</style>
