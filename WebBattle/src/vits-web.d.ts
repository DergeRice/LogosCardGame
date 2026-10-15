// The package's published declarations use extensionless relative exports,
// which do not resolve under this project's NodeNext settings.
declare module '@diffusionstudio/vits-web' {
 export function predict(config:{text:string;voiceId:'en_US-ljspeech-medium'},progress?:(value:{loaded:number;total:number})=>void):Promise<Blob>;
}
