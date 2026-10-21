# Logos English source corpus

`PublicDomain/` is the source library for the Logos English sentence-structure curriculum.
It is deliberately separate from app-facing lesson data.

## Layout

- `PublicDomain/catalog.json`: the stable work IDs, bibliographic metadata, and the local path for each source text.
- `PublicDomain/texts/`: UTF-8 source texts downloaded from Project Gutenberg.

## Content pipeline

1. Keep the source text unchanged as evidence of the selected edition.
2. Remove the Project Gutenberg header and footer only in an exported working copy.
3. Select passages with meaningful local context, rather than harvesting isolated sentences.
4. Create learner records in a separate lesson database. A learner record must retain `sourceWorkId`, chapter or section, source sentence, Korean translation, room-number analysis, and editorial notes.
5. Do not silently modernize the source sentence. Any modernized adaptation must be stored as an adaptation with its own text and rationale.

## Rights handling

The catalog records Project Gutenberg works presented as public domain in the United States. Before commercial distribution, verify the rights position for every target territory. Do not copy a later translation, audiobook, annotation, cover, or film-adaptation visual treatment merely because the original literary work is public domain.

## Runtime rule

Do not load every source text at application startup. These are editorial assets in `StreamingAssets`; the released app should ship only the texts required by an enabled course pack, or an intentionally selected offline corpus.
