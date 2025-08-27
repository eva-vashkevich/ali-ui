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
import Import from './Import.vue';
import ACKConfig from './Config.vue';
import ClusterMembershipEditor, { canViewClusterMembershipEditor } from '@shell/components/form/Members/ClusterMembershipEditor.vue';

import cloneDeep from 'lodash/cloneDeep';
import { NORMAN } from '@shell/config/types';
import {
  getACKRegions
} from '../util/ack';

const DEFAULT_REGION = 'eastus';

const importedDefaultAckConfig = {
  clusterName:      '',
  imported:         true,
  resourceGroup:    '',
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
    ACKConfig,
    Import
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    // provisioning cluster object
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },
  data() {
    return { config: { } as any,
    normanCluster:    { name: '' } as any,
    membershipUpdate: {} as any,
    configIsValid:          true,
    loadingLocations: false,
    originalVersion:  '',
    configUnreportedErrors: [],
    locationOptions: [] as string[],
    };
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
      }
    }
    },
    watch: {

    'config.alibabaCredentialSecret'(neu) {
        if (neu) {
            this.getLocations();
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
        const res = await getACKRegions(this.$store, alibabaCredentialSecret);
    } catch (err: any) {
        this.loadingLocations = false;
        const parsedError = err.error || '';
        const errors = this.errors as Array<string>;

        errors.push(this.t('aks.errors.regions', { e: parsedError || err }));
      }

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
    setClusterName(name: string): void {
      this.normanCluster['name'] = name;

      if (!this.isImport) {
        this.config['clusterName'] = name;
      }
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
      <div class="row mb-10">
        <div
          class="col"
          :class="{'span-6': isImport, 'span-4': !isImport}"
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
          class="col"
          :class="{'span-6': isImport, 'span-4': !isImport}"
        >
          <LabeledInput
            v-model:value="normanCluster.description"
            :mode="mode"
            label-key="nameNsDescription.description.label"
            :placeholder="t('nameNsDescription.description.placeholder')"
          />
        </div>
        <div
          v-if="!isImport"
          class="col span-4"
        >
          <LabeledSelect
            v-model:value="config.regionId"
            data-testid="cruack-regionId"
            :mode="mode"
            :options="locationOptions"
            option-label="displayName"
            option-key="name"
            label-key="ack.location.label"
            :reduce="opt=>opt.name"
            :loading="loadingLocations"
            required
            :disabled="!isNewOrUnprovisioned"
          />
        </div>
      </div>
      <Import
        v-if="isImport"
        :cluster-name="config.clusterName"
        :region="config.regionId"
        :credential="config.alibabaCredentialSecret"
        :rules="{clusterName: fvGetAndReportPathRules('clusterName')}"
        :mode="mode"
        data-testid="cruack-import"
        @error="e=>errors.push(e)"
      />
      <ACKConfig
        v-else
        v-model:config="config"
        v-model:config-unreported-errors="configUnreportedErrors"
        v-model:config-is-valid="configIsValid"
        :value="value"
        :mode="mode"
        :original-version="originalVersion"
        :is-new-or-unprovisioned="isNewOrUnprovisioned"
      />
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
