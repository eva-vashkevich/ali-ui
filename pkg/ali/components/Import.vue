<script>
import { _EDIT } from '@shell/config/query-params';
import debounce from 'lodash/debounce';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';

export default {
  name: 'ImportACK',

  emits: ['update:clusterName', 'error', 'update:enableNetworkPolicy'],

  components: {
    LabeledSelect, LabeledInput
  },

  props: {
    mode: {
      type:    String,
      default: _EDIT
    },

    // name of cluster to be imported
    // this wont necessarily align with normanCluster.name as it would w/ provisioning
    clusterName: {
      type:    String,
      default: ''
    },

    credential: {
      type:    String,
      default: null
    },

    region: {
      type:    String,
      default: ''
    },

    enableNetworkPolicy: {
      type:    Boolean,
      default: false
    },

    rules: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  created() {
    this.debouncedlistAckClusters = debounce(this.listAckClusters, 200);
    this.debouncedlistAckClusters();
  },

  data() {
    return { loadingClusters: false, clusters: [] };
  },

  watch: {
    region() {
      this.debouncedlistAckClusters();
    },
    cloudCredentialId() {
      this.debouncedlistAckClusters();
    }
  },

  methods: {

    async listAckClusters() {
      if (!this.region || !this.credential) {
        return;
      }
      this.loadingClusters = true;
      try {
        // const aliClient = await this.$store.dispatch('aws/eks', { region: this.region, cloudCredentialId: this.credential });

        // const res = await aliClient.listClusters({});
        // const clusters = res?.clusters;

        // if (!clusters) {
        //   return;
        // }

        // this.clusters = res?.clusters;
      } catch (err) {
        this.$emit('error', err);
      }

      this.loadingClusters = false;
    }
  }
};
</script>

<template>
  <div class="row mb-10 align-center">
    <div class="col span-6">
      <LabeledSelect
        v-if="clusters.length"
        :loading="loadingClusters"
        :mode="mode"
        :value="clusterName"
        :options="clusters"
        label-key="ali.import.label"
        :rules="rules.displayName"
        @selecting="$emit('update:clusterName', $event)"
      />
      <LabeledInput
        v-else
        label-key="ali.import.label"
        :value="clusterName"
        :rules="rules.displayName"
        @update:value="$emit('update:clusterName', $event)"
      />
    </div>
  </div>
</template>
