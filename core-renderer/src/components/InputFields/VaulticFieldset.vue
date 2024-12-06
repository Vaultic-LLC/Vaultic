<template>
    <div ref="container" class="vaulticFieldsetContainer" 
        :class="
        {
            'vaulticFieldsetContainer--fillSpace': fillSpace === true,
            'vaulticFieldsetContainer--static': static === true,
            'vaulticFieldsetContainer--centered': centered === true,
            'vaulticFieldsetContainer--end': end === true
        }">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, Ref, ref } from 'vue';

export default defineComponent({
	name: "VaulticFieldset",
	props: ["fillSpace", "static", "centered", "end"],
	setup()
	{
        const container: Ref<HTMLElement | null> = ref(null)
        const resizeHandler: ResizeObserver = new ResizeObserver(setHeight);
        const staticHeight: Ref<string> = ref('');

        function setHeight()
        {
            if (container.value)
            {
                staticHeight.value = `${container.value.clientHeight}px`;
            }
        }

        onMounted(() => 
        {
            const body = document.getElementById('body');
            if (body)
            {
                resizeHandler.observe(body)
            }

            setHeight();
        });

        onUnmounted(() => 
        {
            const body = document.getElementById('body');
            if (body)
            {
                resizeHandler.unobserve(body)
            }        
        });

		return {
            container,
            staticHeight
        };
	},
})
</script>
<style scoped>
.vaulticFieldsetContainer {
    display: flex;
    width: 100%;
    column-gap: 10px;
}

.vaulticFieldsetContainer--fillSpace {
    flex-grow: 1;
}

.vaulticFieldsetContainer--static {
    height: v-bind(staticHeight);
}

.vaulticFieldsetContainer--centered {
    justify-content: center;
}

.vaulticFieldsetContainer--end {
    align-items: end;
}
</style>
