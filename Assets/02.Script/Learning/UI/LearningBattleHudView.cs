using TMPro;
using UnityEngine;

public class LearningBattleHudView : MonoBehaviour
{
    public TMP_Text titleText;
    public TMP_Text hpText;
    public TMP_Text countText;
    public TMP_Text messageText;

    public void SetTitle(string value)
    {
        if (titleText != null) titleText.text = value;
    }

    public void SetHp(int hp, int maxHp)
    {
        if (hpText != null) hpText.text = $"HP {LearningNumberFormatter.Format(hp)}/{LearningNumberFormatter.Format(maxHp)}";
    }

    public void SetCounts(int hands, int drops, int drawCount, int discardCount)
    {
        if (countText != null) countText.text = $"제출 {hands} / 버리기 {drops} / 덱 {drawCount} / 버린덱 {discardCount}";
    }

    public void SetMessage(string value)
    {
        if (messageText != null) messageText.text = value;
    }
}
