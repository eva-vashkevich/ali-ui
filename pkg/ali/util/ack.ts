import { addParams, QueryParams } from '@shell/utils/url';
import { Store } from 'vuex';

async function getACKOptions(
  store: any,
  alibabaCredentialSecret: string,
  regionId: string | null,
  resource: string,
  clusterId?: string,
  extra?: object
): Promise<any> {
  if (!alibabaCredentialSecret) {
    return null;
  }

  let params: QueryParams = {
    cloudCredentialId: alibabaCredentialSecret,
    acceptLanguage: "en-US",
    regionId: "us-east-1",
  };

  if (!!regionId) {
    params.regionId = regionId;
  }
  if (!!clusterId) {
    params.clusterId = clusterId;
  }
  if (!!extra) {
    params = { ...params, ...extra };
  }

  const url = addParams(`/meta/${resource}`, params);

  return store.dispatch("cluster/request", { url });
}

export async function getAlibabaRegions(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId?: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaRegions"
  );
}

export async function getAlibabaKubernetesVersions(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId: string,
  isEdit: boolean
): Promise<any> {
  const extra: any = { clusterType: "ManagedKubernetes", mode: "supported" }; //TODO change once I know more
  if (isEdit) {
    extra.getUpgradableVersions = true;
  }
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaKubernetesVersions",
    "",
    extra
  );
}

export async function getAlibabaClusters(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId?: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaClusters"
  );
}

export async function getAlibabaInstanceTypes(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId?: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaInstanceTypes"
  );
}

export async function getAlibabaKeyPairs(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId?: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaKeyPairs"
  );
}

export async function getAlibabaResourceGroups(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId?: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaResourceGroups"
  );
}

export async function getAlibabaVpcs(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId: string,
  resourceGroupId?: string
): Promise<any> {
  const extra = !resourceGroupId ? {} : { resourceGroupId };
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaVpcs",
    "",
    extra
  );
}

export async function getAlibabaZones(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId: string
): Promise<any> {
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaZones"
  );
}

export async function getAlibabaVSwitches(
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId: string,
  vpcId?: string,
  resourceGroupId?: string
): Promise<any> {
  const extra: any = {};
  if (!!vpcId) {
    extra.vpcId = vpcId;
  }
  if (!!resourceGroupId) {
    extra.resourceGroupId = resourceGroupId;
  }
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaVSwitches",
    "",
    extra
  );
}

export async function getAlibabaImageTypes( //TBD
  store: Store<any>,
  alibabaCredentialSecret: string,
  regionId: string
): Promise<any> {
  const extra = { destinationResource: "ImageType" };
  return getACKOptions(
    store,
    alibabaCredentialSecret,
    regionId,
    "alibabaAvailableResources",
    "",
    extra
  );
}
