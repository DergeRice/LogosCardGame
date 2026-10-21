using System;

[Serializable]
public struct GrammarCheckResult
{
    public bool valid;

    // 0 = unknown/invalid, 1..5 = hand type
    public int handType;
}

