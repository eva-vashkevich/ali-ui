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
      fvFormRuleSets: [
        { path: 'decodedData.accessKeyId', rules: ['required'] },
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
    //  TODO: once backend is done, check if this is enough or if we should check for something else,
    //  because right now this can give false positivies

    async test() {
      try {
        await this.$store.dispatch('management/request', {
          url:                  '/meta/alibabaCheckCredentials',
          method:               'POST',
          data:                 {
            accessKeyId:      this.value.decodedData.accessKeyId,
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
      :value="value.decodedData.accessKeyId"
      label-key="ali.cloudcredential.accessKeyID.label"
      placeholder-key="ali.cloudcredential.accessKeyID.placeholder"
      type="text"
      :rules="fvGetAndReportPathRules('decodedData.accessKeyId')"
      :mode="mode"
      :required="true"
      data-testid="access-key"
      @update:value="$emit('valueChanged', 'accessKeyId', $event)"
    />
    <LabeledInput
      :value="value.decodedData.accessKeySecret"
      class="mt-20"
      label-key="ali.cloudcredential.accessKeySecret.label"
      placeholder-key="ali.cloudcredential.accessKeySecret.placeholder"
      type="password"
      :rules="fvGetAndReportPathRules('decodedData.accessKeySecret')"
      :mode="mode"
      :required="true"
      data-testid="secret-key"
      @update:value="$emit('valueChanged', 'accessKeySecret', $event)"
    />
  </div>
</template>
