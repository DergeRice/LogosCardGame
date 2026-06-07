using System;

[Serializable]
public struct EquipmentTriggerStep
{
    public string equipmentTitle;
    public bool triggered;

    // e.g. "+12" or "x1.5"
    public string deltaText;

    public int scoreBefore;
    public int scoreAfter;
}
