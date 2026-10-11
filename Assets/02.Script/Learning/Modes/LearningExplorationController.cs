using UnityEngine;

public class LearningExplorationController : MonoBehaviour
{
    [SerializeField] private LearningRoundController roundController;
    [SerializeField] private LearningItemInventory inventory;

    public int chapter = 1;
    public int blindIndex;
    public LearningBlindRule CurrentBlindRule { get; private set; } = LearningBlindRule.None;
    public bool IsWaitingForShop => LearningExplorationRunState.ShopPending;

    private void Awake()
    {
        if (roundController == null) roundController = GetComponent<LearningRoundController>();
        if (roundController == null) roundController = gameObject.AddComponent<LearningRoundController>();
        if (inventory == null) inventory = GetComponent<LearningItemInventory>();
    }

    private void Start()
    {
        StartOrContinueRun();
    }

    public void StartOrContinueRun()
    {
        if (!LearningExplorationRunState.HasActiveRun)
        {
            LearningExplorationRunState.StartNewRun();
        }

        chapter = LearningExplorationRunState.Chapter;
        if (LearningExplorationRunState.ShopPending)
        {
            return;
        }

        int savedBlindIndex = LearningExplorationRunState.BlindIndex;
        LearningBlindRuleType savedRule = LearningExplorationRunState.BlindRule;

        if (savedBlindIndex >= 2)
        {
            StartBigBlind(savedRule == LearningBlindRuleType.None ? LearningBlindRuleType.NumberBlind : savedRule);
        }
        else
        {
            StartSmallBlind(savedBlindIndex);
        }
    }

    public void StartSmallBlind(int index)
    {
        blindIndex = Mathf.Clamp(index, 0, 1);
        CurrentBlindRule = LearningBlindRule.None;
        roundController.cardDisplayMode = LearningCardDisplayMode.Pos;
        LearningExplorationRunState.SetShopPending(false);
        LearningExplorationRunState.Save(chapter, blindIndex, LearningBlindRuleType.None);
        roundController.StartRound(LearningModeType.Exploration, LearningPlayerProfile.ExplorationStage);
    }

    public void StartBigBlind(LearningBlindRuleType ruleType)
    {
        blindIndex = 2;
        CurrentBlindRule = new LearningBlindRule { ruleType = ruleType, displayName = ruleType.ToString(), description = string.Empty };
        roundController.cardDisplayMode = GetDisplayModeForBlind(ruleType);
        LearningExplorationRunState.SetShopPending(false);
        LearningExplorationRunState.Save(chapter, blindIndex, ruleType);
        roundController.StartRound(LearningModeType.Exploration, LearningPlayerProfile.ExplorationStage);
    }

    public bool BuyItem(LearningItemDefinition item)
    {
        return inventory != null && inventory.TryAdd(item);
    }

    public string CompleteCurrentBlind()
    {
        if (blindIndex <= 0)
        {
            LearningExplorationRunState.AddCoin(5);
            StartSmallBlind(1);
            return "+5G / 스몰 블라인드 2로 이동";
        }

        if (blindIndex == 1)
        {
            LearningExplorationRunState.AddCoin(5);
            StartBigBlind(LearningBlindRuleType.NumberBlind);
            return "+5G / 빅 블라인드로 이동";
        }

        LearningExplorationRunState.AddCoin(10);
        LearningExplorationRunState.SetShopPending(true);
        LearningExplorationRunState.SetRerollCount(0);
        LearningExplorationRunState.ClearShopOffers();
        return "+10G / 상점 입장";
    }

    public string ContinueAfterShop()
    {
        LearningExplorationRunState.SetShopPending(false);
        LearningExplorationRunState.ClearShopOffers();
        chapter = LearningExplorationRunState.Chapter + 1;
        StartSmallBlind(0);
        return $"챕터 {chapter} 시작";
    }

    private LearningCardDisplayMode GetDisplayModeForBlind(LearningBlindRuleType ruleType)
    {
        switch (ruleType)
        {
            case LearningBlindRuleType.ShapeBlind:
            case LearningBlindRuleType.ShowSymbolsOnly:
                return LearningCardDisplayMode.Shape;
            case LearningBlindRuleType.NumberBlind:
                return LearningCardDisplayMode.Number;
            default:
                return LearningCardDisplayMode.Pos;
        }
    }
}
