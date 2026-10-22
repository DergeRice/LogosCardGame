import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {verifyPlayPurchase} from '../server/googlePlayPurchase.js';

const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const credentials=JSON.stringify({client_email:'verifier@example.test',private_key:privateKey.export({format:'pem',type:'pkcs8'}).toString()});
const accountId='account-123';
const accountHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(accountId))),b=>b.toString(16).padStart(2,'0')).join('');

test('Play verification requires the matching purchased one-time product',async()=>{
 const original=globalThis.fetch;
 let purchase:unknown={purchaseStateContext:{purchaseState:'PURCHASED'},purchaseCompletionTime:'2026-10-22T00:00:00Z',obfuscatedExternalAccountId:accountHash,productLineItem:[{productId:'diamonds_300',productOfferDetails:{purchaseOptionId:'standard',quantity:1,consumptionState:'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}]};
 globalThis.fetch=async(input)=>{
  const url=String(input);
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access-token'});
  assert.match(url,/applications\/com\.baragames\.logoscardgame\/purchases\/productsv2\/tokens\/test-purchase-token$/);
  return Response.json(purchase);
 };
 try{
  assert.deepEqual(await verifyPlayPurchase(credentials,'diamonds_300','test-purchase-token',accountId),{accessToken:'test-access-token',amount:300});
  purchase={...purchase as object,purchaseStateContext:{purchaseState:'PENDING'}};
  await assert.rejects(verifyPlayPurchase(credentials,'diamonds_300','test-purchase-token',accountId),/구매 상태/);
  purchase={...purchase as object,purchaseStateContext:{purchaseState:'PURCHASED'},productLineItem:[{productId:'diamonds_100',productOfferDetails:{quantity:1}}]};
  await assert.rejects(verifyPlayPurchase(credentials,'diamonds_300','test-purchase-token',accountId),/구매 상태/);
  purchase={...purchase as object,productLineItem:[{productId:'diamonds_300',productOfferDetails:{quantity:1}}],obfuscatedExternalAccountId:'other-account'};
  await assert.rejects(verifyPlayPurchase(credentials,'diamonds_300','test-purchase-token',accountId),/구매 상태/);
 }finally{globalThis.fetch=original;}
});
