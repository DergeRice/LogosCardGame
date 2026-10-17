import base from './playwright.config.js';
import {defineConfig,devices} from '@playwright/test';
export default defineConfig({...base,outputDir:'.runtime/audio-tests',reporter:[['list'],['json',{outputFile:'.runtime/audio-results.json'}]],testMatch:'**/voice-reliability.spec.ts',projects:[
 {name:'windows-chromium',use:{browserName:'chromium',viewport:{width:1280,height:900}}},
 {name:'windows-installed-chrome',use:{browserName:'chromium',channel:'chrome',viewport:{width:1280,height:900}}},
 {name:'android-chromium-emulated',use:{...devices['Pixel 7'],viewport:{width:900,height:430}}},
 {name:'ios-webkit-emulated',use:{...devices['iPhone 13'],viewport:{width:844,height:390}}},
]});
