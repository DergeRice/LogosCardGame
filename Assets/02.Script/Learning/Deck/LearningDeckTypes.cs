using System;
using System.Collections.Generic;

[Serializable]
public class LearningDeckCard
{
    public string id;
    public LearningPosType pos;
    public string displayName;
    public int bonusScore;
    public float multiplier = 1f;
    public bool temporary;
}

[Serializable]
public class LearningRunDeckState
{
    public List<LearningDeckCard> drawPile = new List<LearningDeckCard>();
    public List<LearningDeckCard> hand = new List<LearningDeckCard>();
    public List<LearningDeckCard> discardPile = new List<LearningDeckCard>();
    public List<LearningDeckCard> exhaustedTemporaryCards = new List<LearningDeckCard>();
}

[Serializable]
public class LearningDeckTemplate
{
    public string deckId;
    public string displayName;
    public List<LearningDeckCard> cards = new List<LearningDeckCard>();
}
