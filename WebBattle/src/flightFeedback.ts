import {unlockGameAudio} from './exampleAudio.js';

export type FlightImpactKind='correct'|'collision';

// Gate feedback sounds are routed here so recorded effects can replace the current collision tone.
export function playFlightImpactSound(kind:FlightImpactKind){
 if(kind==='correct')return;
 const audio=unlockGameAudio();if(!audio)return;
 const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;
 tone.type='sawtooth';tone.frequency.setValueAtTime(180,time);tone.frequency.exponentialRampToValueAtTime(65,time+.24);
 gain.gain.setValueAtTime(.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);
 tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.28);
}
