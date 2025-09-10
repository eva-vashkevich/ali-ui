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
  getAlibabaKubernetesVersions
} from '../util/ack';
import { sortable } from '@shell/utils/version';
import { sortBy } from '@shell/utils/sort';
import { MANAGEMENT } from '@shell/config/types';
import { SETTING } from '@shell/config/settings';

export default defineComponent({
  name: 'Basics',

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
      loadingVersions: false,
      allVersions: [],
      fvFormRuleSets:         [],
    };
  },

  computed: {
    ...mapGetters({ t: 'i18n/t' }),

    fvExtraRules() {
      return {};
    },
    // filter out versions outside ui-k8s-supported-versions-range global setting and versions < current version
    // sort versions, descending
    versionOptions(): { value: string, label: string, sort?: string, disabled?: boolean }[] {
      const validVersions = this.allVersions.reduce((versions, version: string) => {
        //const version = v?.version;
        const coerced = semver.coerce(version);

        if (!coerced || (this.supportedVersionRange && !semver.satisfies(coerced.version, this.supportedVersionRange))) {
          return versions;
        }

        if (!this.originalVersion) {
          versions.push({ value: version, label: version });
        } 

        return versions;
      }, [] as { value: string, label: string }[]);

      validVersions.forEach((v) => {
        v.sort = sortable(v.value);
      });

      const sorted = sortBy(validVersions, 'sort', true); // Descending order

      if (!this.config.kubernetesVersion) {
        const firstValid = sorted.find((v) => !v.disabled);

        this.config.kubernetesVersion = firstValid?.value;
      }

      return sorted;
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
          this.getVersions();
          //this.getVmSizes();
          //this.getVirtualNetworks();
        }
      },
      immediate: true
    },
    
  },

  methods: {
    async getVersions(): Promise<void> { 
        if (!this.isNewOrUnprovisioned) {
        return;
      }
      this.loadingVersions = true;

      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        const res = await getAlibabaKubernetesVersions(this.$store, alibabaCredentialSecret, regionId, this.isEdit );

        this.allVersions = res.map((v: any) =>v.version)
        this.loadingVersions = false;
      } catch (err: any) {
          this.loadingVersions = false;
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.errors.versions', { e: parsedError || err }));
      }

    },

  },

});
</script>

<template>
  <div
    class="mt-10"
    data-testid="cruack-basics"
  >
    <div
      class="row mb-10 "
    >
      <div
        class="col span-3"
      >
        <LabeledSelect
          v-model:value="config.kubernetesVersion"
          data-testid="cruack-kubernetesversion"
          :mode="mode"
          :options="versionOptions"
          label-key="ack.kubernetesVersion.label"
          option-key="value"
          option-label="label"
          :loading="loadingVersions"
          required
          :rules="fvGetAndReportPathRules('kubernetesVersion')"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

</style>