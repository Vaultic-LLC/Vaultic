<template>
    {{ permissionString }}
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import { serverPermissionToViewableServerPermission } from '@vaultic/shared/Types/ClientServerTypes';
import { Member } from '@vaultic/shared/Types/DataTypes';

export default defineComponent({
	name: "PermissionsCell",
	props: ["model", "data"],
	setup(props)
	{
        const permissionString: ComputedRef<string> = computed(() => 
            serverPermissionToViewableServerPermission((props.model as Member).permission));
            
		return {
            permissionString
		};
	}
})
</script>

