import * as pb from '../../proto/xudp2p_pb';
import { removeUndefinedProps, convertKvpArrayToKvps, setObjectToMap } from '../../utils/utils';
import { NodeState } from '../types';

export const validateNodeState = (nodeState?: pb.NodeState.AsObject) => {
  // TODO: validate that pairsList does not contain duplicates
  return !!(nodeState
    && nodeState.pairsList
    && nodeState.lndPubKeysMap
    && nodeState.tokenIdentifiersMap
    && nodeState.lndUrisMap
    && nodeState.addressesList.every(addr => !!addr.host)
  );
};

export const convertNodeState = (nodeState: pb.NodeState.AsObject) => {
  const convertedNodeState = removeUndefinedProps({
    pairs: nodeState.pairsList,
    addresses: nodeState.addressesList,
    raidenAddress: nodeState.raidenAddress,
    lndPubKeys: convertKvpArrayToKvps(nodeState.lndPubKeysMap),
    lndUris: convertLndUris(nodeState.lndUrisMap),
    tokenIdentifiers: convertKvpArrayToKvps(nodeState.tokenIdentifiersMap),
  });
  console.log('convertedNodeState', convertedNodeState);
  return convertNodeState;
};

const convertLndUris = <T>(kvpArray: [string, T][]): { [key: string]: T } => {
  const kvps: { [key: string]: T } = {};
  kvpArray.forEach((kvp) => {
    // @ts-ignore
    kvps[kvp[0]] = kvp[1].lndUriList;
  });

  return kvps;
};

const setLndUrisMap = (obj: any, map: { set: (key: string, value: any) => any }) => {
  for (const key in obj) {
    if (obj[key] !== undefined) {
      const lndUris = new pb.LndUris();
      lndUris.setLndUriList(obj[key]);
      map.set(key, lndUris);
    }
  }
};

export const serializeNodeState = (nodeState: NodeState): pb.NodeState => {
  const pbNodeState = new pb.NodeState();
  pbNodeState.setPairsList(nodeState.pairs);
  pbNodeState.setAddressesList(nodeState.addresses.map((addr) => {
    const pbAddr = new pb.Address();
    pbAddr.setHost(addr.host);
    pbAddr.setPort(addr.port);
    return pbAddr;
  }));
  pbNodeState.setRaidenAddress(nodeState.raidenAddress);
  if (nodeState.lndPubKeys) {
    setObjectToMap(nodeState.lndPubKeys, pbNodeState.getLndPubKeysMap());
  }
  if (nodeState.lndUris) {
    setLndUrisMap(nodeState.lndUris, pbNodeState.getLndUrisMap());
  }
  if (nodeState.tokenIdentifiers) {
    setObjectToMap(nodeState.tokenIdentifiers, pbNodeState.getTokenIdentifiersMap());
  }
  console.log('serializedNodeState', pbNodeState);
  return pbNodeState;
};
