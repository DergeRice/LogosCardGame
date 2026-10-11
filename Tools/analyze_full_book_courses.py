"""Add deterministic spaCy dependency analyses to every narrative book entry.

The annotations are machine generated and carry their review status. Re-run with
Python 3.9, spaCy 3.7.5 and en_core_web_sm 3.7.1 after rebuilding the course.
"""
import json
import textwrap
from collections import Counter
from pathlib import Path

import spacy

from build_legacy_book_courses import BOOK_DIR, DESTINATION

ROOMS = {"1", "2", "3", "4", "4-1", "4-2", "5", "6"}
CLAUSE_DEPS = {"ROOT", "conj", "ccomp", "xcomp", "advcl", "relcl", "acl", "pcomp", "parataxis"}
SUBJECTS = {"nsubj", "nsubjpass", "csubj", "csubjpass", "expl"}
OBJECTS = {"obj", "dobj"}
INDIRECTS = {"iobj", "dative"}
COMPLEMENTS = {"attr", "acomp", "oprd"}
ADVERBIALS = {"advmod", "npadvmod", "advcl", "prep", "obl", "agent", "prt", "intj", "mark", "cc", "acomp"}
VERSION = "spacy_3.7.5_en_core_web_sm_3.7.1_rooms_v2"


def is_predicate(token):
    return token.pos_ in {"VERB", "AUX"} and token.dep_ in CLAUSE_DEPS


def clause_head(token):
    for ancestor in (token, *token.ancestors):
        if is_predicate(ancestor):
            return ancestor
    return None


def branch_under(token, head):
    child = token
    while child.head != head and child.head != child:
        child = child.head
    return child


def room_for(token):
    head = clause_head(token)
    if head is None:
        return "6"
    if token == head:
        return "2"
    branch = branch_under(token, head)
    dep = branch.dep_
    if dep in SUBJECTS:
        return "1"
    if dep in {"aux", "auxpass", "cop", "neg"}:
        return "2"
    if dep in INDIRECTS:
        return "4-1"
    if dep in OBJECTS:
        direct_and_indirect = any(child.dep_ in INDIRECTS for child in head.children)
        return "4-2" if direct_and_indirect else "4"
    if dep in COMPLEMENTS:
        if dep == "oprd" or (dep == "acomp" and any(child.dep_ in OBJECTS for child in head.children)):
            return "5"
        return "3"
    if dep in {"ccomp", "xcomp"}:
        return "4"
    if dep in ADVERBIALS:
        return "6"
    # Determiners, compounds, modifiers and punctuation inherit their phrase.
    if branch != token and branch.dep_ not in {"ROOT", "punct"}:
        return room_for(branch)
    return "6"


def analyze(doc, source):
    words = [token for token in doc if not token.is_space]
    predicates = [token for token in words if is_predicate(token)]
    if not words or not predicates:
        return {"eligible": False, "roomBlocks": [], "pattern": "", "difficulty": 0,
                "analysisType": "fragment", "analysisVersion": VERSION,
                "reviewStatus": "machine_fragment", "clauseCount": 0}
    roles = []
    for index, token in enumerate(words):
        if token.is_punct:
            role = roles[-1] if roles else None
            if role is None:
                following = next((word for word in words[index + 1:] if not word.is_punct), None)
                role = room_for(following) if following is not None else "6"
        else:
            role = room_for(token)
        roles.append(role)
    blocks = []
    start = words[0].idx
    current = roles[0]
    for i in range(1, len(words)):
        if roles[i] != current:
            value = source[start:words[i].idx].strip()
            if value:
                blocks.append({"room": current, "text": value})
            start = words[i].idx
            current = roles[i]
    value = source[start:].strip()
    if value:
        blocks.append({"room": current, "text": value})
    # Long noun/adverbial phrases need several cards to stay readable on mobile.
    readable_blocks = []
    for block in blocks:
        pieces = textwrap.wrap(block["text"], width=64, break_long_words=False, break_on_hyphens=False)
        readable_blocks.extend({"room": block["room"], "text": piece} for piece in pieces)
    blocks = readable_blocks
    # Adjacent fragments can contain multiple conventional punctuation tokens.
    assert blocks and all(b["room"] in ROOMS and b["text"] for b in blocks)
    complexity = len(predicates) + len(blocks) // 3 + (len(words) >= 18) + (len(words) >= 35)
    return {"eligible": True, "roomBlocks": blocks,
            "pattern": "-".join(block["room"] for block in blocks),
            "difficulty": min(6, max(1, complexity)),
            "analysisType": "clause_structure", "analysisVersion": VERSION,
            "reviewStatus": "machine_unreviewed", "clauseCount": len(predicates)}


def main():
    nlp = spacy.load("en_core_web_sm", disable=["ner"])
    manifest = json.loads(DESTINATION.read_text(encoding="utf-8"))
    manifest["analysisVersion"] = VERSION
    counts = Counter()
    for summary in manifest["courses"]:
        path = BOOK_DIR / f"{summary['workId']}.json"
        course = json.loads(path.read_text(encoding="utf-8"))
        records = course["sentences"]
        for index, doc in enumerate(nlp.pipe((record["sourceSentence"] for record in records), batch_size=128)):
            record = records[index]
            record.update(analyze(doc, record["sourceSentence"]))
            counts[record["analysisType"]] += 1
        summary["puzzles"] = sum(record["eligible"] for record in records)
        summary["fragments"] = len(records) - summary["puzzles"]
        path.write_text(json.dumps(course, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{summary['workId']}: {len(records)} analyzed, {summary['puzzles']} puzzles", flush=True)
    assert sum(counts.values()) == sum(item["total"] for item in manifest["courses"])
    DESTINATION.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(dict(counts))


if __name__ == "__main__":
    main()
