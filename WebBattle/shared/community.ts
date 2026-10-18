import type {Kind} from './rules.js';
import type {HubSave,LootReward} from './store.js';
export type Peer={id:string;name:string;avatar:Kind;online:boolean};
export type Invitation={id:string;from:Peer;code:string;roomName:string;expiresAt:number};
export type CommunityView={friends:Peer[];incoming:Peer[];outgoing:string[];invites:Invitation[];store:HubSave};
export type StoreResult={requestId:string;rewards:LootReward[]};
