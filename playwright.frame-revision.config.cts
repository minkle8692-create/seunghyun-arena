import {defineConfig} from '@playwright/test';
const live=!!process.env.LIVE;
process.env.SCENARIO_EVIDENCE=`evidence/frame-revision/${live?'live':'local'}/scenario`;
process.env.EVIDENCE_DIR=`evidence/frame-revision/${live?'live':'local'}/boxing`;
export default defineConfig({testDir:'./tests/browser',testMatch:['sideview.spec.cts','scenario.spec.cts','boxing.spec.cts','frame-revision.spec.cts','frame-mage.spec.cts'],timeout:180000,workers:1,use:{baseURL:live?'https://seunghyun-arena.onrender.com':'http://127.0.0.1:4173',viewport:{width:1280,height:1000}},webServer:live?undefined:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true},reporter:[['list'],['json',{outputFile:`evidence/frame-revision/${live?'live':'local'}/results.json`}]]});
