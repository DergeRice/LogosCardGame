# Chirp 3 HD sentence audio

The game first checks a small static manifest for an exact sentence MP3. When the file exists, it plays that file. Other sentences immediately use the existing local recorded word bank (or desktop browser speech where available). No text or credentials are sent from a player's browser to Google.

The built-in reviewed examples currently contain 150 sentences plus `Run!`. Card-aligned examples generated during play can also use Chirp if their exact English text is listed in a supplied sentence file. The current word bank remains available for every generated sentence it can tokenize.

## Budget preview

Run from `WebBattle`:

```sh
CHIRP_CHAR_BUDGET=10000 npm run audio:chirp
```

This is a dry run. It reports the number of missing files, characters, and estimated Google synthesis charge. The estimate is based on $0.00003 per character for Chirp 3 HD and excludes taxes or future price changes. Google charges for synthesis, including experiments and failed deployment attempts that already returned audio. `CHIRP_CHAR_BUDGET` limits **this run**, not other requests made by the same Google Cloud project or billing month. Set a Google Cloud billing budget and alert separately.

For up to 50,000 additional English sentences, put one sentence per line in a UTF-8 file, or one JSON object with an `english` or `text` field per line. The reviewed examples are always processed first. Keep the file outside `public` if it contains private material.

```sh
CHIRP_SENTENCES_FILE=/absolute/path/sentences.txt CHIRP_CHAR_BUDGET=50000 npm run audio:chirp
```

## Generate paid audio

Enable Text-to-Speech on a Google Cloud project with billing, create a service account allowed to synthesize speech, and save its JSON key outside the repository. Then run:

```sh
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json CHIRP_CHAR_BUDGET=10000 npm run audio:chirp -- --execute
```

The script uses `en-US-Chirp3-HD-Leda`, writes MP3s under `public/audio/chirp/<hash-prefix>/`, and updates `manifest.json`. It skips existing files so a later run can resume. It paces requests below the documented 200 requests/minute project quota. Never put the key in `public`, a client environment variable, or Git.

Deploy only the generated files you actually need. At 50,000 files, static hosting storage, build/deploy time, and bandwidth can become substantial. A small high-use set plus local fallback keeps playback immediate without a paid application server. For larger libraries, store the files in object storage behind a CDN, keeping the same manifest and hashed URL layout.
