<script lang="ts" setup>
import Logo from '@/src/Vaultic_Primary_Color.png'
</script>

<template>
  <div class="app">
    <img class="app__logo" :src="Logo" alt="Logo" />
  </div>
</template>

<style scoped>
.app {
    width: 150px;
    height: 150px;
    background-color: #0f111d;
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.app__logo {
    width: 75%;
    object-fit: contain;
    margin-top: 10px;
}

</style>
