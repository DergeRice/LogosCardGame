#!/usr/bin/env node
/**
 * Read-only release check. Never prints a private key, access token, or purchase token.
 * Usage: GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=/absolute/path/key.json node verify-play-products.mjs
 */
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
const packageName = process.env.GOOGLE_PLAY_PACKAGE ?? 'com.baragames.logoscardgame';
if (!keyPath) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE is required');

const credentials = JSON.parse(await readFile(keyPath, 'utf8'));
const base64url = value => Buffer.from(value).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claim = base64url(JSON.stringify({
  iss: credentials.client_email,
  scope: 'https://www.googleapis.com/auth/androidpublisher',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
}));
const signer = createSign('RSA-SHA256');
signer.update(`${header}.${claim}`);
const assertion = `${header}.${claim}.${signer.sign(credentials.private_key, 'base64url')}`;
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
if (!tokenResponse.ok) throw new Error(`OAuth failed: ${tokenResponse.status}`);
const { access_token: accessToken } = await tokenResponse.json();
const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/oneTimeProducts`, {
  headers: { authorization: `Bearer ${accessToken}` },
});
if (!response.ok) throw new Error(`Android Publisher request failed: ${response.status}`);
const body = await response.json();
const productIds = (body.oneTimeProducts ?? []).map(product => product.productId).sort();
console.log(JSON.stringify({ status: response.status, packageName, productIds }));
