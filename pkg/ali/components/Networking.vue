<script lang='ts'>
import semver from 'semver';
import { mapGetters } from 'vuex';
import { defineComponent, PropType } from 'vue';
import debounce from 'lodash/debounce';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import FileSelector from '@shell/components/form/FileSelector.vue';
import KeyValue from '@shell/components/form/KeyValue.vue';
import ArrayList from '@shell/components/form/ArrayList.vue';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import Accordion from '@components/Accordion/Accordion.vue';
import Banner from '@components/Banner/Banner.vue';
import { RadioGroup } from '@components/Form/Radio';
import {
  getAlibabaVPCs
} from '../util/ack';
import { sortable } from '@shell/utils/version';
import { sortBy } from '@shell/utils/sort';
import { MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';

const DEFAULT_CONTAINER_CIDR = '172.20.0.0/16';

export default defineComponent({
  name: 'Networking',

  emits: ['validationChanged', 'error', 'update:enableNetworkPolicy', 'update:config', 'update:configIsValid', 'update:configUnreportedErrors'],

  components: {
    LabeledSelect,
    LabeledInput,
    Checkbox,
    FileSelector,
    KeyValue,
    ArrayList,
    Tabbed,
    Tab,
    Accordion,
    Banner,
    RadioGroup
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    config: {
      type:     Object as PropType<any>,
      required: true
    },
    isNewOrUnprovisioned: {
      type:    Boolean,
      default: true
    },
    originalVersion: {
      type:    String,
      default: ''
    },
    // enableNetworkPolicy: {
    //   type:    Boolean,
    //   default: false
    // },
    configUnreportedErrors: {
      type:    Array,
      default: () => []
    },
    configIsValid: {
      type:    Boolean,
      default: true
    },
  },

  fetch() {
  },

  data() {
    const store = this.$store as Store<any>;
    // This setting is used by RKE1 AKS GKE and EKS - rke2/k3s have a different mechanism for fetching supported versions
    const supportedVersionRange = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.UI_SUPPORTED_K8S_VERSIONS)?.value;
    
    return {
      supportedVersionRange,
      loadingVPCs: false,
      allVPCs: [],
      fvFormRuleSets:         [],
      vpcInfo:               [] as AWS.VPC[],
      chooseVPC:          false //TODO edit once know more
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    fvExtraRules() {
      return {};
    },
    networkPluginOptions(): Array<any> {
      return [
        {
          value:    'flannel',
          label:    this.t('ack.networkPlugin.options.flannel'),
        },
        {
          value: 'terway',
          label: this.t('ack.networkPlugin.options.terway')
        }
      ];
    },
    isFlannel(): boolean {
      return this.config.networkPlugin === 'flannel';
    },
    isTerway(): boolean {
      return this.config.networkPlugin === 'terway';
    },
    vpcOptions(): Array<any> {
      return this.allVPCs
    }
  },

  watch: {
    fvFormIsValid: {
      immediate: true,
      handler(neu) {
        this.$emit('update:configIsValid', neu);
      }
    },
    fvUnreportedValidationErrors: {
      immediate: true,
      handler(neu) {
        this.$emit('update:configUnreportedErrors', neu);
      }
    },
    config: {
      handler: debounce(function(neu) {
        this.$emit('update:config', neu);
      }, 200),
      deep: true
    },
    'config.regionId': {
      handler(neu) {
        // if (neu) {
        //   this.getVersions();
        //   //this.getVmSizes();
        //   //this.getVirtualNetworks();
        // }
      },
      immediate: true
    },
    
  },

  methods: {
  },

});
</script>

<template>
  <div
    class="mt-10"
    data-testid="cruack-networking"
  >
    <div
      class="row mb-10 "
    >
      <div class="col span-3">
        <LabeledSelect
          v-model:value="config.networkPlugin"
          :mode="mode"
          :options="networkPluginOptions"
          label-key="ack.networkPlugin.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-network-plugin-select"
        />
      </div>
      <div v-if="isFlannel" class="col span-3">
        <LabeledInput
          v-model:value="config.containerCidr"
          :mode="mode"
          label-key="ack.containerCidr.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-network-containerCidr-input"
        />
      </div>
      <div v-else-if="isTerway" class="col span-3">
        <LabeledSelect
          v-model:value="config.podVswitchIds"
          :mode="mode"
          :options="podVswitchIdOptions"
          label-key="ack.podVswitchIds.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-network-podVswitchIds-input"
        />
      </div>
    </div>
    <div class="row mb-10 mt-20">
      <div
        v-if="isCreate"
        class="col span-6"
      >
        <RadioGroup
          v-model:value="chooseVPC"
          name="subnet-mode"
          :mode="mode"
          :options="[{label: t('ack.vpc.default'), value: false},{label: t('ack.vpc.useCustom'), value: true}]"
          label-key="ack.vpc.title"
          :disabled="!isCreate"
        />
      </div>
    </div>
    <div
      class="row mb-10"
    >
      <div
        v-if="chooseVPC || !isCreate"
        class="col span-6"
      >
        <LabeledSelect
          v-model:value="displaySubnets"
          :disabled="!isCreate"
          :mode="mode"
          label-key="ack.vpc.label"
          :options="vpcOptions"
          :loading="loadingVpcs"
          option-key="key"
          :multiple="true"
          data-testid="eks-subnets-dropdown"
        >
          <template #option="option">
            <span :class="{'pl-30': option._isSubnet}">{{ option.label }}</span>
          </template>
        </LabeledSelect>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>