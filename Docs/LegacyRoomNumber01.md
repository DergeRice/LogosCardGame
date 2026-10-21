# Logos English Room Number — Legacy 01

This is the first playable corpus prototype for Logos English room-number analysis.

## What is in the prototype

- 12 public-domain source works under `Assets/StreamingAssets/LearningCorpus/PublicDomain`.
- 50,478 extracted source-sentence records in `Assets/StreamingAssets/LearningCorpus/LegacyPrototype`.
- 1,200 high-confidence simple-clause records in `Assets/Resources/Learning/legacy_room_seed.json`.
- Practice scene routing to `LogosLegacyRoomUI` while `LogosLegacyRoomPrototype.Enabled` is `true`.

The playable seed has automatic dependency parses for room 1 (subject), 2 (predicate), 3 (subject complement), 4 (object), 4-1 (indirect object), 4-2 (direct object), 5 (object complement), and 6 (adverbial).

## Legacy contract

This is intentionally an editorial prototype, not a final grammar authority. The automatic parser gives the prototype breadth; manual review gives the final course authority.

- `legacy_auto_playable`: simple-clause analysis that the prototype may present.
- `legacy_auto_review`: a parsable but less certain record.
- `legacy_rejected`: retained source sentence that needs a later clause-level or editorial pass.

The player only reads the 1,200-record playable seed. The full work files remain available for later promotion after review.

## Regeneration

Run `Tools/build_legacy_room_corpus.py` with spaCy and `en_core_web_sm` available. The script never changes the source-text folder; it only regenerates the LegacyPrototype work files and the playable seed.

## First review order

1. Sherlock Holmes: inspect detective narration and dialogue boundaries.
2. The Secret Garden and The Railway Children: approve the foundation pool.
3. Ditransitive and object-complement patterns across all works.
4. Add Korean translation, source-location polish, and voice only after an English structure record is approved.
