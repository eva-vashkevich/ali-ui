<script lang='ts'>
import { mapGetters, Store } from 'vuex';
import { defineComponent } from 'vue';
import Loading from '@shell/components/Loading.vue';
import CruResource from '@shell/components/CruResource.vue';
import SelectCredential from '@shell/edit/provisioning.cattle.io.cluster/SelectCredential.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Labels from '@shell/components/form/Labels.vue';
import Accordion from '@components/Accordion/Accordion.vue';
import Banner from '@components/Banner/Banner.vue';
import { _CREATE, _EDIT, _VIEW, _IMPORT } from '@shell/config/query-params';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import Tab from '@shell/components/Tabbed/Tab.vue';
import Tabbed from '@shell/components/Tabbed/index.vue';
import AgentConfiguration from '@shell/edit/provisioning.cattle.io.cluster/tabs/AgentConfiguration.vue';
import Import from './Import.vue';
import Basics from './Basics.vue';
import NodePool from './NodePool.vue';
import Networking from './Networking.vue';
import ClusterMembershipEditor, { canViewClusterMembershipEditor } from '@shell/components/form/Members/ClusterMembershipEditor.vue';
import cloneDeep from 'lodash/cloneDeep';
import { NORMAN } from '@shell/config/types';
import { removeObject } from '@shell/utils/array';
import { randomStr } from '@shell/utils/string';
import {
  getAlibabaRegions, getAlibabaInstanceTypes, getAlibabaImageTypes
} from '../util/ack';

const DEFAULT_REGION = 'us-east-1';

const importedDefaultAckConfig = {
  clusterName:    '', 
  clusterId:      '',
  imported:       true,
  clusterType:    'ManagedKubernetes', 
  regionId: DEFAULT_REGION,
};

export const defaultAckConfig = {
  clusterName:        '',
  imported:           false,
  tags:               {},
};

const defaultCluster = {
  labels:                  {},
  annotations:             {},
  "fleetAgentDeploymentCustomization": {
    "overrideAffinity": {},
    "appendTolerations": [],
    "overrideResourceRequirements": {}
  },
  "clusterAgentDeploymentCustomization": {
    "overrideAffinity": {},
    "appendTolerations": [],
    "overrideResourceRequirements": {}
  },

};

export const DEFAULT_NODE_GROUP_CONFIG = {
  name:'nodePool-0',
  instanceTypes: [
    "ecs.c7.xlarge",
    "ecs.c7a.xlarge"
  ],
  systemDiskCategory: "cloud_essd",
  systemDiskSize: 20,
  dataDisks: [
    {
      "category": "cloud_essd",
      "size": 40,
      "encrypted": "false"
    }
  ],
  desiredSize: 3,
  imageId: "aliyun_3_x64_20G_alibase_20241218.vhd",
  imageType: "AliyunLinux3",
  runtime: "containerd",
  runtimeVersion:"1.6.38",
  vswitchIds:  [],
  _isNewOrUnprovisioned:               true,
};

export default defineComponent({
  name:       'CruACK',
  emits:      ['validationChanged'],
  components: {
    SelectCredential,
    CruResource,
    LabeledSelect,
    LabeledInput,
    ClusterMembershipEditor,
    Labels,
    Accordion,
    Banner,
    Loading,
    Import,
    Basics,
    Networking,
    NodePool,
    Tabbed,
    Tab,
    AgentConfiguration
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },
  data() {
    return {
      config: { } as any,
      normanCluster:    { name: '' } as any,
      nodePools:        [],
      membershipUpdate: {} as any,
      configIsValid:          true,
      loadingLocations: false,
      originalVersion:  '',
      configUnreportedErrors: [],
      locationOptions: [] as string[],
      allInstanceTypes:        [],
      instanceTypeOptions:     [],
      imageTypeOptions: [],
      loadingInstanceTypes:    false,
      loadingImageTypes: false,
      fvFormRuleSets:  []
    };
  },

  created() {
    //const registerBeforeHook = this.registerBeforeHook as Function;
    const registerAfterHook = this.registerAfterHook as Function;

    // if (!this.isImport) {
    //   registerBeforeHook(this.removeUnchangedConfigFields);
    // }
    registerAfterHook(this.saveRoleBindings, 'save-role-bindings');
  },

  async fetch() {
    const store = this.$store as Store<any>;

    if (this.value.id) {
      const liveNormanCluster = await this.value.findNormanCluster();

      this.normanCluster = await store.dispatch(`rancher/clone`, { resource: liveNormanCluster });

    } else {
        this.normanCluster = await store.dispatch('rancher/create', { type: NORMAN.CLUSTER, ...defaultCluster }, { root: true });

    }
    if (this.isImport) {
      this.normanCluster.aliConfig = cloneDeep(importedDefaultAckConfig);
      this.config = this.normanCluster.aliConfig;
    } else {
      
        if (!this.normanCluster.aliConfig) {
          this.normanCluster['aliConfig'] = { ...defaultAckConfig };
        if ((!this.config.nodePools || !this.config.nodePools.length) && this.mode === _CREATE) {
          this.config['nodePools'] = [{ ...DEFAULT_NODE_GROUP_CONFIG, nodepoolName: 'group1' }];
        }

        if (this.config.nodePools) {
          this.nodePools = this.config.nodePools;
        } else {
          this.config['nodePools'] = this.nodePools;
        }
      }
    }
    },
    watch: {
    'config.alibabaCredentialSecret'(neu) {
        if (neu) {
            this.getLocations();
        }
    },
    'config.regionId'(neu) {
        if (neu) {
            this.getInstanceTypes();
            this.getImageTypes();
        }
    },

    },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    CREATE(): string {
      return _CREATE;
    },

    VIEW(): string {
      return _VIEW;
    },

    isImport() {
        return this.$route?.query?.mode === _IMPORT;
    },
    isNewOrUnprovisioned() {
      return this.mode === _CREATE || !this.normanCluster?.aliStatus?.upstreamSpec;
    },
    hasCredential() {
      return !!this.config?.alibabaCredentialSecret;
    },
    canManageMembers(): Boolean {
      return canViewClusterMembershipEditor(this.$store);
    },
  },
  methods: {
    async getLocations(): Promise<void> { 
      if (!this.isNewOrUnprovisioned) {
        return;
      }
      this.loadingLocations = true;

      const { alibabaCredentialSecret } = this.config;
      try {
        const res = await getAlibabaRegions(this.$store, alibabaCredentialSecret);
        this.locationOptions = (res?.Regions?.Region||[]).map((r)=>{return {value: r.RegionId, label: `${r?.RegionId} - ${r.LocalName}`}});

        if (this.locationOptions.find((r: any) => r.value === DEFAULT_REGION)) {
            this.config.regionId = DEFAULT_REGION;
          } else {
            this.config.regionId = this.locationOptions[0]?.value;
          }
      } catch (err: any) {
          
          const parsedError = err.error || '';
          const errors = this.errors as Array<string>;

          errors.push(this.t('ack.errors.regions', { e: parsedError || err }));
      }
      this.loadingLocations = false;

    },
    async getInstanceTypes(): Promise<void> { 
      if (!this.isNewOrUnprovisioned) {
        return;
      }
      this.loadingInstanceTypes = true;

      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        const res = await getAlibabaInstanceTypes(this.$store, alibabaCredentialSecret, regionId);
        this.instanceTypeOptions = (res?.InstanceTypes?.InstanceType||[]).map((type)=>{return {value: type.InstanceTypeId, label: `${type.InstanceTypeId}`}});
      } catch (err: any) {
          const parsedError = err.error || '';
          const errors = this.errors as Array<string>;

          errors.push(this.t('ack.errors.instanceTypes', { e: parsedError || err }));
      }
      this.loadingInstanceTypes = false;

    },
    async getImageTypes(): Promise<void> { 
      if (!this.isNewOrUnprovisioned) {
        return;
      }
      this.loadingImageTypes = true;

      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        //const res = await getAlibabaImageTypes(this.$store, alibabaCredentialSecret, regionId);
        //this.imageTypeOptions = (res?.InstanceTypes?.InstanceType||[]).map((type)=>{return {value: type.InstanceTypeId, label: `${type.InstanceTypeId}`}});
      } catch (err: any) {
          const parsedError = err.error || '';
          const errors = this.errors as Array<string>;

          errors.push(this.t('ack.errors.instanceTypes', { e: parsedError || err }));
      }
      this.loadingImageTypes = false;

    },
    cancelCredential(): void {
      if ( this.$refs.cruresource ) {
        (this.$refs.cruresource as any).emitOrRoute();
      }
    },
    onMembershipUpdate(update: any): void {
      this['membershipUpdate'] = update;
    },
    async saveRoleBindings(): Promise<void> {
      if (this.membershipUpdate.save) {
        await this.membershipUpdate.save(this.normanCluster.id);
      }
    },
    async actuallySave(): Promise<void> {
      this.normanCluster.aliConfig = this.config;

      console.log(this.normanCluster)

      await this.normanCluster.save();
      
      return await this.normanCluster.waitForCondition('InitialRolesPopulated');
    },
    setClusterName(name: string): void {
      this.normanCluster['name'] = name;

      if (!this.isImport) {
        this.config['clusterName'] = name;
      }
    },
    removePool(i: number) {
      const pool = this.nodePools[i];

      removeObject(this.nodePools, pool);
    },

    addPool() {
      const poolName = `nodePool-${ this.nodePools.length + 1 }`;
      const _id = randomStr();
      const neu = {
        ...cloneDeep(DEFAULT_NODE_GROUP_CONFIG), name: poolName, _id, _isNewOrUnprovisioned: true, version: this.config.kubernetesVersion
      };
      console.log(neu)

      this.nodePools.push(neu);

      this.$nextTick(() => {
        const pools = this.$refs.pools as any as typeof Tabbed;

        if ( pools && pools.select ) {
          pools.select(poolName);
        }
      });
    },
  }
});
</script>
<template>
  <Loading v-if="$fetchState.pending" />

  <CruResource
    v-else
    ref="cruresource"
    :resource="value"
    :mode="mode"
    :can-yaml="false"
    :done-route="doneRoute"
    :validation-passed="fvFormIsValid && configIsValid"
    @error="e=>errors=e"
    @finish="save"
  >
  <SelectCredential
      v-model:value="config.alibabaCredentialSecret"
      data-testid="cruack-select-credential"
      :mode="mode === VIEW ? VIEW : CREATE"
      provider="alibaba"
      :default-on-cancel="true"
      :showing-form="hasCredential"
      class="mt-20"
      :cancel="cancelCredential"
    />
    <div
      v-if="hasCredential"
      class="mt-10"
      data-testid="cruack-form"
    >
      <div class="row mb-20">
        <div
          class="col span-4"
        >
          <LabeledInput
            :value="normanCluster.name"
            :mode="mode"
            label-key="generic.name"
            required
            :rules="fvGetAndReportPathRules('name')"
            @update:value="setClusterName"
          />
        </div>
        <div
          class="col span-4"
        >
          <LabeledInput
            v-model:value="normanCluster.description"
            :mode="mode"
            label-key="nameNsDescription.description.label"
            :placeholder="t('nameNsDescription.description.placeholder')"
          />
        </div>
        <div
          class="col span-4"
        >
          <LabeledSelect
            v-model:value="config.regionId"
            data-testid="cruack-regionId"
            :mode="mode"
            :options="locationOptions"
            label-key="ack.location.label"
            :loading="loadingLocations"
            required
            :disabled="!isNewOrUnprovisioned"
          >
          </LabeledSelect>
        </div>
      </div>
      <Accordion
        v-if="isImport"
        :open-initially="true"
        class="mb-20"
        title-key="ack.accordions.cluster"
      >
        <Import
          v-model:cluster-name="config.clusterName"
          v-model:cluster-id="config.clusterId"
          :region="config.regionId"
          :credential="config.alibabaCredentialSecret"
          :rules="{clusterName: fvGetAndReportPathRules('clusterName')}"
          :mode="mode"
          data-testid="cruack-import"
          @error="e=>errors.push(e)"
        />
      </Accordion>
      <div  v-else>
        <div><h3>{{ t('ack.nodePools.title') }}</h3></div>
        <Tabbed
          ref="pools"
          class="mb-20"
          :side-tabs="true"
          :show-tabs-add-remove="mode !== VIEW"
          :use-hash="false"
          @removeTab="removePool($event)"
          @addTab="addPool()"
        >
          <Tab
            v-for="(pool, i) in nodePools"
            :key="i"
            :label="pool.name || t('ack.nodePools.unnamed')"
            :name="`${pool.name} ${i}`"
          >
          <NodePool
            :mode="mode"
            :region="config.regionId"
            :pool="pool"
            :instance-type-options="instanceTypeOptions"
            :loading-instance-types="loadingInstanceTypes"
          />
          </Tab>
        </Tabbed>
        <Accordion
          :open-initially="true"
          class="mb-20"
          title-key="ack.accordions.basics"
        >
          <Basics
            v-model:config="config"
            v-model:config-unreported-errors="configUnreportedErrors"
            v-model:config-is-valid="configIsValid"
            v-model:enable-network-policy="normanCluster.enableNetworkPolicy"
            :value="value"
            :mode="mode"
            :original-version="originalVersion"
            :is-new-or-unprovisioned="isNewOrUnprovisioned"
            @update:config="(neu) => { config = neu}"
            @error="e=>errors.push(e)"
          />
        </Accordion>
        <Accordion
          :open-initially="true"
          class="mb-20"
          title-key="ack.accordions.networking"
        >
          <Networking
            v-model:config="config"
            v-model:config-unreported-errors="configUnreportedErrors"
            v-model:config-is-valid="configIsValid"
            v-model:enable-network-policy="normanCluster.enableNetworkPolicy"
            :value="value"
            :mode="mode"
            :original-version="originalVersion"
            :is-new-or-unprovisioned="isNewOrUnprovisioned"
            @update:config="(neu) => { config = neu}"
            @error="e=>errors.push(e)"
          />
        </Accordion>
        <Accordion
          :open-initially="false"
          class="mb-20"
          title-key="cluster.agentConfig.tabs.cluster"
        >
        <AgentConfiguration
              v-model:value="normanCluster.clusterAgentDeploymentCustomization"
              data-testid="rke2-cluster-agent-config"
              type="cluster"
              :mode="mode"
              :scheduling-customization-feature-enabled=false
            />
        </Accordion>
        <Accordion
          :open-initially="false"
          class="mb-20"
          title-key="cluster.agentConfig.tabs.fleet"
        >
        <AgentConfiguration
              v-if="normanCluster.fleetAgentDeploymentCustomization"
              v-model:value="normanCluster.fleetAgentDeploymentCustomization"
              data-testid="rke2-fleet-agent-config"
              type="fleet"
              :mode="mode"
            />
        </Accordion>
      </div>
      <Accordion
        class="mb-20"
        title-key="members.memberRoles"
      >
        <Banner
          v-if="isEdit"
          color="info"
        >
          {{ t('cluster.memberRoles.removeMessage') }}
        </Banner>
        <ClusterMembershipEditor
          v-if="canManageMembers"
          :mode="mode"
          :parent-id="normanCluster.id ? normanCluster.id : null"
          @membership-update="onMembershipUpdate"
        />
      </Accordion>
      <Accordion
        class="mb-20"
        title-key="ack.accordions.labels"
      >
        <Labels
          v-model:value="normanCluster"
          :mode="mode"
        />
      </Accordion>
      
    </div>

    <template
      v-if="!hasCredential"
      #form-footer
    >
      <div><!-- Hide the outer footer --></div>
    </template>
  </CruResource>
</template>