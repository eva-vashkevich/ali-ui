<script lang='ts'>
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
import { doCidrOverlap, isValidCIDR } from '../util/validation';

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
    console.log(this.config)
    let networkPlugin = 'terway';
    if(!!this.config.containerCidr){
      networkPlugin = 'flannel';
    }
    return {
      loadingResourceGroups:      false,
      loadingVPCs: false,
      loadingAvailabilityZones: false,
      loadingVswitches: false,
      allResourceGroups:          [],
      allAvailabilityZones: [],
      allVPCs: {},
      allVSwitches: {},
      chooseVPC:          false,
      networkPlugin,
      fvFormRuleSets:             [
        {
          path:       'containerCidr',
          rootObject: this.config,
          rules:      ['validCIDR']
        },
        {
          path:       'serviceCidr',
          rootObject: this.config,
          rules:      ['serviceCidrCannotMatchVswitchIP', 'validCIDR']
        },
      ],
    };
  },

  created() {
    this.getResourceGroups();
    this.getZones();
    
      this.getVPCs();
      if( this.isNewOrUnprovisioned){
        this.getVswitches();
      }
      
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    alibabaCredentialSecret(): string {
      return this.config.alibabaCredentialSecret;
    },
    regionId(): string {
      return this.config.regionId;
    },

    fvExtraRules() {
      return {
        validCIDR: (val) => {
          return !val ||isValidCIDR(val) ? null : this.t('validation.invalidCIDR');
        },
        serviceCidrCannotMatchVswitchIP: () => {
          const vpcCidr = this.allVPCs[this.config.vpcId]?.cidr;
          const serviceCidr = this.config.serviceCidr;
          
          return doCidrOverlap(vpcCidr, serviceCidr) ? this.t('validation.serviceCIDR') : null;
        }
      };
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
      return this.networkPlugin === 'flannel';
    },
    isTerway(): boolean {
      return this.networkPlugin === 'terway';
    },
    resourceGroupOptions(): { value: string, label: string}[] {
      const out = [{value: '', label: this.t('ack.networking.resourceGroupId.default')}, ...this.allResourceGroups];
      return out;
    },
    vpcOptions(): Array<any> {
      return Object.keys(this.allVPCs).map((vpcId) => {
        return { value: vpcId, label: this.allVPCs[vpcId].label || ''};
      });
    },
    availabilityZoneOptions(): Array<any> {
      return this.allAvailabilityZones;
    },
    podVswitchIdOptions(): Array<any> {
      const unformatted = this.config?.vswitchIds || [];
      return unformatted.map((vswitchId) => {return {value: vswitchId, label: this.allVSwitches[vswitchId].label || ''}});
    },
    vswitchIdOptions(): Array<any> {
      return Object.keys(this.allVSwitches).map((vswitchId) => {
        return { value: vswitchId, label: this.allVSwitches[vswitchId].label || ''};
      });
    },
  },

  watch: {
    chooseVPC(isCustom) {
      if (this.isNewOrUnprovisioned) { // Only when creating
        if (isCustom) {
          this.config.zoneIds = [];
        } else {
          this.config.vpcId = '';
          this.config.vswitchIds = [];
          this.config.podVswitchIds = [];
          if (this.allAvailabilityZones.length) {
            this.config.zoneIds = this.allAvailabilityZones.map(z => z.value);
          }
        }
      }
    },
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
        console.log(neu)
        this.$emit('update:config', neu);
      }, 200),
      deep: true
    },
    'config.regionId': {
      handler(neu, old) {
        console.log(neu, old)
        if (!!neu && !!old && neu !== old) {
          // Clear dependent values
          this.config.resourceGroupId = '';
          this.config.vpcId = '';
          this.config.vswitchIds = [];
          this.config.podVswitchIds = [];
          this.config.zoneIds = [];

          // Fetch new options
          this.getResourceGroups();
          this.getZones();
        }
      },
      immediate: true
    },
    'config.resourceGroupId': {
      handler(neu, old) {
        if (!!old && !!neu && neu !== old) {
          // Clear dependent values
          this.config.vpcId = '';
          this.config.vswitchIds = [];
          this.config.podVswitchIds = [];

          // Fetch new options
          this.getVPCs();
        }
      },
      immediate: true
    },
    'config.vpcId': {
      handler(neu, old) {
        console.log(neu, old)
        if ((!!old || !old && !!this.isNewOrUnprovisioned) && !!neu && neu !== old) {
          this.config.vswitchIds = [];
          this.config.podVswitchIds = [];
          this.getVswitches();
        }
      },
      immediate: true
    },
    'networkPlugin'(neu) {
      if (neu === 'flannel') {
        this.config.containerCidr = '10.0.0.0/8';
        delete this.config.podVswitchIds;
        this.config.addons = [
          {
            "name": "flannel"
          }
        ] 
      } else {
        delete this.config.containerCidr;
        this.config.addons = [
          {
            "name": "terway-eniip"
          }
        ] 
      }
    },
  },

  methods: {
    async getResourceGroups(): Promise<void> { 
      this.loadingResourceGroups = true;
      this.allResourceGroups = [];
      try {
        const res = await getAlibabaResourceGroups(this.$store, this.alibabaCredentialSecret, this.regionId );
        
        this.allResourceGroups = (res?.ResourceGroups?.ResourceGroup || []).map((group: any)=>{return {value: group.Id, label:group.Name}});

      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.resourceGroups', { e: parsedError || err }));
      }
      this.loadingResourceGroups = false;
    },
    async getVPCs(): Promise<void> { 
      this.loadingVPCs = true;
      this.allVPCs = {};
      const resourceGroupId = this.config.resourceGroupId;
      try {
        const res = await getAlibabaVpcs(this.$store, this.alibabaCredentialSecret, this.regionId, resourceGroupId );
        const vpcs = res?.Vpcs?.Vpc || [];
        vpcs.forEach((vpc: any) => {
          let label = vpc.VpcName ? `${ vpc.VpcName } (${ vpc.VpcId })` : vpc.VpcId;
          if (vpc.CidrBlock) {
            label += ` - ${ vpc.CidrBlock }`;
          }

        this.allVPCs[vpc.VpcId] = {label: label, cidr: vpc.CidrBlock};
        });
        
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.vpcs', { e: parsedError || err }));
      }
      this.loadingVPCs = false;
    },
    async getVswitches(): Promise<void> { 
      this.loadingVswitches = true;
      this.allVSwitches = {};
      const { resourceGroupId, vpcId } = this.config;
      try {
        const res = await getAlibabaVSwitches(this.$store, this.alibabaCredentialSecret, this.regionId, vpcId, resourceGroupId );
        const vSwitches = res?.VSwitches?.VSwitch || [];

        vSwitches.forEach((vswitch: any) => {
          let label = vswitch.VSwitchName ? `${ vswitch.VSwitchName } (${ vswitch.VSwitchId })` : vswitch.VSwitchId;
          if (vswitch.ZoneId) {
            label += ` - ${ vswitch.ZoneId }`;
          }
          if (vswitch.CidrBlock) {
            label += ` - ${ vswitch.CidrBlock }`;
          }
            this.allVSwitches[vswitch.VSwitchId] = {label: label, cidr: vswitch.CidrBlock};
          });
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.networking.errors.vswitches', { e: parsedError || err }));
      }
      this.loadingVswitches = false;
    },
    async getZones(): Promise<void> { 
      this.loadingAvailabilityZones = true;
      this.allAvailabilityZones = [];
      try {
        const res = await getAlibabaZones(this.$store, this.alibabaCredentialSecret, this.regionId, );
        const zones = (res?.Zones?.Zone || []).map((zone: any) => ({ value: zone.ZoneId, label: zone.LocalName }));

        this.allAvailabilityZones = zones;
        console.log(zones)
        if (this.isNewOrUnprovisioned && !this.chooseVPC) {
          this.config.zoneIds = zones.map(z => z.value);
        }
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
          :disabled="!isNewOrUnprovisioned"
        />
      </div>
    </div>
    <div class="mb-10">
      <div class="row mb-10 mt-20">
        <div
          v-if="isNewOrUnprovisioned"
          class="col span-4"
        >
        <p class="mb-10">{{ t('ack.networking.vpc.title')}}</p>
          <RadioGroup
            v-model:value="chooseVPC"
            name="subnet-mode"
            :mode="mode"
            :options="[{label: t('ack.networking.vpc.default'), value: false},{label: t('ack.networking.vpc.useCustom'), value: true}]"
            :disabled="!isNewOrUnprovisioned"
            class="ml-40"
          >
          </RadioGroup>
        </div>
      </div>
      <div
        v-if="chooseVPC || !isNewOrUnprovisioned"
        class="row mb-10 ml-40"
      >
        <div class="row span-12">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="config.vpcId"
              :disabled="!isNewOrUnprovisioned"
              :mode="mode"
              label-key="ack.networking.vpc.label"
              :options="vpcOptions"
              :loading="loadingVPCs"
              option-key="value"
              :multiple="false"
              data-testid="ack-networking-vpcid-dropdown"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="config.vswitchIds"
              :mode="mode"
              :options="vswitchIdOptions"
              :multiple="true"
              :loading="loadingVswitches"
              label-key="ack.networking.vpc.vswitchIds.label"
              :disabled="!isNewOrUnprovisioned"
              data-testid="ack-networking-vswitchIds-input"
          />
          </div>
        </div>
      </div>
      <div
        v-else
        class="row mb-10 ml-40"
      >
        <div class="col span-4">
          <LabeledSelect
            v-model:value="config.zoneIds"
            :disabled="!isNewOrUnprovisioned"
            :options="availabilityZoneOptions"
            :loading="loadingAvailabilityZones"
            label-key="ack.networking.vpc.availabilityZones.label"
            :mode="mode"
            :multiple="true"
            :taggable="true"
          />
        </div>
      </div>
      <div class="row ml-40">
        <Checkbox
          v-model:value="config.snatEntry"
          :disabled="!isNewOrUnprovisioned"
          :mode="mode"
          label-key="ack.networking.vpc.snatEntry.label"
          data-testid="ack-networking-vpc-snatEntry"
        />
    </div>
    </div>
    
    <div class="row mb-10">
      <div class="col span-4">
        <LabeledSelect
          v-model:value="networkPlugin"
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
          :rules="fvGetAndReportPathRules('containerCidr')"
        />
      </div>
      <div
        v-else-if="isTerway"
        class="col span-6"
      >
        <LabeledSelect
          v-if="chooseVPC"
          v-model:value="config.podVswitchIds"
          :mode="mode"
          :options="podVswitchIdOptions"
          :multiple="true"
          :loading="loadingVswitches"
          label-key="ack.networking.podVswitchIds.label"
          :disabled="!isNewOrUnprovisioned"
          data-testid="ack-networking-podVswitchIds-input"
        />
        <label v-else class="">{{ t("ack.networking.podVswitchIds.auto") }}</label>
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
      <div class="col span-8">
      <div class="col span-4">
        <LabeledInput
          v-model:value="config.serviceCidr"
          :mode="mode"
          :disabled="!isNewOrUnprovisioned"
          label-key="ack.networking.serviceCidr.label"
          placeholder-key="ack.networking.serviceCidr.placeholder"
          data-testid="ack-networking-serviceCidr-input"
          :rules="fvGetAndReportPathRules('serviceCidr')"
        />
        </div>
        <p v-clean-html="t('ack.networking.serviceCidr.warning')" class="text-muted text-small mt-5" />
      </div>
    </div>
    <div class="row mb-10">
        <Checkbox
          v-model:value="config.endpointPublicAccess"
          :disabled="!isNewOrUnprovisioned"
          :mode="mode"
          label-key="ack.networking.endpointPublicAccess.label"
          data-testid="ack-networking-endpointPublicAccess"
        />
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>