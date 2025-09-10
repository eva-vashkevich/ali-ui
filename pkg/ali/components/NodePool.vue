<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { mapGetters } from 'vuex';

import { _CREATE, _VIEW } from '@shell/config/query-params';
import type { AKSDiskType, AKSNodePool, AKSPoolMode } from '../types/index';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import RadioGroup from '@components/Form/Radio/RadioGroup.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import KeyValue from '@shell/components/form/KeyValue.vue';
import Banner from '@components/Banner/Banner.vue';

import { randomStr } from '@shell/utils/string';

export default defineComponent({
  name: 'AKSNodePool',

  emits: ['vmSizeSet', 'update:value', 'validationChanged'],

  components: {
    LabeledInput,
    LabeledSelect,
    UnitInput,
    RadioGroup,
    Checkbox,
    KeyValue,
    Banner
  },

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    pool: {
      type:     Object as PropType<AKSNodePool>,
      required: true
    },

    clusterVersion: {
      type:    String,
      default: ''
    },

    originalClusterVersion: {
      type:    String,
      default: ''
    }
  },

  data() {
    return {
      osDiskTypeOptions:       ['Managed', 'Ephemeral'] as AKSDiskType[],
      modeOptions:             ['User', 'System'] as AKSPoolMode[],
      availabilityZoneOptions: [{ label: 'zone 1', value: '1' }, { label: 'zone 2', value: '2' }, { label: 'zone 3', value: '3' }],
    };
  },

  watch: {

  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    validAZ(): Boolean {
      return !this.pool.availabilityZones || !this.pool.availabilityZones.length || this.canUseAvailabilityZones;
    },

    isView() {
      return this.mode === _VIEW;
    },

    clusterWillUpgrade() {
      return this.originalClusterVersion !== this.clusterVersion;
    },

    // offer a k8s version upgrade if the node pool is not on the same version as the cluster and the cluster is not currently being upgraded
    upgradeAvailable(): boolean {
      if (this.mode === _CREATE || this.pool._isNewOrUnprovisioned) {
        return false;
      }

      return this.clusterVersion !== this.originalOrchestratorVersion && !!this.originalOrchestratorVersion;
    },

    willUpgrade: {
      get() {
        return this.upgradeAvailable && this.pool.orchestratorVersion === this.clusterVersion;
      },
      set(neu: boolean) {
        if (neu) {
          this.pool['orchestratorVersion'] = this.clusterVersion;
        } else {
          this.pool['orchestratorVersion'] = this.originalOrchestratorVersion;
        }
      }
    },

    upgradeLabel(): string {
      return this.t('aks.nodePools.orchestratorVersion.upgrade', { from: this.originalOrchestratorVersion, to: this.clusterVersion });
    },
  },

  methods: {
  },
});
</script>

<template>
  <div
    class="pool"
  >
    <div class="row mb-10">
      <div class="col span-3">
        <LabeledInput
          v-model:value="pool.name"
          :mode="mode"
          label-key="generic.name"
          required
          :disabled="!pool._isNewOrUnprovisioned"
        />
      </div>
      <!-- <div class="col span-3">
        <LabeledSelect
          v-model:value="pool.vmSize"
          :options="vmSizeOptions"
          label-key="aks.nodePools.vmSize.label"
          :loading="loadingVmSizes"
          :mode="mode"
          :disabled="!pool._isNewOrUnprovisioned"
        />
      </div> -->
      
      <!-- <div class="col span-2">
        <RadioGroup
          v-model:value="pool.mode"
          :mode="mode"
          :options="modeOptions"
          :name="`${pool._id}-mode`"
          :row="true"
          label-key="generic.mode"
          @update:value="$emit('validationChanged')"
        >
          <template #label>
            <span class="text-label">{{ t('aks.nodePools.mode.label') }}</span>
          </template>
        </RadioGroup>
      </div> -->
    </div> 
  </div>
</template>

<style lang="scss" scoped>
.remove-row {
  display: flex;
  justify-content: flex-end;
}
.taints {
  width: 100%;
  th,:deep() td{
    text-align: left;
    padding-right: 10px;
    font-weight: inherit;
  }
  th>* {
    margin: 0px;
  }
}
</style>