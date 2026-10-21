using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEditor;
using UnityEngine;

public static class LearningDataGenerator
{
    private const string OutputFolder = "Assets/Resources/Learning";

    [MenuItem("Learning/Generate Sentence Data (Bronze-Silver-Gold)")]
    public static void Generate()
    {
        EnsureFolder(OutputFolder);

        WriteSentenceSet(LearningTier.Bronze, "bronze", BuildTierSet(LearningTier.Bronze));
        WriteSentenceSet(LearningTier.Silver, "silver", BuildTierSet(LearningTier.Silver));
        WriteSentenceSet(LearningTier.Gold, "gold", BuildTierSet(LearningTier.Gold));
        WriteStageConfigs();

        AssetDatabase.Refresh();
        Debug.Log("[LearningDataGenerator] Generated 1200 sentences and 20 stage configs.");
    }

    private static LearningSentenceSet BuildTierSet(LearningTier tier)
    {
        var set = new LearningSentenceSet { tier = tier };
        AddSentences(set, tier, SentencePatternType.Type1, 40);
        AddSentences(set, tier, SentencePatternType.Type2, 60);
        AddSentences(set, tier, SentencePatternType.Type3, 100);
        AddSentences(set, tier, SentencePatternType.Type4, 100);
        AddSentences(set, tier, SentencePatternType.Type5, 100);
        return set;
    }

    private static void AddSentences(LearningSentenceSet set, LearningTier tier, SentencePatternType pattern, int count)
    {
        for (int i = 0; i < count; i++)
        {
            set.sentences.Add(BuildSentence(tier, pattern, i));
        }
    }

    private static LearningSentenceData BuildSentence(LearningTier tier, SentencePatternType pattern, int index)
    {
        WordBank bank = WordBank.ForTier(tier);
        var tokens = new List<LearningTokenData>();

        switch (pattern)
        {
            case SentencePatternType.Type1:
                Add(tokens, Pick(bank.subjects, index), Pick(bank.subjectPos, index));
                Add(tokens, Pick(bank.intransitiveVerbs, index), LearningPosType.VB);
                if (index % 3 == 0) Add(tokens, Pick(bank.adverbs, index), LearningPosType.RB);
                break;

            case SentencePatternType.Type2:
                Add(tokens, Pick(bank.subjects, index), Pick(bank.subjectPos, index));
                Add(tokens, Pick(bank.beVerbs, index), LearningPosType.BE);
                if (index % 2 == 0) Add(tokens, Pick(bank.adjectives, index), LearningPosType.JJ);
                else Add(tokens, Pick(bank.nouns, index), LearningPosType.NNC);
                break;

            case SentencePatternType.Type3:
                Add(tokens, Pick(bank.subjects, index), Pick(bank.subjectPos, index));
                Add(tokens, Pick(bank.transitiveVerbs, index), LearningPosType.VB);
                AddArticleNoun(tokens, bank, index);
                break;

            case SentencePatternType.Type4:
                Add(tokens, Pick(bank.subjects, index), Pick(bank.subjectPos, index));
                Add(tokens, Pick(bank.giveVerbs, index), LearningPosType.VB);
                Add(tokens, Pick(bank.peopleObjects, index), LearningPosType.PRP);
                AddArticleNoun(tokens, bank, index + 3);
                break;

            case SentencePatternType.Type5:
                Add(tokens, Pick(bank.subjects, index), Pick(bank.subjectPos, index));
                Add(tokens, Pick(bank.objectComplementVerbs, index), LearningPosType.VB);
                AddArticleNoun(tokens, bank, index + 7);
                if (index % 2 == 0) Add(tokens, Pick(bank.adjectives, index + 1), LearningPosType.JJ);
                else Add(tokens, Pick(bank.nouns, index + 2), LearningPosType.NNC);
                break;
        }

        string id = $"{tier.ToString().ToLowerInvariant()}_{(int)pattern}_{index:000}";
        return new LearningSentenceData
        {
            id = id,
            tier = tier,
            patternType = pattern,
            fullSentence = BuildText(tokens),
            tokens = tokens,
            blanks = BuildBlanks(tokens, pattern, index),
        };
    }

    private static List<LearningBlankData> BuildBlanks(List<LearningTokenData> tokens, SentencePatternType pattern, int seed)
    {
        var blanks = new List<LearningBlankData>();
        if (tokens == null || tokens.Count == 0) return blanks;

        // Always include core grammar slots first.
        AddBlankIfPossible(blanks, tokens, LearningPosType.VB);
        if (pattern == SentencePatternType.Type2) AddBlankIfPossible(blanks, tokens, LearningPosType.BE);
        if (pattern == SentencePatternType.Type3 || pattern == SentencePatternType.Type4 || pattern == SentencePatternType.Type5)
            AddBlankIfPossible(blanks, tokens, LearningPosType.NNC);
        if (pattern == SentencePatternType.Type5) AddBlankIfPossible(blanks, tokens, LearningPosType.JJ);

        // Add one rotating extra slot for variety.
        int idx = seed % tokens.Count;
        if (!ContainsTokenIndex(blanks, idx))
        {
            blanks.Add(new LearningBlankData { tokenIndex = idx, requiredPos = tokens[idx].pos });
        }

        blanks.Sort((a, b) => a.tokenIndex.CompareTo(b.tokenIndex));
        return blanks;
    }

    private static void AddBlankIfPossible(List<LearningBlankData> blanks, List<LearningTokenData> tokens, LearningPosType pos)
    {
        for (int i = 0; i < tokens.Count; i++)
        {
            if (tokens[i].pos != pos) continue;
            if (ContainsTokenIndex(blanks, i)) continue;
            blanks.Add(new LearningBlankData { tokenIndex = i, requiredPos = pos });
            return;
        }
    }

    private static bool ContainsTokenIndex(List<LearningBlankData> blanks, int index)
    {
        for (int i = 0; i < blanks.Count; i++)
        {
            if (blanks[i].tokenIndex == index) return true;
        }
        return false;
    }

    private static void AddArticleNoun(List<LearningTokenData> tokens, WordBank bank, int index)
    {
        Add(tokens, index % 2 == 0 ? "a" : "the", index % 2 == 0 ? LearningPosType.DT_AN : LearningPosType.DT_THE);
        if (index % 3 == 0) Add(tokens, Pick(bank.adjectives, index), LearningPosType.JJ);
        Add(tokens, Pick(bank.nouns, index), LearningPosType.NNC);
    }

    private static void Add(List<LearningTokenData> tokens, string text, LearningPosType pos)
    {
        tokens.Add(new LearningTokenData { text = text, pos = pos });
    }

    private static string Pick(List<string> list, int index)
    {
        if (list == null || list.Count == 0) return string.Empty;
        return list[Mathf.Abs(index) % list.Count];
    }

    private static LearningPosType Pick(List<LearningPosType> list, int index)
    {
        if (list == null || list.Count == 0) return LearningPosType.NNC;
        return list[Mathf.Abs(index) % list.Count];
    }

    private static string BuildText(List<LearningTokenData> tokens)
    {
        var words = new List<string>();
        for (int i = 0; i < tokens.Count; i++)
        {
            words.Add(tokens[i].text);
        }
        string s = string.Join(" ", words);
        return char.ToUpperInvariant(s[0]) + s.Substring(1) + ".";
    }

    private static void WriteSentenceSet(LearningTier tier, string fileName, LearningSentenceSet set)
    {
        string path = $"{OutputFolder}/sentences_{fileName}.json";
        File.WriteAllText(path, JsonConvert.SerializeObject(set, Formatting.Indented));
    }

    private static void WriteStageConfigs()
    {
        var set = new LearningStageConfigSet();
        for (int stage = 1; stage <= LearningPlayerProfile.MaxStage; stage++)
        {
            set.stages.Add(BuildStage(stage));
        }

        File.WriteAllText($"{OutputFolder}/stage_configs.json", JsonConvert.SerializeObject(set, Formatting.Indented));
    }

    private static LearningStageConfig BuildStage(int stage)
    {
        var config = new LearningStageConfig();
        config.stage = stage;
        config.tier = stage <= 10 ? LearningTier.Bronze : stage <= 20 ? LearningTier.Silver : LearningTier.Gold;
        config.blanksMin = stage <= 3 ? 1 : stage <= 15 ? 2 : 3;
        config.blanksMax = stage <= 5 ? 2 : stage <= 20 ? 3 : 4;
        config.aiAnswerSeconds = Mathf.Max(2.2f, 9.0f - stage * 0.18f);
        config.staminaCost = 1;
        config.itemSlots = stage <= 10 ? 0 : stage <= 20 ? 1 : 2;

        int t1;
        int t2;
        int t3;
        int t4;
        int t5;

        if (stage == 1) { t1 = 30; t2 = 40; t3 = 10; t4 = 10; t5 = 10; }
        else if (stage == 2) { t1 = 20; t2 = 35; t3 = 20; t4 = 15; t5 = 10; }
        else if (stage == 3) { t1 = 10; t2 = 35; t3 = 30; t4 = 15; t5 = 10; }
        else
        {
            float p = (stage - 4) / 26f;
            t1 = Mathf.RoundToInt(Mathf.Lerp(10, 3, p));
            t2 = Mathf.RoundToInt(Mathf.Lerp(30, 12, p));
            t3 = Mathf.RoundToInt(Mathf.Lerp(30, 28, p));
            t4 = Mathf.RoundToInt(Mathf.Lerp(18, 28, p));
            t5 = 100 - t1 - t2 - t3 - t4;
        }

        config.patternProbabilities.Add(new PatternProbability { patternType = SentencePatternType.Type1, weight = t1 });
        config.patternProbabilities.Add(new PatternProbability { patternType = SentencePatternType.Type2, weight = t2 });
        config.patternProbabilities.Add(new PatternProbability { patternType = SentencePatternType.Type3, weight = t3 });
        config.patternProbabilities.Add(new PatternProbability { patternType = SentencePatternType.Type4, weight = t4 });
        config.patternProbabilities.Add(new PatternProbability { patternType = SentencePatternType.Type5, weight = t5 });
        return config;
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;

        string[] parts = path.Split('/');
        string current = parts[0];
        for (int i = 1; i < parts.Length; i++)
        {
            string next = current + "/" + parts[i];
            if (!AssetDatabase.IsValidFolder(next))
            {
                AssetDatabase.CreateFolder(current, parts[i]);
            }
            current = next;
        }
    }

    private sealed class WordBank
    {
        public List<string> subjects = new List<string>();
        public List<LearningPosType> subjectPos = new List<LearningPosType>();
        public List<string> nouns = new List<string>();
        public List<string> peopleObjects = new List<string>();
        public List<string> beVerbs = new List<string>();
        public List<string> intransitiveVerbs = new List<string>();
        public List<string> transitiveVerbs = new List<string>();
        public List<string> giveVerbs = new List<string>();
        public List<string> objectComplementVerbs = new List<string>();
        public List<string> adjectives = new List<string>();
        public List<string> adverbs = new List<string>();

        public static WordBank ForTier(LearningTier tier)
        {
            var b = new WordBank();
            b.subjects.AddRange(new[] { "I", "you", "we", "they", "Tom", "Mina", "the boy", "the girl" });
            b.subjectPos.AddRange(new[] { LearningPosType.PRP, LearningPosType.PRP, LearningPosType.PRP, LearningPosType.PRP, LearningPosType.PROPN, LearningPosType.PROPN, LearningPosType.NNC, LearningPosType.NNC });
            b.beVerbs.AddRange(new[] { "am", "are", "is", "was", "were" });

            if (tier == LearningTier.Bronze)
            {
                b.nouns.AddRange(new[] { "book", "ball", "song", "cake", "desk", "apple", "story", "picture" });
                b.peopleObjects.AddRange(new[] { "me", "you", "him", "her", "us", "them" });
                b.intransitiveVerbs.AddRange(new[] { "run", "sleep", "walk", "swim", "jump", "smile", "laugh", "dance" });
                b.transitiveVerbs.AddRange(new[] { "read", "like", "make", "draw", "eat", "watch", "find", "open" });
                b.giveVerbs.AddRange(new[] { "give", "show", "send", "teach", "tell", "bring", "buy", "make" });
                b.objectComplementVerbs.AddRange(new[] { "make", "call", "find", "keep", "paint", "name", "leave", "think" });
                b.adjectives.AddRange(new[] { "happy", "big", "small", "new", "red", "kind", "clean", "fast" });
                b.adverbs.AddRange(new[] { "quickly", "slowly", "well", "today", "outside", "often" });
            }
            else if (tier == LearningTier.Silver)
            {
                b.nouns.AddRange(new[] { "letter", "answer", "lesson", "problem", "movie", "garden", "message", "project" });
                b.peopleObjects.AddRange(new[] { "me", "you", "him", "her", "the teacher", "my friend", "the team" });
                b.intransitiveVerbs.AddRange(new[] { "arrive", "travel", "remain", "listen", "practice", "wait", "exercise", "compete" });
                b.transitiveVerbs.AddRange(new[] { "solve", "describe", "explain", "choose", "protect", "prepare", "discover", "remember" });
                b.giveVerbs.AddRange(new[] { "give", "offer", "lend", "promise", "show", "teach", "send", "hand" });
                b.objectComplementVerbs.AddRange(new[] { "make", "consider", "find", "keep", "call", "name", "leave", "prove" });
                b.adjectives.AddRange(new[] { "careful", "useful", "bright", "quiet", "honest", "ready", "popular", "simple" });
                b.adverbs.AddRange(new[] { "carefully", "quietly", "usually", "early", "together", "clearly" });
            }
            else
            {
                b.nouns.AddRange(new[] { "evidence", "decision", "solution", "experiment", "article", "community", "strategy", "relationship" });
                b.peopleObjects.AddRange(new[] { "me", "you", "the audience", "the committee", "the student", "the researcher", "the client" });
                b.intransitiveVerbs.AddRange(new[] { "emerge", "hesitate", "respond", "participate", "recover", "survive", "cooperate", "adapt" });
                b.transitiveVerbs.AddRange(new[] { "analyze", "evaluate", "compare", "support", "challenge", "investigate", "predict", "interpret" });
                b.giveVerbs.AddRange(new[] { "grant", "offer", "assign", "recommend", "award", "teach", "send", "show" });
                b.objectComplementVerbs.AddRange(new[] { "make", "consider", "find", "keep", "call", "declare", "prove", "render" });
                b.adjectives.AddRange(new[] { "reliable", "significant", "complex", "effective", "logical", "accurate", "available", "responsible" });
                b.adverbs.AddRange(new[] { "gradually", "effectively", "accurately", "frequently", "independently", "eventually" });
            }

            return b;
        }
    }
}
