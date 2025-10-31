<script lang='ts'>
import { defineComponent, PropType } from 'vue';
import { mapGetters } from 'vuex';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import UnitInput from '@shell/components/form/UnitInput.vue';
import Banner from '@components/Banner/Banner.vue';
import ArrayListOrdered from './ArrayListOrdered.vue';
import { _CREATE, _EDIT, _VIEW } from '@shell/config/query-params';
import { getAlibabaInstanceTypes} from '../util/ack';
import throttle from 'lodash/throttle';
import SortableTable from '@shell/components/SortableTable';

const STATUS_AVAILABLE = 'Available';
const INSTANCE_TYPE = 'InstanceType';
const WITH_STOCK = 'WithStock';
const WITHOUT_STOCK = 'WithoutStock';


export default defineComponent({
  name: 'InstanceType',

  emits: ['update:value', 'error'],

  components: {
    LabeledSelect,
    LabeledInput,
    Checkbox,
    UnitInput,
    Banner,
    SortableTable,
    ArrayListOrdered
  },

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    value: {
      type:    Array,
      required: true
    },
    config: {
      type:     Object,
      required: true
    },
    isNewOrUnprovisioned: {
      type:    Boolean,
      default: true
    },
    loadingInstanceTypes: {
      type:    Boolean,
      default: false
    },
    allInstanceTypes: {
      type:   Object,
      default: () => {}
    },
    zones:{
      type:   Object,
      default: () => new Set()
    },
  },

  data() {
    console.log(this.zones)
     return {
        cpu: undefined,
        memory: undefined,
        //loadingInstanceTypes: false,
        instanceTypeOptions: [],
        //allInstanceTypes:        {},
    };
  },
  created() {
    this.throttledGetInstanceTypes = throttle(this.getInstanceTypes, 1000);
    this.getInstanceTypes();
  },

  watch: {
    zones() {
      this.getInstanceTypes();
    },
    cpu() {
      this.getInstanceTypes();
    },
    memory() {
      this.getInstanceTypes();
    },
    allInstanceTypes() {
      this.getInstanceTypes();
    }
  },
  computed: {
    ...mapGetters({ t: 'i18n/t' }),
    instanceTypeColumns(){
      return [
        {
          name: 'selected',
          label: ' ',
          width: 40,
          align: 'center',
        },
        {  
          name:     'instanceFamily',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.instanceFamily',
          value:    `instanceFamily`,
          sort:     `instanceFamily`,
          search:   `instanceFamily`,
        },{
          name:     'instanceType',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.instanceType',
          value:    `instanceType`,
        },{
          name:     'vcpus',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.vcpus',
          value:    `vcpus`,
          sort:     `vcpus`,
          search:   `vcpus`,
        },{
          name:     'memory',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.memory',
          value:    `memory`,
          sort:     `memory`,
          search:   `memory`,
        },{
          name:     'stock',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.stock',
          value:    `stock`,
          sort:     `stock`,
          search:   `stock`,
        }, {
          name:     'zones',
          labelKey: 'ack.nodePool.instanceTypes.table.columns.zones',
          value:    `zones`,
          sort:     `zones`,
          search:   `zones`,
        }
      ];
    },
    instanceTypes: {
      get() {
        return this.value;
      },
      set(neu: string[]) {
        this.$emit('update:value', neu);
      }
    }
  },
  methods: {
    toggleInstanceType(instanceType: string, add: boolean) {
      const isSelected = this.instanceTypes.includes(instanceType);

      if (add && !isSelected) {
        this.instanceTypes = [...this.instanceTypes, instanceType];
      } else if (!add && isSelected) {
        this.instanceTypes = this.instanceTypes.filter(t => t !== instanceType);
      }
    },
    formatInstanceTypesForTable(resources: any) {
      const typesDictionary = {};
      console.log(this.config)
      const availableZones = resources?.AvailableZones?.AvailableZone||[];
      console.log(availableZones);
      availableZones.forEach((zone: any) => {
        if(zone.ZoneId && this.zones.has(zone.ZoneId) && zone.Status === STATUS_AVAILABLE){
          const availableResources = zone.AvailableResources?.AvailableResource;
          availableResources.forEach((resource: any) => {
            if (resource.Type === INSTANCE_TYPE){
              const instanceTypes = resource.SupportedResources?.SupportedResource;
              
              instanceTypes.forEach((type: any) => {
                if(type.StatusCategory === WITH_STOCK || type.StatusCategory === WITHOUT_STOCK){
                  const typeValue = type.Value;
                  if(typesDictionary[typeValue]){
                    typesDictionary[typeValue].zones.push(zone.ZoneId);
                  } else {
                    if(this.allInstanceTypes[typeValue]){
                      const fromAll: any = this.allInstanceTypes[typeValue];
                      typesDictionary[typeValue] = {
                        instanceFamily: fromAll.instanceTypeFamily,
                        vcpus: fromAll.cpu,
                        memory: fromAll.memory,
                        stock: type.StatusCategory,
                        zones: [zone.ZoneId]
                      };
                    } else {
                      const typeSplit = typeValue.split('.');
                      const family = `${typeSplit[0]}.${typeSplit[1]}`;
                      typesDictionary[typeValue] = {
                        instanceFamily: family,
                        vcpus: '-',
                        memory: '-',
                        stock: type.StatusCategory,
                        zones: [zone.ZoneId]
                      }
                    }
                }
                }
              });
            }
          })
        }
      });
      const formatted = Object.entries(typesDictionary).map(([key, val]) => {
        (val as any).instanceType = key;
        return val
      });
      return formatted  as any;
    },

    async getInstanceTypes(): Promise<void> { 
      if (!this.isNewOrUnprovisioned) {
        return;
      }
      const { alibabaCredentialSecret, regionId } = this.config;
      try {
        this.instanceTypeOptions = [];
        const res = await getAlibabaInstanceTypes(this.$store, alibabaCredentialSecret, regionId,  this.cpu, this.memory);
        const formatted = this.formatInstanceTypesForTable(res)
        this.instanceTypeOptions = formatted; 
      } catch (err: any) {
          const parsedError = err.error || '';
          this.$emit('error', this.t('ack.errors.instanceTypes', { e: parsedError || err }));
      }
    },
  }
});
</script>
<template>
  <p class="mb-10">{{ t('ack.nodePool.instanceTypes.title')}}</p>

    <SortableTable
      v-if="isNewOrUnprovisioned"
      :loading="loadingInstanceTypes"
      :rows="instanceTypeOptions"
      :headers="instanceTypeColumns"
      :table-actions="false"
      :row-actions="false"
      :rows-per-page="10"
      :paging="true"
      key-field="instanceType"
      
      class="mb-30"
      >
      <template #header-left>
        <div class="row">
          <div class="col span-3">
            <UnitInput
              v-model:value="cpu"
              :mode="mode"
              placeholder-key="ack.nodePool.instanceTypes.cpu.label"
              suffix="vCPU"
              type="number"
            />
          </div>
          <div class="col span-3">
            <UnitInput
              v-model:value="memory"
              type="number"
              :mode="mode"
              placeholder-key="ack.nodePool.instanceTypes.memory.label"
              suffix="GiB"
            />
          </div>
        </div>
      </template>
      <template #cell:selected="{ row }">
        <Checkbox
          :value="instanceTypes.includes(row.instanceType)"
          @update:value="toggleInstanceType(row.instanceType, $event)"
        />
      </template>
    </SortableTable>

    <p class="mb-10">{{ t('ack.nodePool.instanceTypes.banner')}}</p>
    <div class="row">
      <ArrayListOrdered
        v-model:value="instanceTypes"
        :mode="mode"
        :disabled="!isNewOrUnprovisioned"
        class="col span-4"
      />
    </div>
   
</template>
