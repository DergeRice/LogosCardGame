using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using UnityEngine;

[Serializable]
public class LogosLegacyRoomCorpus
{
    public int schemaVersion;
    public string prototype;
    public List<LogosLegacyRoomSentence> sentences = new List<LogosLegacyRoomSentence>();
}

[Serializable]
public class LogosLegacyBookCourses
{
    public int schemaVersion;
    public string prototype;
    public List<LogosLegacyBookCourse> courses = new List<LogosLegacyBookCourse>();
}

[Serializable]
public class LogosLegacyBookManifest
{
    public int schemaVersion;
    public List<LogosLegacyBookSummary> courses = new List<LogosLegacyBookSummary>();
}

[Serializable]
public class LogosLegacyBookSummary
{
    public string workId;
    public int total;
    public int puzzles;
    public int fragments;
}

[Serializable]
public class LogosLegacyBookCourse
{
    public string workId;
    public List<LogosLegacyRoomSentence> sentences = new List<LogosLegacyRoomSentence>();
}

[Serializable]
public class LogosLegacyRoomSentence
{
    public string id;
    public string sourceWorkId;
    public string sourceTitle;
    public string section;
    public string sourceSentence;
    public bool eligible;
    public List<LogosLegacyRoomBlock> roomBlocks = new List<LogosLegacyRoomBlock>();
    public string pattern;
    public int difficulty;
    public int confidence;
    public string reviewStatus;
    public string reason;
    public string analysisType;
    public string analysisVersion;
    public int clauseCount;
}

[Serializable]
public class LogosLegacyRoomBlock
{
    public string room;
    public string text;
}

public static class LogosLegacyRoomRepository
{
    private const string ResourcePath = "Learning/legacy_room_seed";
    private const string ManifestResourcePath = "Learning/legacy_book_manifest";
    private const string BookResourcePath = "Learning/Books/";
    private const string CursorKey = "learning.legacy.room.cursor";
    private const string SelectedWorkKey = "learning.legacy.room.selectedWork";
    private const string CompletionKeyPrefix = "learning.legacy.room.completed.";
    // Version 2 begins at the real first sentence. The former cursor only
    // counted selected puzzles and cannot represent unread sentences between them.
    // Keep that historical preference intact instead of misreporting it as full-book progress.
    private const string CoursePositionKeyPrefix = "learning.legacy.room.full.position.";
    private static LogosLegacyRoomCorpus cache;
    private static LogosLegacyBookManifest manifestCache;
    private static LogosLegacyBookCourse loadedCourse;

    public static string SelectedWorkId
    {
        get => PlayerPrefs.GetString(SelectedWorkKey, "sherlock_holmes_adventures");
        set { PlayerPrefs.SetString(SelectedWorkKey, value ?? string.Empty); PlayerPrefs.Save(); }
    }

    public static LogosLegacyRoomSentence NextForStage(int stage)
    {
        LogosLegacyBookCourse course = GetCourse(SelectedWorkId);
        if (course != null && course.sentences.Count > 0)
        {
            int position = Mathf.Clamp(PlayerPrefs.GetInt(CoursePositionKeyPrefix + SelectedWorkId, 0), 0, course.sentences.Count - 1);
            return course.sentences[position];
        }

        EnsureLoaded();
        if (cache == null || cache.sentences == null || cache.sentences.Count == 0) return null;

        int minimumBlocks = stage < 12 ? 4 : 5;
        List<LogosLegacyRoomSentence> candidates = cache.sentences
            .Where(sentence => IsDisplayReady(sentence) && sentence.sourceWorkId == SelectedWorkId && sentence.roomBlocks.Count >= minimumBlocks)
            .ToList();
        if (candidates.Count == 0)
            candidates = cache.sentences.Where(sentence => IsDisplayReady(sentence) && sentence.sourceWorkId == SelectedWorkId).ToList();
        if (candidates.Count == 0)
            candidates = cache.sentences.Where(IsDisplayReady).ToList();
        if (candidates.Count == 0) return null;

        string cursorKey = CursorKey + "." + (string.IsNullOrEmpty(SelectedWorkId) ? "all" : SelectedWorkId);
        int cursor = Mathf.Abs(PlayerPrefs.GetInt(cursorKey, 0));
        candidates = candidates.OrderBy(sentence => StableSortKey(sentence.id)).ToList();
        LogosLegacyRoomSentence result = candidates[cursor % candidates.Count];
        PlayerPrefs.SetInt(cursorKey, cursor + 1);
        PlayerPrefs.Save();
        return result;
    }

    public static int GetProgressPercent(string workId)
    {
        if (string.IsNullOrEmpty(workId)) return 0;
        int courseTotal = GetCourseTotal(workId);
        if (courseTotal > 0)
        {
            int position = PlayerPrefs.GetInt(CoursePositionKeyPrefix + workId, 0);
            return Mathf.Clamp(Mathf.RoundToInt(position * 100f / courseTotal), 0, 100);
        }
        EnsureLoaded();
        if (cache == null) return 0;
        int total = cache.sentences.Count(sentence => IsDisplayReady(sentence) && sentence.sourceWorkId == workId);
        if (total <= 0) return 0;
        int completed = PlayerPrefs.GetInt(CompletionKeyPrefix + workId, 0);
        return Mathf.Clamp(Mathf.RoundToInt(completed * 100f / total), 0, 100);
    }

    public static void GetProgressCounts(string workId, out int completed, out int total)
    {
        int courseTotal = GetCourseTotal(workId);
        if (courseTotal > 0)
        {
            total = courseTotal;
            completed = Mathf.Clamp(PlayerPrefs.GetInt(CoursePositionKeyPrefix + workId, 0), 0, total);
            return;
        }
        EnsureLoaded();
        total = cache?.sentences?.Count(sentence => IsDisplayReady(sentence) && sentence.sourceWorkId == workId) ?? 0;
        completed = Mathf.Clamp(PlayerPrefs.GetInt(CompletionKeyPrefix + workId, 0), 0, total);
    }

    public static void RecordCompletion(LogosLegacyRoomSentence sentence)
    {
        if (sentence == null || string.IsNullOrEmpty(sentence.sourceWorkId)) return;
        LogosLegacyBookCourse course = GetCourse(sentence.sourceWorkId);
        if (course != null && course.sentences.Count > 0)
        {
            string key = CoursePositionKeyPrefix + sentence.sourceWorkId;
            int position = Mathf.Clamp(PlayerPrefs.GetInt(key, 0), 0, course.sentences.Count);
            if (position < course.sentences.Count && course.sentences[position].id == sentence.id)
            {
                PlayerPrefs.SetInt(key, position + 1);
                PlayerPrefs.Save();
            }
            return;
        }
        string completionKey = CompletionKeyPrefix + sentence.sourceWorkId;
        PlayerPrefs.SetInt(completionKey, PlayerPrefs.GetInt(completionKey, 0) + 1);
        PlayerPrefs.Save();
    }

    public static bool IsCourseComplete(string workId)
    {
        int total = GetCourseTotal(workId);
        return total > 0 && PlayerPrefs.GetInt(CoursePositionKeyPrefix + workId, 0) >= total;
    }

    private static bool IsDisplayReady(LogosLegacyRoomSentence sentence)
    {
        if (sentence == null || !sentence.eligible || sentence.roomBlocks == null || sentence.roomBlocks.Count < 2) return false;
        string text = sentence.sourceSentence?.Trim();
        if (string.IsNullOrEmpty(text) || text.Length < 12 || text.Length > 140) return false;
        if (!char.IsUpper(text[0]) || !(text.EndsWith(".") || text.EndsWith("!") || text.EndsWith("?"))) return false;

        string lower = text.ToLowerInvariant();
        string[] rejectedFragments =
        {
            " mr.", " mrs.", " dr.", " tha'rt", " th' ", " dunna", " ye ", " o' ",
            " thee ", " thou ", " thy ", " to do.", " to be.", " to have.", " to make.",
            " to take.", " to get.", " to give.", " to go.", " to come."
        };
        for (int i = 0; i < rejectedFragments.Length; i++)
        {
            if (lower.Contains(rejectedFragments[i])) return false;
        }
        return true;
    }

    private static uint StableSortKey(string value)
    {
        unchecked
        {
            uint hash = 2166136261;
            if (!string.IsNullOrEmpty(value))
            {
                for (int i = 0; i < value.Length; i++) hash = (hash ^ value[i]) * 16777619;
            }
            return hash;
        }
    }

    public static string GetRoomLabel(string room)
    {
        switch (room)
        {
            case "1": return "1  주어";
            case "2": return "2  서술어";
            case "3": return "3  주격보어";
            case "4": return "4  목적어";
            case "4-1": return "4-1  간접목적어";
            case "4-2": return "4-2  직접목적어";
            case "5": return "5  목적격보어";
            case "6": return "6  부사어";
            default: return room;
        }
    }

    private static void EnsureLoaded()
    {
        if (cache != null) return;
        TextAsset asset = Resources.Load<TextAsset>(ResourcePath);
        if (asset == null)
        {
            Debug.LogWarning("[LogosLegacyRoomRepository] Missing legacy_room_seed.json.");
            return;
        }
        cache = JsonConvert.DeserializeObject<LogosLegacyRoomCorpus>(asset.text);
    }

    private static LogosLegacyBookCourse GetCourse(string workId)
    {
        if (string.IsNullOrEmpty(workId)) return null;
        if (loadedCourse != null && loadedCourse.workId == workId) return loadedCourse;
        TextAsset asset = Resources.Load<TextAsset>(BookResourcePath + workId);
        if (asset == null) return null;
        loadedCourse = JsonConvert.DeserializeObject<LogosLegacyBookCourse>(asset.text);
        Resources.UnloadAsset(asset);
        return loadedCourse;
    }

    private static int GetCourseTotal(string workId)
    {
        if (manifestCache == null)
        {
            TextAsset asset = Resources.Load<TextAsset>(ManifestResourcePath);
            if (asset != null)
            {
                manifestCache = JsonConvert.DeserializeObject<LogosLegacyBookManifest>(asset.text);
                Resources.UnloadAsset(asset);
            }
        }
        LogosLegacyBookSummary summary = manifestCache?.courses?.FirstOrDefault(item => item.workId == workId);
        return summary?.total ?? 0;
    }
}
