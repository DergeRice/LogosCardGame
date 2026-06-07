using System;
using System.Collections.Generic;
using UnityEngine;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "Deck", menuName = "Create Deck", order = 6)]
    public class DeckSO : ScriptableObject
    {
        public string DeckName = "New Deck";
        public List<DeckEntry> Entries = new List<DeckEntry>();

        public List<CardSO> CreateCardList(bool cloneCards = true)
        {
            var result = new List<CardSO>();
            foreach (var entry in Entries)
            {
                if (entry.Card == null || entry.Count <= 0) continue;
                for (int i = 0; i < entry.Count; i++)
                {
                    result.Add(cloneCards ? entry.Card.CreateClone() : entry.Card);
                }
            }
            return result;
        }
    }

    [Serializable]
    public class DeckEntry
    {
        public CardSO Card;
        public int Count = 1;
    }
}
