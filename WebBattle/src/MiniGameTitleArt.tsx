type Props={game:'flight'|'verb';placement:'entry'|'ranking';className?:string};

export function MiniGameTitleArt({game,placement,className=''}:Props){
 const label=game==='flight'?'불규칙 동사 플라이트 게임':'동사 분류 게임';
 return <picture className={`mini-title-art ${className}`}>
  {placement==='entry'&&<source media="(orientation: landscape)" srcSet={`/mini-games/${game}-portrait.webp`}/>}
  <img src={`/mini-games/${game}-landscape.webp`} alt={label} draggable={false}/>
 </picture>;
}
