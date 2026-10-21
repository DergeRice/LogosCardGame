public enum RunEffectType
{
    // Resources
    AddHands,
    AddDiscards,

    // Permanent score modifiers (apply every submit)
    PermanentAddBaseScore,
    PermanentMultiplyBaseScore,

    // Deck mutation (permanent)
    TransformOneDeckCard, // fromId -> toId
    TransformFirstFieldCard, // toId

    AddDeckCard, // stableId (stringValueA)
}
