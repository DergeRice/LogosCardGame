export const NICKNAME_PRICE=1500;
export type NicknameResult={requestId:string;ok:boolean;name?:string;coins?:number;guest?:boolean;message?:string};
export function cleanNickname(value:unknown){return typeof value==='string'?value.normalize('NFC').trim().replace(/ +/g,' '):'';}
export function validNickname(name:string){return name.length>=1&&name.length<=16&&/^[\p{L}\p{N} _.\-]+$/u.test(name);}
