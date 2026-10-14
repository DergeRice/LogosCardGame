const GAME_ASSET_URLS=[
 '/landing/background.jpg','/landing/cards.png','/landing/mascots.png','/landing/cards-mobile.webp','/landing/mascots-mobile.webp',
 '/brand-ui/game-back.png','/brand-ui/loading.png','/brand-ui/loading-under.png','/brand-ui/panels.png','/brand-ui/ui-icons.png','/brand-ui/start-button.png'
];
const images:HTMLImageElement[]=[];
let loading:Promise<void>|undefined;
function decode(url:string){return new Promise<void>(resolve=>{const image=new Image();images.push(image);const done=()=>resolve();image.onload=()=>{void image.decode().catch(()=>undefined).then(done);};image.onerror=done;image.src=url;});}
/** Decode the fixed game-stage art while the loading scene is visible, before a room can render it. */
export function preloadGameAssets(){return loading??=Promise.all(GAME_ASSET_URLS.map(decode)).then(()=>undefined);}
