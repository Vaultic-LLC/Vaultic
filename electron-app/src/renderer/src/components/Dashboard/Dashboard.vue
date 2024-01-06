<template>
	<div id="dashboard">
		<!-- <div id="passwordStrengthGauge">
            <label id="passwordScore">Password Score</label>
            <LargeMetricGauge />
        </div> -->
		<!-- <div id="passwordRisks">
            <SmallMetricGauge :title="'Old'" :filledAmount="oldPasswords" :totalAmount="totalPasswords" />
            <SmallMetricGauge :title="'Duplicate'" :filledAmount="duplicatePasswords" :totalAmount="totalPasswords" />
            <SmallMetricGauge :title="'Weak'" :filledAmount="weakPasswords" :totalAmount="totalPasswords" />
            <SmallMetricGauge :title="'Contains Login'" :filledAmount="containsLoginPasswords"
                :totalAmount="totalPasswords" />
        </div> -->
		<div id="passwordLockTimer">
			<LockTimerCountdown />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
//import LargeMetricGauge from "./LargeMetricGauge.vue";
import LockTimerCountdown from "./LockTimerCountdown.vue";

export default defineComponent({
	name: "DashBoard",
	components:
	{
		//LargeMetricGauge,
		// SmallMetricGauge,
		LockTimerCountdown
	},
	setup()
	{
		// const totalPasswords: Ref<number> = ref(stores.encryptedDataStore.passwords.length);
		// const oldPasswords: Ref<number> = ref(stores.encryptedDataStore.oldPasswords);
		// let duplicatePasswords: Ref<number> = ref(encryptedDataStore.duplicatePasswords);
		// const weakPasswords: Ref<number> = ref(stores.encryptedDataStore.weakPasswords);
		// const containsLoginPasswords: Ref<number> = ref(stores.encryptedDataStore.containsLoginPasswords);

		// watch(() => encryptedDataStore.duplicatePasswords, (newValue) =>
		// {
		//     duplicatePasswords.value = newValue;
		// });

		return {
			// totalPasswords,
			// oldPasswords,
			// duplicatePasswords,
			// weakPasswords,
			// containsLoginPasswords
		}

	}
})
</script>

<style>
#dashboard {
	display: flex;
	flex-direction: row;
	justify-content: space-around;
	/* box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25); */

}

#passwordScore {
	top: 25px;
	left: 50px;
	position: absolute;
	color: white;
}

#passwordRisks {
	display: grid;
	grid-template-columns: 150px 150px 150px 150px;
	gap: 5px
}
</style>
