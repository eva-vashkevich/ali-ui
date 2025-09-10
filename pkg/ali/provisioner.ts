import { IClusterProvisioner, ClusterProvisionerContext } from '@shell/core/types';
import CruACK from './components/CruACK.vue';
import { mapDriver } from '@shell/store/plugins';
import type { Component } from 'vue';

export class ACKProvisioner implements IClusterProvisioner {
  static ID = 'alibaba'

  constructor(private context: ClusterProvisionerContext) {
    mapDriver(this.id, 'alibaba' );
  }

  get id(): string {
    return ACKProvisioner.ID;
  }

  get icon(): any {
    return require('./icon.svg');
  }

  get image(): any {
    return require('./icon.svg');
  }

  get group(): string {
    return 'kontainer';
  }

  get label(): string {
    return this.context.t('ali.label');
  }

  get hidden(): boolean {
    return false;
  }

  get detailTabs(): any {
    return {
      machines:     false,
      logs:         false,
      registration: false,
      snapshots:    false,
      related:      true,
      events:       false,
      conditions:   false,
    };
  }

  get showImport(): boolean {
    return true;
  }
}
