<template>
    <div class="widgetErrorMessage">
        <div>
            <i class="pi pi-exclamation-triangle widgetErrorMessage__icon"></i>
        </div>
        <div>
            {{ message }}
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: "WidgetErrorMessage",
    props: ['message'],
    setup()
    {
        return {

        }
    }
})
</script>
<style>
.widgetErrorMessage {
    width: 100%;
    height: 100%;
    display: flex;
    color: white;
    flex-direction: column;
    transform: translateY(10%);
}

.widgetErrorMessage__icon {
    font-size: 50px !important;
}
</style>
