import { addParams, QueryParams } from '@shell/utils/url';
import { Store } from 'vuex';

async function getACKOptions(store: any, alibabaCredentialSecret: string, resourceLocation: string | null, resource: string, clusterId?: string) :Promise<any> {
    if (!alibabaCredentialSecret) {
      return null;
    }
  
    const params: QueryParams = { cloudCredentialId: alibabaCredentialSecret, acceptLanguage:	'en-US' };
  
    if (!!resourceLocation) {
      params.region = resourceLocation;
    }
    if (!!clusterId) {
      params.clusterId = clusterId;
    }
  
    const url = addParams(`/meta/${ resource }`, params );
  
    return store.dispatch('cluster/request', { url });
  }
export async function getACKRegions(store: Store<any>, alibabaCredentialSecret: string, clusterId?: string) :Promise<any> {
    return getACKOptions(store, alibabaCredentialSecret, '', 'alibabaRegions' );
  }