#!/usr/bin/env python3
"""Build the Logos Room Number legacy corpus from the checked-in public-domain texts.

This is a deterministic editorial preprocessor, not a grammar authority. It preserves every
source sentence and assigns a confidence score so the playable pool can remain conservative.
"""
import json
import re
from pathlib import Path

try:
    import spacy
    NLP = spacy.load("en_core_web_sm")
except Exception:
    NLP = None

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Assets/StreamingAssets/LearningCorpus/PublicDomain"
OUTPUT = ROOT / "Assets/StreamingAssets/LearningCorpus/LegacyPrototype"
SEED = ROOT / "Assets/Resources/Learning/legacy_room_seed.json"

TOKEN = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?|\d+|[.,;:!?]")
SPLIT = re.compile(r"(?<=[.!?])(?:[\"'”’)]*)\s+(?=[A-Z\"'])")
PUNCT = {".", ",", ";", ":", "!", "?"}
PRONOUNS = {"i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "who", "whom", "which", "that"}
DETERMINERS = {"a", "an", "the", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", "some", "any", "each", "every", "no"}
PREPOSITIONS = {"in", "on", "at", "by", "with", "from", "to", "for", "of", "into", "onto", "over", "under", "through", "across", "after", "before", "during", "until", "since", "within", "without", "between", "among", "around", "behind", "beside", "near", "toward", "against", "about", "upon", "as"}
CONJUNCTIONS = {"and", "but", "or", "nor", "yet", "so", "because", "although", "while", "when", "if", "unless", "though", "where", "whereas", "than"}
BE = {"am", "is", "are", "was", "were", "be", "being", "been"}
LINKING = BE | {"seem", "seems", "seemed", "become", "becomes", "became", "remain", "remains", "remained", "appear", "appears", "appeared", "feel", "feels", "felt", "look", "looks", "looked", "sound", "sounds", "sounded", "stay", "stays", "stayed", "grow", "grows", "grew", "turn", "turns", "turned"}
MODALS = {"will", "would", "shall", "should", "can", "could", "may", "might", "must", "do", "does", "did", "have", "has", "had"}
DITRANSITIVE = {"give", "gives", "gave", "given", "send", "sends", "sent", "show", "shows", "showed", "tell", "tells", "told", "offer", "offers", "offered", "bring", "brings", "brought", "teach", "teaches", "taught", "hand", "hands", "handed", "pay", "pays", "paid", "write", "writes", "wrote", "read", "reads", "lend", "lends", "lent", "promise", "promises", "promised"}
OBJECT_COMPLEMENT = {"make", "makes", "made", "call", "calls", "called", "find", "finds", "found", "keep", "keeps", "kept", "name", "names", "named", "consider", "considers", "considered", "elect", "elects", "elected", "leave", "leaves", "left", "paint", "paints", "painted"}
COMMON_VERBS = LINKING | MODALS | DITRANSITIVE | OBJECT_COMPLEMENT | {"go", "goes", "went", "gone", "come", "comes", "came", "see", "sees", "saw", "seen", "know", "knows", "knew", "think", "thinks", "thought", "say", "says", "said", "look", "looked", "take", "takes", "took", "taken", "put", "puts", "get", "gets", "got", "gotten", "find", "found", "ask", "asked", "answer", "answered", "walk", "walked", "run", "ran", "stand", "stood", "sit", "sat", "open", "opened", "close", "closed", "hold", "held", "hear", "heard", "speak", "spoke", "spoken", "begin", "began", "begun", "try", "tried", "want", "wanted", "need", "needed", "use", "used", "work", "worked", "live", "lived", "love", "loved", "like", "liked", "watch", "watched", "follow", "followed", "leave", "left", "return", "returned", "pass", "passed", "rise", "rose", "fall", "fell", "become", "became", "seem", "seemed"}
ADJECTIVE_WORDS = {"good", "bad", "happy", "sad", "clear", "sure", "ready", "afraid", "alone", "silent", "quiet", "old", "young", "little", "great", "beautiful", "strange", "dark", "bright", "cold", "warm", "open", "closed", "free", "dead", "alive", "useful", "kind", "poor", "rich", "angry", "tired"}
ABBREVIATIONS = {"mr.", "mrs.", "ms.", "dr.", "st.", "jr.", "sr.", "etc.", "e.g.", "i.e."}

def clean_source(text):
    start = re.search(r"\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.I | re.S)
    end = re.search(r"\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.I | re.S)
    if start:
        text = text[start.end():]
    if end:
        text = text[:end.start()]
    text = text.replace("\ufeff", "").replace("\r", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text

def sentences(text):
    paragraphs = [re.sub(r"\s+", " ", p).strip() for p in text.split("\n\n")]
    result = []
    section = ""
    for paragraph in paragraphs:
        if not paragraph:
            continue
        if len(paragraph) < 90 and paragraph.upper() == paragraph and re.search(r"[A-Z]", paragraph):
            section = paragraph.title()
            continue
        protected = paragraph
        for abbr in ABBREVIATIONS:
            protected = protected.replace(abbr, abbr.replace(".", "§"))
        for raw in SPLIT.split(protected):
            raw = raw.replace("§", ".").strip()
            if raw:
                result.append((section, raw))
    return result

def tokens(text):
    return [x for x in TOKEN.findall(text) if x not in PUNCT]

def likely_verb(word):
    lower = word.lower()
    if lower in COMMON_VERBS:
        return True
    if lower.endswith("ed") and len(lower) > 4:
        return True
    if lower.endswith("ing") and len(lower) > 5:
        return True
    return False

def phrase(words):
    return " ".join(words).strip(" ,;:")

def first_adverbial(words, start):
    for i in range(start, len(words)):
        if words[i].lower() in PREPOSITIONS:
            return i
    return len(words)

def noun_phrase_end(words, start):
    for i in range(start + 1, len(words)):
        w = words[i].lower()
        if w in PREPOSITIONS or w in CONJUNCTIONS:
            return i
        if i > start + 1 and (words[i][0].isupper() or w in DETERMINERS):
            return i
    return len(words)

def analyse_heuristic(text):
    words = tokens(text)
    base = {"eligible": False, "roomBlocks": [], "pattern": "", "difficulty": 0, "confidence": 0, "reviewStatus": "legacy_rejected", "reason": ""}
    lower_text = text.lower()
    editorial_noise = ("project gutenberg", "internet archive", "images of the original", "produced by", "contents", "chapter ")
    if any(marker in lower_text for marker in editorial_noise):
        base["reason"] = "editorial_or_heading"
        return base
    # The first playable corpus deliberately excludes dialogue punctuation and multi-clause
    # narration. Those sentences remain in the review set for a future syntactic parser.
    if any(mark in text for mark in ("\"", "“", "”", "—", ";", ":", "?", "!", ",")):
        base["reason"] = "legacy_simple_clause_only"
        return base
    if any("'" in word or "’" in word for word in words):
        base["reason"] = "contraction_or_quote"
        return base
    if len(words) < 3 or len(words) > 28:
        base["reason"] = "token_length"
        return base
    if any(w.isdigit() for w in words):
        base["reason"] = "contains_number"
        return base
    if words[0].lower() in PREPOSITIONS or words[0].lower() == "there":
        base["reason"] = "fronted_or_dummy_subject"
        return base
    if any(word.lower() in CONJUNCTIONS for word in words):
        base["reason"] = "compound_or_dependent_clause"
        return base
    verb_indexes = [i for i, word in enumerate(words) if likely_verb(word)]
    if not verb_indexes:
        base["reason"] = "verb_not_detected"
        return base
    verb = verb_indexes[0]
    if verb == 0 or verb > 8:
        base["reason"] = "subject_boundary"
        return base
    if any(words[i].lower() in CONJUNCTIONS for i in range(verb)):
        base["reason"] = "leading_clause"
        return base
    subject = phrase(words[:verb])
    if not subject:
        base["reason"] = "empty_subject"
        return base
    # Join modal/auxiliary chain with its following lexical verb.
    predicate_end = verb + 1
    while predicate_end < len(words) and words[predicate_end - 1].lower() in MODALS and likely_verb(words[predicate_end]):
        predicate_end += 1
    predicate = phrase(words[verb:predicate_end])
    tail_end = first_adverbial(words, predicate_end)
    core = words[predicate_end:tail_end]
    adverbial = words[tail_end:]
    blocks = [{"room": "1", "text": subject}, {"room": "2", "text": predicate}]
    main = words[predicate_end - 1].lower()
    confidence = 64
    pattern = ["1", "2"]
    progressive = main in BE and predicate_end < len(words) and words[predicate_end].lower().endswith("ing")
    if progressive:
        predicate_end += 1
        predicate = phrase(words[verb:predicate_end])
        tail_end = first_adverbial(words, predicate_end)
        core = words[predicate_end:tail_end]
        adverbial = words[tail_end:]
        if core:
            base["reason"] = "progressive_with_unparsed_tail"
            return base
        confidence = 84
    elif main in LINKING:
        if not core:
            base["reason"] = "missing_subject_complement"
            return base
        blocks.append({"room": "3", "text": phrase(core)})
        pattern.append("3")
        confidence = 88
    elif core:
        if main in DITRANSITIVE and len(core) >= 2:
            split = noun_phrase_end(core, 0)
            if split < len(core):
                blocks.append({"room": "4-1", "text": phrase(core[:split])})
                blocks.append({"room": "4-2", "text": phrase(core[split:])})
                pattern += ["4-1", "4-2"]
                confidence = 82
            else:
                blocks.append({"room": "4", "text": phrase(core)})
                pattern.append("4")
                confidence = 71
        elif main in OBJECT_COMPLEMENT and len(core) >= 3:
            split = len(core) - 1
            if core[-2].lower() == "to":
                split -= 1
            blocks.append({"room": "4", "text": phrase(core[:split])})
            blocks.append({"room": "5", "text": phrase(core[split:])})
            pattern += ["4", "5"]
            confidence = 74
        else:
            blocks.append({"room": "4", "text": phrase(core)})
            pattern.append("4")
            confidence = 79
    if adverbial:
        blocks.append({"room": "6", "text": phrase(adverbial)})
        pattern.append("6")
        confidence -= 4
    # A second lexical verb means the sentence needs a clause-level parser. Keep it for
    # review rather than pretending that a flat room analysis is reliable.
    allowed_verbs = 2 if progressive or (words[verb].lower() in MODALS) else 1
    if len(verb_indexes) > allowed_verbs:
        confidence -= 20
    if any(w.lower() in {"who", "which", "that", "when", "while", "because", "if", "although"} for w in words):
        confidence -= 17
    difficulty = 1
    if "3" in pattern or "4" in pattern: difficulty = 2
    if "6" in pattern or len(words) >= 9: difficulty = 3
    if "4-1" in pattern or "5" in pattern: difficulty = 4
    if len(verb_indexes) > 1 or any(w.lower() in {"who", "which", "that", "when", "while", "because", "if", "although"} for w in words): difficulty = 5
    confidence = max(0, min(100, confidence))
    base.update({"eligible": confidence >= 75, "roomBlocks": blocks, "pattern": "-".join(pattern), "difficulty": difficulty, "confidence": confidence, "reviewStatus": "legacy_auto_playable" if confidence >= 75 else "legacy_auto_review", "reason": "" if confidence >= 75 else "low_confidence"})
    return base

def span_text(tokens):
    return " ".join(token.text for token in sorted(tokens, key=lambda token: token.i) if not token.is_punct).strip()

def child_tokens(token):
    return set(token.subtree)

def analyse_spacy(text):
    base = {"eligible": False, "roomBlocks": [], "pattern": "", "difficulty": 0, "confidence": 0, "reviewStatus": "legacy_rejected", "reason": ""}
    lower_text = text.lower()
    editorial_noise = ("project gutenberg", "internet archive", "images of the original", "produced by", "contents", "chapter ")
    if any(marker in lower_text for marker in editorial_noise):
        base["reason"] = "editorial_or_heading"
        return base
    if not text.rstrip().endswith("."):
        base["reason"] = "not_a_complete_declarative_sentence"
        return base
    if any(mark in text for mark in ("\"", "“", "”", "—", ";", ":", "?", "!", ",")):
        base["reason"] = "legacy_simple_clause_only"
        return base
    doc = NLP(text)
    if any(token.like_num for token in doc):
        base["reason"] = "contains_number"
        return base
    word_tokens = [token for token in doc if token.is_alpha]
    if word_tokens and sum(token.text[:1].isupper() for token in word_tokens) / len(word_tokens) > .78:
        base["reason"] = "heading_like_capitalization"
        return base
    if len(list(doc.sents)) != 1:
        base["reason"] = "multiple_sentences"
        return base
    roots = [token for token in doc if token.dep_ == "ROOT"]
    if len(roots) != 1:
        base["reason"] = "root_not_resolved"
        return base
    root = roots[0]
    unsupported = {"ccomp", "advcl", "relcl", "conj", "parataxis", "mark"}
    if any(token.dep_ in unsupported for token in doc):
        base["reason"] = "multi_clause"
        return base
    subjects = [token for token in root.children if token.dep_ in {"nsubj", "nsubjpass"}]
    if len(subjects) != 1 or subjects[0].lemma_.lower() == "there":
        base["reason"] = "subject_not_resolved"
        return base
    subject = subjects[0]
    if any(token.dep_ == "advmod" and token.i < subject.i for token in doc):
        base["reason"] = "fronted_adverbial"
        return base
    auxiliaries = [token for token in root.children if token.dep_ in {"aux", "auxpass", "neg", "prt"}]
    copulas = [token for token in root.children if token.dep_ == "cop"]
    linked = bool(copulas) or root.lemma_.lower() in LINKING
    predicate_tokens = set(auxiliaries + copulas)
    if root.pos_ in {"VERB", "AUX"}:
        predicate_tokens.add(root)
    if not predicate_tokens:
        base["reason"] = "predicate_not_resolved"
        return base
    if root.pos_ == "VERB" and "Part" in root.morph.get("VerbForm") and not auxiliaries:
        base["reason"] = "nonfinite_fragment"
        return base
    objects = [token for token in root.children if token.dep_ in {"obj", "dobj"}]
    indirects = [token for token in root.children if token.dep_ in {"iobj", "dative"}]
    complements = [token for token in root.children if token.dep_ in {"attr", "acomp", "oprd", "xcomp"}]
    adverbials = [token for token in root.children if token.dep_ in {"obl", "advmod", "npadvmod"} and token.dep_ != "neg"]
    blocks = [{"room": "1", "text": span_text(child_tokens(subject))}, {"room": "2", "text": span_text(predicate_tokens)}]
    pattern = ["1", "2"]
    used = child_tokens(subject) | predicate_tokens
    if linked:
        complement_tokens = set([root]) if root not in predicate_tokens else set()
        for complement in complements:
            complement_tokens |= child_tokens(complement)
        if not complement_tokens:
            base["reason"] = "missing_subject_complement"
            return base
        blocks.append({"room": "3", "text": span_text(complement_tokens)})
        pattern.append("3")
        used |= complement_tokens
    elif indirects and objects:
        blocks.append({"room": "4-1", "text": span_text(child_tokens(indirects[0]))})
        blocks.append({"room": "4-2", "text": span_text(child_tokens(objects[0]))})
        pattern += ["4-1", "4-2"]
        used |= child_tokens(indirects[0]) | child_tokens(objects[0])
    elif objects:
        blocks.append({"room": "4", "text": span_text(child_tokens(objects[0]))})
        pattern.append("4")
        used |= child_tokens(objects[0])
        object_complement = next((item for item in complements if item.dep_ in {"oprd", "xcomp", "acomp"}), None)
        if object_complement is not None:
            blocks.append({"room": "5", "text": span_text(child_tokens(object_complement))})
            pattern.append("5")
            used |= child_tokens(object_complement)
    elif root.lemma_.lower() not in {"go", "come", "sit", "stand", "run", "walk", "sleep", "wait", "remain", "stay", "die", "fall", "rise", "arrive", "leave", "return"}:
        base["reason"] = "object_or_intransitive_not_resolved"
        return base
    for adverbial in adverbials:
        adverbial_tokens = child_tokens(adverbial)
        if not adverbial_tokens or adverbial_tokens & used:
            continue
        value = span_text(adverbial_tokens)
        if value:
            blocks.append({"room": "6", "text": value})
            if "6" not in pattern:
                pattern.append("6")
            used |= adverbial_tokens
    if any(not block["text"] for block in blocks):
        base["reason"] = "empty_block"
        return base
    confidence = 94
    if len(doc) > 20: confidence -= 8
    if any(token.dep_ == "punct" and token.text == "," for token in doc): confidence -= 5
    if any(token.pos_ == "PROPN" for token in doc): confidence -= 1
    difficulty = 1
    if "3" in pattern or "4" in pattern: difficulty = 2
    if "6" in pattern or len(doc) >= 9: difficulty = 3
    if "4-1" in pattern or "5" in pattern: difficulty = 4
    base.update({"eligible": confidence >= 86, "roomBlocks": blocks, "pattern": "-".join(pattern), "difficulty": difficulty, "confidence": confidence, "reviewStatus": "legacy_auto_playable" if confidence >= 86 else "legacy_auto_review", "reason": "" if confidence >= 86 else "low_confidence"})
    return base

def analyse(text):
    return analyse_spacy(text) if NLP is not None else analyse_heuristic(text)

def main():
    catalog = json.loads((SOURCE / "catalog.json").read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    works = []
    all_playable = []
    for work in catalog["works"]:
        text = clean_source((SOURCE / work["localPath"]).read_text(encoding="utf-8"))
        records = []
        for index, (section, source_sentence) in enumerate(sentences(text), start=1):
            a = analyse(source_sentence)
            record = {"id": f"legacy_{work['id']}_{index:05d}", "sourceWorkId": work["id"], "sourceTitle": work["title"], "section": section, "sourceSentence": source_sentence, **a}
            records.append(record)
            if a["reviewStatus"] == "legacy_auto_playable":
                all_playable.append(record)
        payload = {"schemaVersion": 1, "prototype": "legacy_room_number_01", "work": work, "sentences": records}
        (OUTPUT / f"{work['id']}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        works.append({"id": work["id"], "title": work["title"], "file": f"{work['id']}.json", "total": len(records), "playable": sum(1 for r in records if r["reviewStatus"] == "legacy_auto_playable"), "review": sum(1 for r in records if r["reviewStatus"] == "legacy_auto_review")})
    # Round-robin work ordering prevents a large book from dominating the prototype.
    by_work = {w["id"]: [r for r in all_playable if r["sourceWorkId"] == w["id"]] for w in works}
    # Rotate through room patterns first, then works. A source book must not dominate the
    # lesson merely because it contains more short linking-verb sentences.
    patterns = ["1-2", "1-2-3", "1-2-4", "1-2-6", "1-2-3-6", "1-2-4-6", "1-2-4-1-4-2", "1-2-4-5"]
    seed = []
    offset = 0
    while len(seed) < 1200:
        added = False
        for pattern in patterns:
            for work in works:
                choices = [r for r in by_work[work["id"]] if r["pattern"] == pattern]
                if offset < len(choices):
                    seed.append(choices[offset])
                    added = True
                    if len(seed) == 1200: break
            if len(seed) == 1200: break
        if not added: break
        offset += 1
    manifest = {"schemaVersion": 1, "prototype": "legacy_room_number_01", "generation": "spacy_dependency_v1" if NLP is not None else "deterministic_heuristic_v1", "works": works, "totalSentences": sum(w["total"] for w in works), "playableSentences": len(all_playable), "seedCount": len(seed), "reviewRule": "Only high-confidence simple-clause analyses are in the playable seed. All other source sentences remain in their work file for editorial review."}
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    SEED.parent.mkdir(parents=True, exist_ok=True)
    SEED.write_text(json.dumps({"schemaVersion": 1, "prototype": "legacy_room_number_01", "sentences": seed}, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
