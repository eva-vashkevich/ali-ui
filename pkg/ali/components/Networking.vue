<script lang='ts'>
import { mapGetters, Store } from 'vuex';
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
import { MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';
import {
  getAlibabaResourceGroups, getAlibabaVpcs, getAlibabaZones, getAlibabaVSwitches
} from '../util/ack';

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
      type:     Object,
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
    configUnreportedErrors: {
      type:    Array,
      default: () => []
    },
    configIsValid: {
      type:    Boolean,
      default: true
    },
  },

  data() {
    const store = this.$store;
    // This setting is used by RKE1 AKS GKE and EKS - rke2/k3s have a different mechanism for fetching supported versions
    const supportedVersionRange = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.UI_SUPPORTED_K8S_VERSIONS)?.value;
    
    return {
      supportedVersionRange,
      loadingResourceGroups:      false,
      loadingVPCs: false,
      loadingAvailabilityZones: false,
      loadingVswitches: false,
      allResourceGroups:          [],
      allAvailabilityZones: [],
      allVPCs: [],
      allVSwitches: [],
      fvFormRuleSets:         [],
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
          label:    this.t('ack.networking.networkPlugin.options.flannel'),
        },
        {
          value: 'terway',
          label: this.t('ack.networking.networkPlugin.options.terway')
        }
      ];
    },
    proxyModeOptions(): Array<any> {
      return [
        {
          value:    'iptables',
          label:    this.t('ack.networking.proxyMode.options.iptables'),
        },
        {
          value: 'ipvs',
          label: this.t('ack.networking.proxyMode.options.ipvs')
        }
      ];
    },
    isFlannel(): boolean {
      return this.config.networkPlugin === 'flannel';
    },
    isTerway(): boolean {
      return this.config.networkPlugin === 'terway';
    },
    resourceGroupOptions(): { value: string, label: string}[] {
      const out = [{value: '', label: this.t('ack.networking.resourceGroupId.default')}, ...this.allResourceGroups];
      return out;
    },
    vpcOptions(): Array<any> {
      return this.allVPCs;
    },
    availabilityZoneOptions(): Array<any> {
      return this.allAvailabilityZones;
    },
    podVswitchIdOptions(): Array<any> {
      return [];
    },
    vswitchIdOptions(): Array<any> {
      return this.allVSwitches;
    },
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
        if (neu) {
          this.getResourceGroups();
          this.getZones();
          this.getVPCs();
          this.getVswitches();
        }
      },
      immediate: true
    },
    'config.resourceGroupId': {
      handler(neu) {
        if (neu) {
          this.getVPCs();
          this.getVswitches();
        }
      },
      immediate: true
    },
    'config.vpcId': {
      handler(neu) {
        if (neu) {
          this.getVswitches();
        }
      },
      immediate: true
    },
  },

  methods: {
    async getResourceGroups(): Promise<void> { 
      this.loadingResourceGroups = true;

      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        const res = await getAlibabaResourceGroups(this.$store, alibabaCredentialSecret, regionId );
        
        this.allResourceGroups = (res?.ResourceGroups?.ResourceGroup || []).map((group: any)=>{return {value: group.Id, label:group.Name}});

      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.resourceGroups', { e: parsedError || err }));
      }
      this.loadingResourceGroups = false;
    },
    async getVPCs(): Promise<void> { 
      this.loadingVPCs = true;

      const { alibabaCredentialSecret, regionId, resourceGroupId } = this.config;
      try {
        const res = await getAlibabaVpcs(this.$store, alibabaCredentialSecret, regionId, resourceGroupId );
        this.allVPCs = (res?.Vpcs?.Vpc || []).map((vpc: any)=>{return {value: vpc.VpcId, label: vpc.VpcName ? vpc.VpcName : `${vpc.VpcId} - ${vpc.CidrBlock}`}});
        
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.vpcs', { e: parsedError || err }));
      }
      this.loadingVPCs = false;
    },
    async getVswitches(): Promise<void> { 
      this.loadingVswitches = true;

      const { alibabaCredentialSecret, regionId, resourceGroupId, vpcId } = this.config;
      try {
        const res = await getAlibabaVSwitches(this.$store, alibabaCredentialSecret, regionId, vpcId, resourceGroupId );

        this.allVSwitches = (res?.VSwitches?.VSwitch || []).map((vswitch: any)=>{return {value: vswitch.VSwitchId, label: vswitch.VpcName ? vswitch.VSwitchName : vswitch.VSwitchId }});
        
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.vpcs', { e: parsedError || err }));
      }
      this.loadingVswitches = false;
    },
    async getZones(): Promise<void> { 
      this.loadingAvailabilityZones = true;

      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        const res = await getAlibabaZones(this.$store, alibabaCredentialSecret, regionId );
        this.allAvailabilityZones = (res?.Zones?.Zone || []).map((zone: any)=>{return {value: zone.ZoneId, label:zone.LocalName}});
        
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.zones', { e: parsedError || err }));
      }
      this.loadingAvailabilityZones = false;
    },
  }
});
</script>

<template>
  <div
    class="mt-10"
    data-testid="ack-networking"
  >
    <div
      class="row mb-10"
    >
      <div class="col span-4">
        <LabeledSelect
          v-model:value="config.resourceGroupId"
          data-testid="ack-networking-resourceGroupId"
          :mode="mode"
          :options="resourceGroupOptions"
          label-key="ack.networking.resourceGroupId.label"
          option-key="value"
          option-label="label"
          :loading="loadingResourceGroups"
          required
        />
      </div>
    </div>
    <div class="mb-20">
      <div class="row mb-10 mt-20">
        <div
          v-if="isCreate"
          class="col span-4"
        >
          <RadioGroup
            v-model:value="chooseVPC"
            name="subnet-mode"
            :mode="mode"
            :options="[{label: t('ack.networking.vpc.default'), value: false},{label: t('ack.networking.vpc.useCustom'), value: true}]"
            :disabled="!isCreate"
          >
          <template v-slot:label>
            <p class="mb-10">{{ t('ack.networking.vpc.title')}}</p>
          </template>
          </RadioGroup>
        </div>
      </div>
      <div
        v-if="chooseVPC || !isCreate"
        class="row mb-10"
      >
        <div class="row span-12">
          <div class="col span-4">
            <LabeledSelect
              v-model:value="config.vpcId"
              :disabled="!isCreate"
              :mode="mode"
              label-key="ack.networking.vpc.label"
              :options="vpcOptions"
              :loading="loadingVPCs"
              option-key="key"
              :multiple="true"
              data-testid="ack-networking-vpcid-dropdown"
            />
          </div>
          <div class="col span-4">
            <LabeledSelect
              v-model:value="config.vswitchIds"
              :mode="mode"
              :options="vswitchIdOptions"
              label-key="ack.networking.vpc.vswitchIds.label"
              :disabled="!isNewOrUnprovisioned"
              data-testid="ack-networking-vswitchIds-input"
      />
          </div>
        </div>
      </div>
      <div
        v-else
        class="row mb-10"
      >
        <div class="col span-4">
          <LabeledSelect
            v-model:value="config.zoneIds"
            :options="availabilityZoneOptions"
            :loading="loadingAvailabilityZones"
            label-key="ack.networking.vpc.availabilityZones.label"
            :mode="mode"
            :multiple="true"
            :taggable="true"
          />
        </div>
      </div>
      <div class="row mb-10">
        <Checkbox
          v-model:value="config.snatEntry"
          :mode="mode"
          label-key="ack.networking.vpc.snatEntry.label"
          data-testid="ack-networking-vpc-snatEntry"
        />
    </div>
    </div>
    
    <div class="row mb-10 mt-20">
      <div class="col span-4">
        <LabeledSelect
          v-model:value="config.networkPlugin"
          :mode="mode"
          :options="networkPluginOptions"
          label-key="ack.networking.networkPlugin.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-networking-plugin-select"
        />
      </div>
      <div
        v-if="isFlannel"
        class="col span-4"
      >
        <LabeledInput
          v-model:value="config.containerCidr"
          :mode="mode"
          label-key="ack.networking.containerCidr.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-networking-containerCidr-input"
        />
      </div>
      <div
        v-else-if="isTerway"
        class="col span-4"
      >
        <LabeledSelect
          v-if="chooseVPC"
          v-model:value="config.podVswitchIds"
          :mode="mode"
          :options="podVswitchIdOptions"
          label-key="ack.networking.podVswitchIds.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-networking-podVswitchIds-input"
        />
        <label v-else class="mt-20">{{ t("ack.networking.podVswitchIds.auto") }}</label>
      </div>
    </div>
    <div class="row mb-10">
      <div class="col span-4">
        <LabeledSelect
          v-model:value="config.proxyMode"
          :mode="mode"
          :options="proxyModeOptions"
          label-key="ack.networking.proxyMode.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-networking-proxyMode-select"
        />
      </div>
      <div class="col span-4">
        <LabeledInput
          v-model:value="config.serviceCidr"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          label-key="ack.networking.serviceCidr.label"
          placeholder-key="ack.networking.serviceCidr.placeholder"
          data-testid="ack-networking-serviceCidr-input"
        />
      </div>
    </div>
    <div class="row mb-10">
        <Checkbox
          v-model:value="config.endpointPublicAccess"
          :mode="mode"
          label-key="ack.networking.endpointPublicAccess.label"
          data-testid="ack-networking-endpointPublicAccess"
        />
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>