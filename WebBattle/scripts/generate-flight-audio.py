"""Build prerecorded Kokoro clips for every irregular-flight verb form."""
import hashlib
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / '.runtime/kokoro-python'))
import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

source = (root / 'server/flightWords.ts').read_text(encoding='utf-8')
rows = source.split('const rows=`', 1)[1].split('`;', 1)[0]
words = list(dict.fromkeys(form for row in rows.splitlines() if row.strip()
                           for form in (row.split('|')[0], row.split('|')[2], row.split('|')[3])))
model = root / '.runtime/kokoro'
output = root / 'public/audio/flight'
clips_dir = output / 'clips'
clips_dir.mkdir(parents=True, exist_ok=True)

options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1

class FloatSpeedSession(ort.InferenceSession):
    def run(self, names, inputs, *args, **kwargs):
        inputs = dict(inputs)
        inputs['speed'] = np.asarray(inputs['speed'], dtype=np.float32)
        return super().run(names, inputs, *args, **kwargs)

session = FloatSpeedSession(str(model / 'kokoro-v1.0.onnx'), sess_options=options,
                            providers=['CPUExecutionProvider'])
voice = Kokoro.from_session(session, str(model / 'voices-v1.0.bin'))
clips = {}
segments = {}
packed = []
cursor = 0
sample_rate = 24000
for index, word in enumerate(words, 1):
    name = hashlib.sha256(('kokoro-flight-af_heart-v1/' + word).encode()).hexdigest()[:20] + '.mp3'
    target = clips_dir / name
    if not target.exists():
        samples, rate = voice.create(word, voice='af_heart', speed=1.0, lang='en-us')
        if not np.isfinite(samples).all() or np.max(np.abs(samples)) < .02:
            raise RuntimeError('Invalid generated speech: ' + word)
        temporary = str(target) + '.tmp'
        sf.write(temporary, samples, rate, format='MP3', bitrate_mode='CONSTANT')
        os.replace(temporary, target)
    samples, rate = sf.read(target, dtype='float32')
    duration = len(samples) / rate
    if not np.isfinite(samples).all() or not .08 < duration < 8 or np.max(np.abs(samples)) < .02:
        raise RuntimeError('Invalid recorded clip: ' + word)
    if rate != sample_rate:
        raise RuntimeError('Unexpected sample rate: ' + word)
    clips[word] = name
    segments[word] = {'start': cursor, 'length': len(samples)}
    packed.append(samples)
    packed.append(np.zeros(1200, dtype=np.float32))
    cursor += len(samples) + 1200
    if index % 20 == 0 or index == len(words):
        print(f'Flight voice {index}/{len(words)}', flush=True)

manifest = {'version': 1, 'engine': 'Kokoro-82M v1.0', 'voice': 'af_heart', 'clips': clips}
(output / 'manifest-v1.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
(output / 'manifest-v2.json').write_text(json.dumps({'version': 2, 'engine': 'Kokoro-82M v1.0', 'voice': 'af_heart', 'sampleRate': sample_rate, 'segments': segments, 'clips': clips}, ensure_ascii=False), encoding='utf-8')
sf.write(output / 'flight-voice-v2.wav', np.concatenate(packed), sample_rate, format='WAV', subtype='PCM_16')
print(f'Generated and verified {len(clips)} flight word recordings', flush=True)
