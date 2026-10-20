import {SignJWT,createRemoteJWKSet,importPKCS8,jwtVerify,type JWTVerifyGetKey} from 'jose';

export type AppleConfig={clientId:string;teamId:string;keyId:string;privateKey:string;redirectUri:string};
export type AppleIdentity={sub:string;email?:string};
const appleKeys=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export async function verifyAppleCode(config:AppleConfig,code:unknown,nonce:unknown):Promise<AppleIdentity>{
 if(!config.clientId||!config.teamId||!config.keyId||!config.privateKey||!config.redirectUri)throw Error('Apple 로그인 설정이 아직 완료되지 않았어요.');
 if(typeof code!=='string'||code.length<8||code.length>2048||typeof nonce!=='string'||!/^[a-f0-9]{32,128}$/i.test(nonce))throw Error('Apple 로그인 요청이 올바르지 않아요.');
 try{
  const key=await importPKCS8(config.privateKey.replace(/\\n/g,'\n'),'ES256');
  const secret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:config.keyId}).setIssuer(config.teamId).setSubject(config.clientId).setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('5m').sign(key);
  const response=await fetch('https://appleid.apple.com/auth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:config.redirectUri}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('token_exchange');
  const result=await response.json() as {id_token?:string};if(!result.id_token)throw Error('missing_id_token');
  const {payload}=await jwtVerify(result.id_token,appleKeys,{issuer:'https://appleid.apple.com',audience:config.clientId,clockTolerance:30});
  if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub)throw Error('nonce_or_subject');
  return {sub:payload.sub,email:typeof payload.email==='string'?payload.email:undefined};
 }catch{throw Error('Apple 로그인 검증에 실패했어요. 다시 시도해 주세요.');}
}

export async function verifyAppleCredential(clientId:string,credential:unknown,nonce:string,keys:JWTVerifyGetKey=appleKeys):Promise<AppleIdentity>{
 if(!clientId)throw Error('Apple 로그인 설정이 아직 완료되지 않았어요.');
 if(typeof credential!=='string'||credential.length<100||credential.length>8192)throw Error('Apple 로그인 요청이 올바르지 않아요.');
 try{
  const {payload}=await jwtVerify(credential,keys,{algorithms:['RS256'],issuer:'https://appleid.apple.com',audience:clientId,requiredClaims:['sub','exp','iat','nonce'],maxTokenAge:'10m',clockTolerance:30});
  if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255)throw Error('identity');
  return {sub:payload.sub};
 }catch{throw Error('Apple 로그인 검증에 실패했어요. 다시 시도해 주세요.');}
}
