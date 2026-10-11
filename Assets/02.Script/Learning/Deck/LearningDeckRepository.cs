using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

public static class LearningDeckRepository
{
    private const string NaroDeckPath = "Learning/decks/naro_starting_deck";

    private static LearningDeckTemplate naroDeck;

    public static LearningDeckTemplate GetNaroStartingDeck()
    {
        if (naroDeck != null) return CloneTemplate(naroDeck);

        TextAsset asset = Resources.Load<TextAsset>(NaroDeckPath);
        if (asset == null)
        {
            Debug.LogWarning($"[LearningDeckRepository] Missing Resources/{NaroDeckPath}.json. Using fallback Naro deck.");
            naroDeck = BuildFallbackNaroDeck();
            return CloneTemplate(naroDeck);
        }

        naroDeck = JsonConvert.DeserializeObject<LearningDeckTemplate>(asset.text);
        return CloneTemplate(naroDeck);
    }

    public static LearningRunDeckState CreateRunDeckFromTemplate(LearningDeckTemplate template)
    {
        return CreateRunDeckFromTemplate(template, 5);
    }

    public static LearningRunDeckState CreateRunDeckFromTemplate(LearningDeckTemplate template, int startingHandSize)
    {
        var state = new LearningRunDeckState();
        if (template == null || template.cards == null) return state;

        for (int i = 0; i < template.cards.Count; i++)
        {
            state.drawPile.Add(CloneCard(template.cards[i]));
        }
        Shuffle(state.drawPile);
        Draw(state, Mathf.Max(0, startingHandSize));
        return state;
    }

    public static int Draw(LearningRunDeckState state, int count)
    {
        return DrawCards(state, count).Count;
    }

    public static List<LearningDeckCard> DrawCards(LearningRunDeckState state, int count)
    {
        if (state == null) return new List<LearningDeckCard>();
        var drawnCards = new List<LearningDeckCard>();
        for (int i = 0; i < count; i++)
        {
            if (state.drawPile.Count == 0)
            {
                RecycleDiscardIntoDraw(state);
            }

            if (state.drawPile.Count == 0) return drawnCards;
            LearningDeckCard card = state.drawPile[0];
            state.drawPile.RemoveAt(0);
            state.hand.Add(card);
            drawnCards.Add(card);
        }

        return drawnCards;
    }

    public static List<LearningDeckCard> CreateTemporaryCards(int count)
    {
        var result = new List<LearningDeckCard>();
        var candidates = BuildTemporaryCardPool();

        for (int i = 0; i < count && candidates.Count > 0; i++)
        {
            LearningDeckCard source = candidates[LearningRunRandom.Range(0, candidates.Count)];
            LearningDeckCard card = CloneCard(source);
            card.id = $"temp_{source.id}_{System.Guid.NewGuid():N}";
            card.temporary = true;
            result.Add(card);
        }

        return result;
    }

    private static List<LearningDeckCard> BuildTemporaryCardPool()
    {
        var candidates = new List<LearningDeckCard>();
        AddTemporaryCandidate(candidates, LearningPosType.NNU, "셀없명사", 4);
        AddTemporaryCandidate(candidates, LearningPosType.VB, "일반동사", 4);
        AddTemporaryCandidate(candidates, LearningPosType.PRP, "대명사", 1);
        AddTemporaryCandidate(candidates, LearningPosType.BE, "Be동사", 1);
        return candidates;
    }

    private static void AddTemporaryCandidate(List<LearningDeckCard> cards, LearningPosType pos, string displayName, int count)
    {
        for (int i = 0; i < count; i++)
        {
            cards.Add(new LearningDeckCard
            {
                id = $"temp_pool_{pos.ToString().ToLowerInvariant()}_{i + 1}",
                pos = pos,
                displayName = displayName,
                multiplier = 1f,
            });
        }
    }

    public static void DiscardHandCards(LearningRunDeckState state, List<int> handIndexes)
    {
        if (state == null || handIndexes == null) return;
        handIndexes.Sort((a, b) => b.CompareTo(a));
        for (int i = 0; i < handIndexes.Count; i++)
        {
            int index = handIndexes[i];
            if (index < 0 || index >= state.hand.Count) continue;

            LearningDeckCard card = state.hand[index];
            state.hand.RemoveAt(index);
            if (card.temporary) state.exhaustedTemporaryCards.Add(card);
            else state.discardPile.Add(card);
        }
    }

    public static int AddMissingTemplateCardsToDrawPile(LearningRunDeckState state, LearningDeckTemplate template)
    {
        if (state == null || template == null || template.cards == null) return 0;

        var existingIds = new HashSet<string>();
        AddIds(existingIds, state.drawPile);
        AddIds(existingIds, state.hand);
        AddIds(existingIds, state.discardPile);
        AddIds(existingIds, state.exhaustedTemporaryCards);

        int added = 0;
        for (int i = 0; i < template.cards.Count; i++)
        {
            LearningDeckCard card = template.cards[i];
            if (card == null || string.IsNullOrWhiteSpace(card.id)) continue;
            if (existingIds.Contains(card.id)) continue;

            state.drawPile.Add(CloneCard(card));
            existingIds.Add(card.id);
            added += 1;
        }

        if (added > 1) Shuffle(state.drawPile);
        return added;
    }

    private static void RecycleDiscardIntoDraw(LearningRunDeckState state)
    {
        if (state.discardPile.Count == 0) return;
        state.drawPile.AddRange(state.discardPile);
        state.discardPile.Clear();
        Shuffle(state.drawPile);
    }

    private static void AddIds(HashSet<string> target, List<LearningDeckCard> cards)
    {
        if (target == null || cards == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            if (card == null || string.IsNullOrWhiteSpace(card.id)) continue;
            target.Add(card.id);
        }
    }

    private static LearningDeckTemplate BuildFallbackNaroDeck()
    {
        var template = new LearningDeckTemplate
        {
            deckId = "naro_starting_deck",
            displayName = "Naro Deck",
        };

        Add(template.cards, LearningPosType.VB, "일반동사", 3);
        Add(template.cards, LearningPosType.BE, "Be동사", 1);
        Add(template.cards, LearningPosType.NNU, "셀없명사", 3);
        Add(template.cards, LearningPosType.PRP, "대명사", 2);
        Add(template.cards, LearningPosType.JJ, "형용사", 1);
        Add(template.cards, LearningPosType.WH, "Wh의문사", 1);
        AddSpecial(template.cards, "get2_1", "Get2");
        AddSpecial(template.cards, "get3_1", "Get3");
        return template;
    }

    private static void Add(List<LearningDeckCard> cards, LearningPosType pos, string displayName, int count)
    {
        for (int i = 0; i < count; i++)
        {
            cards.Add(new LearningDeckCard
            {
                id = $"{pos.ToString().ToLowerInvariant()}_{i + 1}",
                pos = pos,
                displayName = displayName,
                multiplier = 1f,
            });
        }
    }

    private static void AddSpecial(List<LearningDeckCard> cards, string id, string displayName)
    {
        cards.Add(new LearningDeckCard
        {
            id = id,
            pos = LearningPosType.RB,
            displayName = displayName,
            multiplier = 1f,
        });
    }

    private static LearningDeckTemplate CloneTemplate(LearningDeckTemplate source)
    {
        var clone = new LearningDeckTemplate
        {
            deckId = source.deckId,
            displayName = source.displayName,
            cards = new List<LearningDeckCard>(),
        };

        if (source.cards != null)
        {
            for (int i = 0; i < source.cards.Count; i++)
            {
                clone.cards.Add(CloneCard(source.cards[i]));
            }
        }
        return clone;
    }

    private static LearningDeckCard CloneCard(LearningDeckCard source)
    {
        LearningDeckCard card = new LearningDeckCard
        {
            id = source.id,
            pos = source.pos,
            displayName = source.displayName,
            bonusScore = source.bonusScore,
            multiplier = source.multiplier,
            temporary = source.temporary,
        };
        return card;
    }

    public static void Shuffle<T>(List<T> list)
    {
        for (int i = 0; i < list.Count - 1; i++)
        {
            int j = LearningRunRandom.Range(i, list.Count);
            T temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    }
}
