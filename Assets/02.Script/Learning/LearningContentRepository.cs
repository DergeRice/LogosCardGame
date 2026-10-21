using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using UnityEngine;

public static class LearningContentRepository
{
    private const string SentencePathPrefix = "Learning/sentences_";
    private const string StageConfigPath = "Learning/stage_configs";

    private static readonly Dictionary<LearningTier, LearningSentenceSet> SentenceSets = new Dictionary<LearningTier, LearningSentenceSet>();
    private static LearningStageConfigSet _stageConfigs;

    public static LearningStageConfig GetStageConfig(int stage)
    {
        EnsureStageConfigsLoaded();
        if (_stageConfigs == null || _stageConfigs.stages == null || _stageConfigs.stages.Count == 0)
            return null;

        for (int i = 0; i < _stageConfigs.stages.Count; i++)
        {
            if (_stageConfigs.stages[i].stage == stage)
                return _stageConfigs.stages[i];
        }

        return _stageConfigs.stages[_stageConfigs.stages.Count - 1];
    }

    public static LearningSentenceData PickSentenceForStage(int stage)
    {
        LearningStageConfig config = GetStageConfig(stage);
        if (config == null) return null;

        SentencePatternType pattern = PickPattern(config.patternProbabilities);
        LearningSentenceSet set = GetSentenceSet(config.tier);
        if (set == null || set.sentences == null || set.sentences.Count == 0) return null;

        var candidates = set.sentences.Where(s => s != null && s.patternType == pattern).ToList();
        if (candidates.Count == 0)
        {
            candidates = set.sentences;
        }

        return candidates[Random.Range(0, candidates.Count)];
    }

    public static LearningSentenceSet GetSentenceSet(LearningTier tier)
    {
        if (SentenceSets.TryGetValue(tier, out var cached))
            return cached;

        string path = SentencePathPrefix + tier.ToString().ToLowerInvariant();
        TextAsset asset = Resources.Load<TextAsset>(path);
        if (asset == null)
        {
            Debug.LogWarning($"[LearningContentRepository] Missing sentence set: Resources/{path}.json");
            return null;
        }

        var set = JsonConvert.DeserializeObject<LearningSentenceSet>(asset.text);
        SentenceSets[tier] = set;
        return set;
    }

    private static void EnsureStageConfigsLoaded()
    {
        if (_stageConfigs != null) return;

        TextAsset asset = Resources.Load<TextAsset>(StageConfigPath);
        if (asset == null)
        {
            Debug.LogWarning($"[LearningContentRepository] Missing stage configs: Resources/{StageConfigPath}.json");
            return;
        }

        _stageConfigs = JsonConvert.DeserializeObject<LearningStageConfigSet>(asset.text);
    }

    private static SentencePatternType PickPattern(List<PatternProbability> probabilities)
    {
        if (probabilities == null || probabilities.Count == 0)
            return SentencePatternType.Type3;

        int total = 0;
        for (int i = 0; i < probabilities.Count; i++)
        {
            total += Mathf.Max(0, probabilities[i].weight);
        }

        if (total <= 0) return probabilities[0].patternType;

        int roll = Random.Range(0, total);
        int acc = 0;
        for (int i = 0; i < probabilities.Count; i++)
        {
            acc += Mathf.Max(0, probabilities[i].weight);
            if (roll < acc) return probabilities[i].patternType;
        }

        return probabilities[probabilities.Count - 1].patternType;
    }
}

