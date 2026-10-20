import type {Kind} from './rules.js';
import type {HubSave,LootReward} from './store.js';
export type Peer={id:string;name:string;avatar:Kind;profileId?:string;characterId?:string;frameId?:string;online:boolean};
export type Invitation={id:string;from:Peer;code:string;roomName:string;expiresAt:number};
export type CommunityView={superUser?:boolean;rankGames?:number;friends:Peer[];incoming:Peer[];outgoing:string[];invites:Invitation[];store:HubSave};
export type StoreResult={source?:'box'|'redeem';box?:string;requestId:string;rewards:LootReward[]};

export type RankedPeer={id:string;name:string;avatar:Kind;profileId?:string;characterId?:string;frameId?:string;rating:number};
