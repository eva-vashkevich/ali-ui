<script>
import { ref, watch, computed } from 'vue';
import debounce from 'lodash/debounce';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { removeAt } from '@shell/utils/array';
import { TextAreaAutoGrow } from '@components/Form/TextArea';
import { clone } from '@shell/utils/object';
import { LabeledInput } from '@components/Form/LabeledInput';
import Tag from '@shell/components/Tag';
const DEFAULT_PROTIP = 'Tip: Paste lines into any list field for easy bulk entry';

export default {
  emits: ['add', 'remove', 'update:value'],

  components: { Tag },
  props:      {
    value: {
      type:    Array,
      default: null,
    },
    mode: {
      type:    String,
      default: _EDIT,
    },
    initialEmptyRow: {
      type:    Boolean,
      default: false,
    },
    title: {
      type:    String,
      default: ''
    },
    protip: {
      type:    [String, Boolean],
      default: DEFAULT_PROTIP,
    },
    showHeader: {
      type:    Boolean,
      default: false,
    },
    valueLabel: {
      type:    String,
      default: 'Value',
    },
    valuePlaceholder: {
      type:    String,
      default: 'e.g. bar'
    },
    valueMultiline: {
      type:    Boolean,
      default: false,
    },
    addClass: {
      type:    String,
      default: '',
    },
    addIcon: {
      type:    String,
      default: '',
    },
    addLabel: {
      type:    String,
      default: '',
    },
    addAllowed: {
      type:    Boolean,
      default: true,
    },
    addDisabled: {
      type:    Boolean,
      default: false,
    },
    removeLabel: {
      type:    String,
      default: '',
    },
    removeAllowed: {
      type:    Boolean,
      default: true,
    },
    defaultAddValue: {
      type:    [String, Number, Object, Array],
      default: ''
    },
    loading: {
      type:    Boolean,
      default: false
    },
    disabled: {
      type:    Boolean,
      default: false,
    },
    required: {
      type:    Boolean,
      default: false
    },
    rules: {
      default:   () => [],
      type:      Array,
      // we only want functions in the rules array
      validator: (rules) => rules.every((rule) => ['function'].includes(typeof rule))
    },
    a11yLabel: {
      type:    String,
      default: '',
    },
    componentTestid: {
      type:    String,
      default: 'array-list',
    }
  },

  setup(props, { emit }) {
    const input = (Array.isArray(props.value) ? props.value : []).slice();
    const rows = ref([]);

    for ( const value of input ) {
      rows.value.push({ value });
    }
    if ( !rows.value.length && props.initialEmptyRow ) {
      const value = props.defaultAddValue ? clone(props.defaultAddValue) : '';

      rows.value.push({ value });
    }

    const isView = computed(() => {
      return props.mode === _VIEW;
    });

    /**
     * Cleanup rows and emit input
     */
    const update = () => {
      if ( isView.value ) {
        return;
      }
      const out = [];

      for ( const row of rows.value ) {
        const trim = !props.valueMultiline && (typeof row.value === 'string');
        const value = trim ? row.value.trim() : row.value;

        if ( typeof value !== 'undefined' ) {
          out.push(value);
        }
      }
      emit('update:value', out);
    };

    const lastUpdateWasFromValue = ref(false);
    const queueUpdate = debounce(update, 50);

    watch(
      rows,
      () => {
        // lastUpdateWasFromValue is used to break a cycle where when rows are updated
        // this was called which then forced rows to updated again
        if (!lastUpdateWasFromValue.value) {
          queueUpdate();
        }
        lastUpdateWasFromValue.value = false;
      },
      { deep: true }
    );

    watch(
      () => props.value,
      () => {
        lastUpdateWasFromValue.value = true;
        rows.value = (props.value || []).map((v) => ({ value: v }));
      },
      { deep: true }
    );

    return {
      rows,
      lastUpdateWasFromValue,
      queueUpdate,
      isView,
      update,
    };
  },

  computed: {},
  created() {
  },
  methods: {
    /**
     * Remove item and emits removed row and its own index value
     */
    remove(row, index) {
      this.$emit('remove', { row, index });
      removeAt(this.rows, index);
      this.queueUpdate();
    },
    moveUp(row, index) {
      if (index > 0) {
        const element = this.rows[index];

        this.rows.splice(index, 1);
        this.rows.splice(index - 1, 0, element);

        this.queueUpdate();
      }
    },
    moveDown(row, index) {
      if (index < this.rows.length - 1) {
        const element = this.rows[index];

        this.rows.splice(index, 1);
        this.rows.splice(index + 1, 0, element);

        this.queueUpdate();
      }
    },

  },
};
</script>

<template>
  <div
    class="array-list-ordered-main-container"
    role="group"
    :aria-label="title || t('generic.ariaLabel.arrayList')"
  >
    <div>
      <template v-if="rows.length">
        <div
          v-for="(row, idx) in rows"
          :key="idx"
          :data-testid="`${componentTestid}-box${ idx }`"
          class="box"
          :class="{'hide-remove-is-view': isView}"
          role="group"
        >
          <slot
            name="columns"
            :queueUpdate="queueUpdate"
            :i="idx"
            :rows="rows"
            :row="row"
            :mode="mode"
            :isView="isView"
          >
            <div class="value">
              <slot
                name="value"
                :row="row"
                :mode="mode"
                :isView="isView"
                :queue-update="queueUpdate"
              >
                <Tag
                  :key="idx"
                  class=""
                >
                  <span class="ml-10">{{ row.value }}</span>
                  <!-- <div > -->
                  <button
                    v-if="!isView"
                    type="button"
                    :disabled="isView"
                    class="btn icon-x"
                    :data-testid="`${componentTestid}-remove-item-${idx}`"
                    :aria-label="t('generic.ariaLabel.remove', {index: idx+1})"
                    role="button"
                    @click="remove(row, idx)"
                  />
                  <!-- </div> -->
                </Tag>
              </slot>
            </div>
          </slot>
          <div class="row bttns ml-10">
            <button
              type="button"
              :disabled="isView"
              class="btn role-tertiary bttn mr-10"
              :style="{ visibility: idx !== 0 ? 'visible' : 'hidden' }"
              :data-testid="`${componentTestid}-move-up-item-${idx}`"
              :aria-label="t('generic.ariaLabel.moveUp', {index: idx+1})"
              role="button"
              @click="moveUp(row, idx)"
            >
              <i class="icon icon-chevron-up mr-5 ml-5" />{{ t('generic.moveUp') }}
            </button>
            <button
              type="button"
              :disabled="isView"
              class="btn role-tertiary bttn"
              :style="{ visibility: idx !== rows.length - 1 ? 'visible' : 'hidden' }"
              :data-testid="`${componentTestid}-move-down-item-${idx}`"
              :aria-label="t('generic.ariaLabel.moveDown', {index: idx+1})"
              role="button"
              @click="moveDown(row, idx)"
            >
              <i class="icon icon-chevron-down mr-5 ml-5" />{{ t('generic.moveDown') }}
            </button>
          </div>
        </div>
      </template>
      <div v-else>
        <slot name="empty">
          <div
            v-if="mode==='view'"
            class="text-muted"
          >
            &mdash;
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag{
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-right: 0px;
}
  .title {
    margin-bottom: 10px;
  }

  .required {
    color: var(--error);
  }

  .box {
    display: grid;
    grid-template-columns: auto $array-list-remove-margin;
    align-items: center;
    margin-bottom: 10px;
    .value {
      flex: 1;
      INPUT {
        height: $unlabeled-input-height;
      }
    }
  }

  .box.hide-remove-is-view {
    grid-template-columns: auto;
  }

  .bttns {
    text-align: right;
  }
  .bttn {
    background-color: var(--tag-bg);
    //padding: 0px 12px;
  }
  .footer {
    .protip {
      float: right;
      padding: 5px 0;
    }
  }

  .required {
    color: var(--error);
  }
</style>
