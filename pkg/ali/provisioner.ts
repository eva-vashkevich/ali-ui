import { IClusterProvisioner, ClusterProvisionerContext } from '@shell/core/types';
import CruACK from './components/CruACK.vue';
import CloudCredentialAck from './cloud-credential/ack.vue'
import { mapDriver } from '@shell/store/plugins';
import type { Component } from 'vue';
import { MANAGEMENT } from '@shell/config/types';

export class ACKProvisioner implements IClusterProvisioner {
  static ID = 'alibaba'

  constructor(private context: ClusterProvisionerContext) {
    mapDriver(this.id, 'alibaba' );
  }

  get id(): string {
    return ACKProvisioner.ID;
  }

  get icon(): any {
    return require('./icon.png');
  }

  get image(): any {
    return require('./icon.png');
  }

  get group(): string {
    return 'kontainer';
  }

  get label(): string {
    return this.context.t('ali.label');
  }

  get component(): Component {
    return CruACK;
  }

  get cloudCredential(): Component{
    return CloudCredentialAck;
  }

  get hidden(): boolean {
    return false;
  }

  get providesCredential(): boolean {
    return true;
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
