<template>
    <div>
        {{ vaultNames }}
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import app from '../../../Objects/Stores/AppStore';
import { Organization } from '@vaultic/shared/Types/DataTypes';

export default defineComponent({
	name: "VaultListCell",
	props: ["model", "data"],
	setup(props)
	{
        const vaultIDs: ComputedRef<Map<number, number>> = computed(() => (props.model as Organization).vaultIDsByVaultID);
        const vaultNames: ComputedRef<string> = computed(() => vaultsToVaultNames(vaultIDs.value));

        function vaultsToVaultNames(vaults: Map<number, number>): string
        {
            let vaultNamesString = "";
            let count = 0;

            for (const [key, _] of vaults.entries())
            {
                const vault = app.userVaultsByVaultID.get(key);
                if (vault)
                {
                    if (count == 0)
                    {
                        vaultNamesString += `${vault.name}`;
                    }
                    else
                    {
                        vaultNamesString += `, ${vault.name}`
                    }

                    count += 1;
                }
            }

            return vaultNamesString;
        }

		return {
            vaultNames
		};
	}
})
</script>

