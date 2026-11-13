type Props={game:'flight'|'verb';className?:string};

export function MiniGameTitleArt({game,className=''}:Props){
 const label=game==='flight'?'불규칙 동사 플라이트 게임':'동사 분류 게임';
 return <picture className={`mini-title-art ${className}`}>
  <source media="(orientation: portrait)" srcSet={`/mini-games/${game}-portrait.webp`}/>
  <img src={`/mini-games/${game}-landscape.webp`} alt={label} draggable={false}/>
 </picture>;
}
