import {defineConfig} from '@playwright/test';
const live=!!process.env.LIVE;
export default defineConfig({testDir:'./tests/browser',testMatch:['boxing.spec.cts','scenario.spec.cts'],timeout:120000,workers:1,use:{baseURL:live?'https://seunghyun-arena.onrender.com':'http://127.0.0.1:4173',viewport:{width:1280,height:1000}},webServer:live?undefined:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true},reporter:[['list'],['json',{outputFile:`evidence/boxing/${live?'live':'local'}/results.json`}]]});
