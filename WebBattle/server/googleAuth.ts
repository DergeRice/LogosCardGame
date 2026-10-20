import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import {randomBytes} from 'node:crypto';

const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:10000});
export type GoogleIdentity={sub:string;name?:string};
export class GoogleChallenges {
 private entries=new Map<string,{nonce:string;expires:number}>();
 issue(id:string){
  for(const [key,value] of this.entries)if(value.expires<Date.now())this.entries.delete(key);
  const nonce=Buffer.from(randomBytes(32)).toString('hex');this.entries.set(id,{nonce,expires:Date.now()+5*60_000});return nonce;
 }
 take(id:string){const value=this.entries.get(id);this.entries.delete(id);if(!value||value.expires<Date.now())throw Error('Google 로그인 시간이 만료됐어요. 다시 시도해 주세요.');return value.nonce;}
}
export async function verifyGoogleCredential(clientId:string,credential:unknown,nonce:string,keys:JWTVerifyGetKey=googleKeys):Promise<GoogleIdentity>{
 if(!clientId)throw Error('Google 로그인 설정이 아직 완료되지 않았어요.');
 if(typeof credential!=='string'||credential.length<100||credential.length>8192)throw Error('Google 로그인 요청이 올바르지 않아요.');
 try{
  const {payload}=await jwtVerify(credential,keys,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,requiredClaims:['sub','exp','iat','nonce'],maxTokenAge:'10m',clockTolerance:30});
  if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255)throw Error('identity');
  return {sub:payload.sub,name:typeof payload.name==='string'?payload.name:undefined};
 }catch{throw Error('Google 로그인 검증에 실패했어요. 다시 시도해 주세요.');}
}
