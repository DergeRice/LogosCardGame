import {createHash,timingSafeEqual} from 'node:crypto';

export type VerifiedAdCallback={ticket:string;eventId:string};

/** LevelPlay signs its user identifier, while the per-ad ticket arrives as dynamicUserId. */
export function verifyLevelPlayCallback(url:URL,privateKey:string):VerifiedAdCallback|null{
 if(!privateKey)return null;
 const params=url.searchParams;
 const signedIds=[params.get('userId'),params.get('userid'),params.get('applicationUserId'),params.get('publisherSubId')].filter((value):value is string=>value!==null);
 const ticket=params.get('dynamicUserId')||signedIds.find(Boolean);
 const eventId=params.get('eventId'),rewards=params.get('rewards'),timestamp=params.get('timestamp'),signature=params.get('signature');
 const placement=params.get('placement')??params.get('placementName');
 if(!signedIds.length||!ticket||!eventId||rewards!=='1'||!timestamp||!signature||!/^\d{10,16}$/.test(timestamp)||!/^[a-f0-9]{32}$/.test(ticket)||!/^[a-zA-Z0-9]{1,128}$/.test(eventId)||!/^[a-fA-F0-9]{32}$/.test(signature)||(placement&&placement!=='logos_rewarded_box'))return null;
 const received=Buffer.from(signature,'hex');
 if(!signedIds.some(userId=>timingSafeEqual(createHash('md5').update(timestamp+eventId+userId+rewards+privateKey).digest(),received)))return null;
 return {ticket,eventId};
}
