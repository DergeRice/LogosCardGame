#import <AVFoundation/AVFoundation.h>

static AVSpeechSynthesizer *logosSynthesizer;

extern "C" void LogosSpeakEnglish(const char *utf8Text)
{
    NSString *sentence = utf8Text ? [NSString stringWithUTF8String:utf8Text] : @"";
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!logosSynthesizer) logosSynthesizer = [[AVSpeechSynthesizer alloc] init];
        [logosSynthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
        AVSpeechUtterance *utterance = [AVSpeechUtterance speechUtteranceWithString:sentence];
        utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:@"en-US"];
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.85f;
        [logosSynthesizer speakUtterance:utterance];
    });
}

extern "C" void LogosStopEnglish(void)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        [logosSynthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
    });
}
