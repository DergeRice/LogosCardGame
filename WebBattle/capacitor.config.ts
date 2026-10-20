import type {CapacitorConfig} from '@capacitor/cli';
const config:CapacitorConfig={
 appId:'com.baragames.logoscardgame',appName:'로고스 카드게임',webDir:'dist',
 server:{hostname:'localhost',androidScheme:'https',iosScheme:'capacitor'},
 plugins:{SocialLogin:{providers:{google:true,apple:true,facebook:false,twitter:false}}},
};
export default config;
