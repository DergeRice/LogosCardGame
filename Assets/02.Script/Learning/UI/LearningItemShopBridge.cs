using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class LearningItemShopBridge : MonoBehaviour
{
    [SerializeField] private LearningModeType shopMode = LearningModeType.Exploration;
    [SerializeField] private TMP_Text statusText;
    [SerializeField] private TMP_Text[] offerTexts;

    private readonly List<LearningItemRecord> currentOffers = new List<LearningItemRecord>();
    private readonly List<string> previousOfferIds = new List<string>();

    private void OnEnable()
    {
        RollShop();
    }

    public void SetExplorationShop()
    {
        shopMode = LearningModeType.Exploration;
        RollShop();
    }

    public void SetBattleShop()
    {
        shopMode = LearningModeType.Battle;
        RollShop();
    }

    public void RollShop()
    {
        previousOfferIds.Clear();
        for (int i = 0; i < currentOffers.Count; i++)
        {
            previousOfferIds.Add(currentOffers[i].itemId);
        }

        int slotCount = shopMode == LearningModeType.Exploration ? LearningExplorationRunState.ShopSlots : 3;
        currentOffers.Clear();
        currentOffers.AddRange(LearningItemDatabase.RollShopItems(shopMode, slotCount, previousOfferIds));
        Refresh();
    }

    public void BuyOffer0() => BuyOffer(0);
    public void BuyOffer1() => BuyOffer(1);
    public void BuyOffer2() => BuyOffer(2);
    public void BuyOffer3() => BuyOffer(3);
    public void BuyOffer4() => BuyOffer(4);

    public void BuyOffer(int index)
    {
        if (index < 0 || index >= currentOffers.Count)
        {
            SetStatus("구매할 아이템이 없습니다.");
            return;
        }

        LearningItemRecord item = currentOffers[index];
        SetStatus($"{item.displayName} 구매 처리 예정. 재화 시스템 연결 후 실제 차감됩니다.");
    }

    private void Refresh()
    {
        if (offerTexts != null)
        {
            for (int i = 0; i < offerTexts.Length; i++)
            {
                if (offerTexts[i] == null) continue;
                offerTexts[i].text = i < currentOffers.Count ? FormatOffer(currentOffers[i]) : string.Empty;
            }
        }

        SetStatus($"{GetModeLabel(shopMode)} 상점 갱신: {currentOffers.Count}개");
    }

    private string FormatOffer(LearningItemRecord item)
    {
        return $"[{item.rarity}] {item.displayName}\n{LearningItemDatabase.GetPrice(item)}G\n{item.description}";
    }

    private string GetModeLabel(LearningModeType mode)
    {
        return mode == LearningModeType.Battle ? "대전" : "탐험";
    }

    private void SetStatus(string message)
    {
        if (statusText != null) statusText.text = message;
        Debug.Log($"[LearningItemShopBridge] {message}");
    }
}
