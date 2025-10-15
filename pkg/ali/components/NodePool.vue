<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { mapGetters } from 'vuex';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Banner from '@components/Banner/Banner.vue';
import InstanceType from './InstanceType.vue';
import DiskType from './DiskType.vue';
import DiskGroup from './DiskGroup.vue';

export default defineComponent({
  name: 'ACKNodePool',

  emits: ['update:value', 'imageChanged', 'validationChanged'],

  components: {
    LabeledInput,
    LabeledSelect,
    Banner,
    InstanceType,
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
    config:{
      type:     Object,
      required: true
    },
    imageOptions: {
      type:    Array,
      default: () => []
    },
    loadingImages: {
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
    systemDisk:{
      get() {
        return {category: this.pool.systemDiskCategory, size:this.pool.systemDiskSize };
      },
      set(neu: {category: string, size?: string, encrypted?: boolean}) {
        this.pool.systemDiskCategory = neu.category;
        this.pool.systemDiskSize = neu.size;
      }
    },
    image:{
      get() {
        return {imageId: this.pool.imageId, imageType:this.pool.imageType };
      },
      set(neu: {imageId: string, imageType: string}) {
        this.pool.imageId = neu.imageId;
        this.pool.imageType = neu.imageType;
      }
    }
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
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="image"
          :mode="mode"
          :loading="loadingImages"
          :options="imageOptions"
          label-key="ack.nodePool.imageId.label"
          required
          :disabled="!pool._isNewOrUnprovisioned"
        />
      </div>
    </div>
    <div class="col mb-30">
      <InstanceType 
        v-model:value="pool.instanceTypes"
        :config="config"
        :mode="mode"
        :isNewOrUnprovisioned="pool._isNewOrUnprovisioned"
      />
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
