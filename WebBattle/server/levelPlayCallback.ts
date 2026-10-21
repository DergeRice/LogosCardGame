import {createHash,timingSafeEqual} from 'node:crypto';

export type VerifiedAdCallback={ticket:string;eventId:string};

/** LevelPlay S2S signature: MD5(timestamp + eventId + decoded userId + rewards + privateKey). */
export function verifyLevelPlayCallback(url:URL,privateKey:string):VerifiedAdCallback|null{
 if(!privateKey)return null;
 const params=url.searchParams;
 const ticket=params.get('userId')??params.get('userid')??params.get('applicationUserId');
 const eventId=params.get('eventId'),rewards=params.get('rewards'),timestamp=params.get('timestamp'),signature=params.get('signature');
 const placement=params.get('placement')??params.get('placementName');
 if(!ticket||!eventId||rewards!=='1'||!timestamp||!signature||!/^\d{10,16}$/.test(timestamp)||!/^[-\w]{1,128}$/.test(ticket)||!/^[a-zA-Z0-9]{1,128}$/.test(eventId)||!/^[a-fA-F0-9]{32}$/.test(signature)||(placement&&placement!=='logos_rewarded_box'))return null;
 const expected=createHash('md5').update(timestamp+eventId+ticket+rewards+privateKey).digest();
 const received=Buffer.from(signature,'hex');
 if(!timingSafeEqual(expected,received))return null;
 return {ticket,eventId};
}
