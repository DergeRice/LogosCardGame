import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/buildVersion.ts',import.meta.url),source=readFileSync(path,'utf8');
const match=source.match(/v0\.9\.(\d+)/);if(!match)throw Error('Expected v0.9.NN build version');
const next=`v0.9.${String(Number(match[1])+1).padStart(2,'0')}`;if(!process.argv.includes('--dry-run'))writeFileSync(path,source.replace(match[0],next));console.log(next);
