<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { mapGetters } from 'vuex';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Banner from '@components/Banner/Banner.vue';
import DiskType from './DiskType.vue';
import DiskGroup from './DiskGroup.vue';

export default defineComponent({
  name: 'ACKNodePool',

  emits: ['update:value', 'validationChanged'],

  components: {
    LabeledInput,
    LabeledSelect,
    Banner,
    DiskType,
    DiskGroup
  },

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    pool: {
      type:     Object,
      required: true
    },
    region: {
      type:    String,
      default: ''
    },

    instanceTypeOptions: {
      type:    Array,
      default: () => []
    },
    loadingInstanceTypes: {
      type:    Boolean,
      default: false
    },
  },

  data() {
    return {
      osDiskTypeOptions:       ['Managed', 'Ephemeral'],
      modeOptions:             ['User', 'System'],
      maxPools:          5000, // TODO make it cur + 500 for edit

    };
  },

  watch: {},

  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    // instanceTypeOptions(): { value: string, label: string }[] {
    //   console.log(this.allInstanceTypes)
    //   return this.allInstanceTypes.map((v) => ({ value: v, label: v }));
    // },
    systemDisk:{
      get() {
        return {category: this.pool.systemDiskCategory, size:this.pool.systemDiskSize };
      },
      set(neu: {category: string, size?: string, encrypted?: boolean}) {
        this.pool.systemDiskCategory = neu.category;
        this.pool.systemDiskSize = neu.size;
      }
    },
  },
  

  methods: {},
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
          label-key="ack.nodePool.name.label"
          required
          :disabled="!pool._isNewOrUnprovisioned"
        />
      </div>
      <div class="col span-3">
        <LabeledInput
          v-model:value.number="pool.desiredSize"
          type="number"
          :mode="mode"
          label-key="ack.nodePool.desiredSize.label"
          :min="1"
          :max="maxPools"
          data-testid="ack-pool-count-input"
        />
      </div>
    </div>
    <div class="col mb-10">
      <Banner
        color="info"
        label-key="ack.nodePool.instanceTypes.banner"
        data-testid="cruack-instanceTypesBanner"
      />
      <div class="col span-6">
        <LabeledSelect
          v-model:value="pool.instanceTypes"
          :mode="mode"
          :loading="loadingInstanceTypes"
          :options="instanceTypeOptions"
          label-key="ack.nodePool.instanceTypes.label"
          required
          :disabled="!pool._isNewOrUnprovisioned"
          :multiple="true"
        />
      </div>
    </div>
  </div>
  <p class="mb-10">{{ t('ack.nodePool.systemDisk.title')}}</p>
  <DiskType 
    v-model:value="systemDisk"
    :mode="mode"
    :isNewOrUnprovisioned="pool._isNewOrUnprovisioned"
    :showEncrypted="false"
  />
  <p class="mb-10">{{ t('ack.nodePool.dataDisks.title')}}</p>
  <DiskGroup 
    v-model:value="pool.dataDisks"
    :mode="mode"
  />

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
