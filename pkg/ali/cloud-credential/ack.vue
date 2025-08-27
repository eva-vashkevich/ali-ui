<script>
import { defineComponent } from 'vue';
import Loading from '@shell/components/Loading';
import CreateEditView from '@shell/mixins/create-edit-view';
import { LabeledInput } from '@components/Form/LabeledInput';
import FormValidation from '@shell/mixins/form-validation';

export default defineComponent({
  emits: ['validationChanged', 'valueChanged'],
  name:       'CloudCredentialAck',

  components: { Loading, LabeledInput },
  mixins:     [CreateEditView, FormValidation],

  data() {
    return {
      knownRegions:   null,
      fvFormRuleSets: [
        { path: 'decodedData.accessKeyID', rules: ['required'] },
        { path: 'decodedData.accessKeySecret', rules: ['required'] },
      ]
    };
  },

  watch: {
    fvFormIsValid(newValue) {
      this.$emit('validationChanged', !!newValue);
    }
  },

  methods: {
    async test() {
      try {
        await this.$store.dispatch('management/request', {
          url:                  '/meta/alibabaCheckCredentials',
          method:               'POST',
          data:                 {
            accessKeyID:      this.value.decodedData.accessKeyID,
            accessKeySecret:      this.value.decodedData.accessKeySecret,
            acceptLanguage:  'en-US'
          },
          redirectUnauthorized: false,
        });

        return true;
      } catch (e) {
        return false;
      }
    }

  }
});
</script>

<template>
  <Loading
    v-if="$fetchState.pending"
    :delayed="true"
  />
  <div v-else>
    <LabeledInput
      :value="value.decodedData.accessKeyID"
      label-key="cluster.credential.aws.accessKey.label"
      placeholder-key="cluster.credential.aws.accessKey.placeholder"
      type="text"
      :rules="fvGetAndReportPathRules('decodedData.accessKey')"
      :mode="mode"
      :required="true"
      data-testid="access-key"
      @update:value="$emit('valueChanged', 'accessKeyID', $event)"
    />
    <LabeledInput
      :value="value.decodedData.accessKeySecret"
      class="mt-20"
      label-key="cluster.credential.aws.secretKey.label"
      placeholder-key="cluster.credential.aws.secretKey.placeholder"
      type="password"
      :rules="fvGetAndReportPathRules('decodedData.secretKey')"
      :mode="mode"
      :required="true"
      data-testid="secret-key"
      @update:value="$emit('valueChanged', 'accessKeySecret', $event)"
    />
  </div>
</template>
