using System;

[Serializable]
public struct RunEffect
{
    public RunEffectType type;

    public int intValue;
    public float floatValue;

    // Used for ids like "PRP" etc.
    public string stringValueA;
    public string stringValueB;
}
