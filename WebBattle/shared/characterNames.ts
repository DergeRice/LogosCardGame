/** Display names only. Released cosmetic IDs and image paths stay stable. */
export function characterName(name:string){return name.replace(/토끼/g,'아리').replace(/강아지/g,'프로나운').replace(/점박이/g,'버프').replace(/햄스터/g,'두두').replace(/분홍원숭이/g,'애드버프').replace(/(^| )말(?= |$)/g,'$1트랜스').replace(/(^| )왕(?= |$)/g,'$1코리쉬');}
