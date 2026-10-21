"""Build complete, source-ordered reading courses from the checked-in books.

The old course selected only easy, automatically parsed clauses. Version 2 keeps
narrative sentences in their original order. Unverified grammar stays reading-only.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Assets/StreamingAssets/LearningCorpus/LegacyPrototype"
DESTINATION = ROOT / "Assets/Resources/Learning/legacy_book_manifest.json"
BOOK_DIR = ROOT / "Assets/Resources/Learning/Books"

# One-based inclusive narrative bounds: exclude Gutenberg headers, contents,
# transcriber notes and license text without dropping any story passages.
BOUNDS = {
    "sherlock_holmes_adventures": (17, 6625),
    "secret_garden": (12, 5861),
    "railway_children": (36, 4252),
    "wonderful_wizard_of_oz": (43, 1995),
    "anne_of_green_gables": (10, 6821),
    "treasure_island": (54, 3506),
    "happy_prince_and_other_tales": (39, 963),
    "the_four_million": (7, 3305),
    "little_women": (8, 9322),
    "tale_of_peter_rabbit": (8, 105),
}

REJECTED = (" mr.", " mrs.", " dr.", " tha'rt", " th' ", " dunna", " ye ", " o' ", " thee ", " thou ", " thy ",
            " to do.", " to be.", " to have.", " to make.", " to take.", " to get.", " to give.", " to go.", " to come.")
ABBREVIATION = re.compile(r"(?<![A-Za-z])(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Prof|Rev|Capt|Gen|Col|Sgt|Pvt|Mme)\.$", re.I)
ROMAN_OR_HEADING = re.compile(r"^(?:[IVXLCDM]+\.|(?:CHAPTER|PART)\s+\S+.*)$", re.I)


def display_ready(sentence):
    text = sentence.get("sourceSentence", "").strip()
    blocks = sentence.get("roomBlocks") or []
    rooms = [block.get("room") for block in blocks]
    return (sentence.get("eligible") and len(blocks) >= 3 and len(set(rooms)) == len(rooms)
            and all(rooms) and all(block.get("text", "").strip() for block in blocks)
            and 12 <= len(text) <= 140 and text[:1].isupper() and text[-1:] in ".!?"
            and not any(fragment in text.lower() for fragment in REJECTED))


def is_book_text(text):
    stripped = text.strip()
    if not stripped or stripped.startswith("[Illustration") or stripped.startswith("* * *"):
        return False
    if ROMAN_OR_HEADING.fullmatch(stripped) or stripped.lower() in {"the end.", "introduction"}:
        return False
    if stripped.startswith("[_") or "_Facing page_" in stripped:
        return False
    if not any(mark in stripped for mark in ".!?") and len(stripped) < 55 and stripped.title() == stripped:
        return False
    return True


def compact_record(record):
    puzzle = display_ready(record)
    return {
        "id": record["id"], "sourceWorkId": record["sourceWorkId"],
        "sourceTitle": record["sourceTitle"], "section": record.get("section", ""),
        "sourceSentence": record["sourceSentence"], "eligible": bool(puzzle),
        "roomBlocks": record["roomBlocks"] if puzzle else [],
    }


def build_course(work):
    records = json.loads((SOURCE / f"{work}.json").read_text(encoding="utf-8"))["sentences"]
    first, last = BOUNDS[work]
    assert 1 <= first <= last <= len(records), work
    chosen = []
    for record in records[first - 1:last]:
        value = record["sourceSentence"].strip()
        if not is_book_text(value):
            continue
        # The legacy splitter broke proper titles ("Mrs. Rachel") into two
        # entries. Rejoin them so the reader never sees a false one-word page.
        previous = chosen[-1]["sourceSentence"].rstrip("\"'”’ ") if chosen else ""
        if chosen and (ABBREVIATION.search(previous) or previous.endswith("--")):
            chosen[-1]["sourceSentence"] += " " + value
            chosen[-1]["eligible"] = False
            chosen[-1]["roomBlocks"] = []
            continue
        clean = dict(record)
        clean["sourceSentence"] = value.replace("_", "")
        chosen.append(compact_record(clean))
    assert chosen and len({item["id"] for item in chosen}) == len(chosen), work
    return {"workId": work, "sentences": chosen}


def main():
    courses = [build_course(work) for work in BOUNDS]
    BOOK_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"schemaVersion": 3, "prototype": "legacy_room_number_01", "courses": []}
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    for course in courses:
        sentences = course["sentences"]
        (BOOK_DIR / f"{course['workId']}.json").write_text(json.dumps(course, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        payload["courses"].append({"workId": course["workId"], "total": len(sentences)})
        print(f"{course['workId']}: {len(sentences)} read, {sum(s['eligible'] for s in sentences)} puzzles")
    DESTINATION.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Total: {sum(len(c['sentences']) for c in courses)} sentences")


if __name__ == "__main__":
    main()
