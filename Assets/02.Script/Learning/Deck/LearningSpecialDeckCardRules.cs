using System;
using UnityEngine;

public static class LearningSpecialDeckCardRules
{
    public static bool TryGetDrawAmount(LearningDeckCard card, out int amount)
    {
        amount = 0;
        if (card == null) return false;

        string key = !string.IsNullOrWhiteSpace(card.id) ? card.id : card.displayName;
        if (string.IsNullOrWhiteSpace(key)) return false;

        key = key.Trim().ToLowerInvariant();
        if (key.StartsWith("get2", StringComparison.Ordinal) || key == "get_2")
        {
            amount = 2;
            return true;
        }

        if (key.StartsWith("get3", StringComparison.Ordinal) || key == "get_3")
        {
            amount = 3;
            return true;
        }

        return false;
    }

    public static bool CreatesTemporaryCards(LearningDeckCard card)
    {
        if (card == null) return false;
        string key = !string.IsNullOrWhiteSpace(card.id) ? card.id : card.displayName;
        if (string.IsNullOrWhiteSpace(key)) return false;
        key = key.Trim().ToLowerInvariant();
        return key.StartsWith("get2", StringComparison.Ordinal) ||
               key == "get_2" ||
               key.StartsWith("get3", StringComparison.Ordinal) ||
               key == "get_3";
    }

    public static string GetCardLabel(LearningDeckCard card)
    {
        if (card == null) return string.Empty;
        if (TryGetDrawAmount(card, out _)) return card.displayName;
        return LearningCardDisplayUtility.GetPosLabel(card.pos);
    }

    public static string GetCardLabelWithStats(LearningDeckCard card)
    {
        if (card == null) return string.Empty;

        string label = GetCardLabel(card);
        string stats = string.Empty;
        if (card.bonusScore != 0)
        {
            stats += card.bonusScore > 0 ? $"+{card.bonusScore}" : card.bonusScore.ToString();
        }

        if (card.multiplier > 0f && Mathf.Abs(card.multiplier - 1f) > 0.001f)
        {
            if (!string.IsNullOrEmpty(stats)) stats += " ";
            stats += $"x{card.multiplier:0.##}";
        }

        return string.IsNullOrEmpty(stats) ? label : $"{label}\n{stats}";
    }
}
