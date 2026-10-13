/** Vocabulary used by the deterministic card examples; extend together with their lexicon. */
export const EXAMPLE_AUDIO_WORDS=(`i we she them us me my your our the a an
friend helper guide teacher student child visitor book letter gift water traffic education management staff support work advice music
kind young helpful useful good clean fresh cool easy ready important happy confident calm valuable
flow flows works look looks need needs give gives want wants make makes be am is are read reads run
can do does not to near with very really only today sometimes often always almost quietly well`).split(/\s+/);
export function exampleAudioTokens(text:string):string[]{return text.toLowerCase().match(/[a-z]+/g)??[];}
