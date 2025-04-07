<template>
    <div ref="container" class="vaulticFieldsetContainer" 
        :class="
        {
            'vaulticFieldsetContainer--fillSpace': fillSpace === true,
            'vaulticFieldsetContainer--centered': centered === true,
            'vaulticFieldsetContainer--end': end === true
        }">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: "VaulticFieldset",
	props: ["fillSpace", "centered", "end"],
	setup()
	{
		return {
        };
	},
})
</script>
<style scoped>
.vaulticFieldsetContainer {
    display: flex;
    width: 100%;
    column-gap: 10px;
    position: relative;
}

.vaulticFieldsetContainer--fillSpace {
    flex-grow: 1;
}

.vaulticFieldsetContainer--centered {
    justify-content: center;
}

.vaulticFieldsetContainer--end {
    align-items: end;
}
</style>
