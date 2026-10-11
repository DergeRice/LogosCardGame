using System.Collections.Generic;
using DG.Tweening;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningExplorationShopUI : MonoBehaviour
{
    private const int DeckDeletePrice = 10;

    [SerializeField] private Canvas canvas;
    [SerializeField] private LearningExplorationController explorationController;
    [SerializeField] private LearningItemInventory inventory;
    [SerializeField] private LearningItemEffectExecutor effectExecutor;
    [SerializeField] private LearningPracticePrefabUI gameUI;
    [SerializeField] private LearningExplorationSentenceController sentenceController;
    [SerializeField] private LearningExplorationSentenceUI sentenceUI;
    [SerializeField] private TMP_FontAsset fontAsset;
    [SerializeField] private Sprite buttonSprite;
    [SerializeField] private Sprite itemIconSprite;
    [SerializeField] private Sprite cardIconSprite;
    [SerializeField] private Sprite coinIconSprite;
    [SerializeField] private GameObject coinHudPrefab;
    [SerializeField] private GameObject shopActionButtonPrefab;
    [SerializeField] private GameObject shopItemOfferPrefab;
    [SerializeField] private GameObject shopCardOfferPrefab;
    [SerializeField] private GameObject shopPanelPrefab;
    [Header("Shop Panel Prefab Bindings")]
    [SerializeField] private LearningShopItemOfferView[] itemOfferViews;
    [SerializeField] private LearningShopCardOfferView[] cardOfferViews;
    [SerializeField] private RectTransform itemOfferAnimationRoot;
    [SerializeField] private RectTransform cardOfferAnimationRoot;
    [SerializeField] private float offerEnterOffsetX = -300f;
    [SerializeField] private float offerEnterDuration = 0.22f;
    [SerializeField] private Ease offerEnterEase = Ease.OutCubic;

    private GameObject panel;
    private LearningShopPanelView panelView;
    private TMP_Text titleText;
    private TMP_Text statusText;
    private TMP_Text coinText;
    private LearningCurrencySlotView coinSlotView;
    private Transform itemOfferRoot;
    private Transform cardOfferRoot;
    private Transform inventoryRoot;
    private Button rerollButton;
    private TMP_Text rerollButtonText;
    private LearningShopActionButtonView deckDeleteButtonView;
    private Button deckDeleteButton;
    private TMP_Text deckDeleteButtonText;
    private GameObject deckDeletePopup;
    private Transform deckDeleteCardRoot;
    private TMP_Text deckDeletePopupTitleText;
    private GameObject deckDeleteConfirmRoot;
    private TMP_Text deckDeleteConfirmText;
    private ShopDeckCardOption selectedDeleteOption;
    private Vector2 itemOfferBasePosition;
    private Vector2 cardOfferBasePosition;
    private bool hasItemOfferBasePosition;
    private bool hasCardOfferBasePosition;
    private readonly List<LearningItemRecord> offers = new List<LearningItemRecord>();
    private readonly List<LearningDeckCard> cardOffers = new List<LearningDeckCard>();
    private readonly List<string> previousOfferIds = new List<string>();

    private class ShopDeckCardOption
    {
        public LearningDeckCard card;
        public List<LearningDeckCard> source;
        public int index;
    }

    public void Configure(
        Canvas targetCanvas,
        LearningItemInventory targetInventory,
        LearningItemEffectExecutor targetEffectExecutor,
        LearningExplorationSentenceController targetSentenceController,
        LearningExplorationSentenceUI targetSentenceUI,
        TMP_FontAsset targetFontAsset = null)
    {
        canvas = targetCanvas;
        inventory = targetInventory;
        effectExecutor = targetEffectExecutor;
        sentenceController = targetSentenceController;
        sentenceUI = targetSentenceUI;
        if (targetFontAsset != null) fontAsset = targetFontAsset;
    }

    private void Awake()
    {
        if (fontAsset == null) fontAsset = LearningFontProvider.DefaultFont;
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationController>();
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (effectExecutor == null) effectExecutor = FindFirstObjectByType<LearningItemEffectExecutor>();
        if (gameUI == null) gameUI = FindFirstObjectByType<LearningPracticePrefabUI>();
        if (sentenceController == null) sentenceController = FindFirstObjectByType<LearningExplorationSentenceController>();
        if (sentenceUI == null) sentenceUI = FindFirstObjectByType<LearningExplorationSentenceUI>();
        if (inventory != null) inventory.SetMaxSlots(LearningExplorationRunState.ItemSlots);
        if (inventory != null) inventory.LoadExplorationInventory();
        ResolveSkinSprites();
        BuildIfNeeded();
    }

    private void Start()
    {
        if (LearningExplorationRunState.ShopPending)
        {
            OpenShop();
        }
        else
        {
            CloseShop();
        }
    }

    public void OpenShop()
    {
        BuildIfNeeded();
        if (panel != null)
        {
            panel.SetActive(true);
            panel.transform.SetAsLastSibling();
        }
        if (gameUI != null) gameUI.SetGameplayVisible(false);
        if (sentenceUI != null) sentenceUI.SetGameplayVisible(false);
        if (LearningExplorationRunState.HasSavedShopOffers)
        {
            LoadSavedShop();
            RefreshOffers();
            RefreshHeader();
        }
        else
        {
            RollShop();
        }
        RefreshInventory();
        RefreshDeckDeleteButton();
        PlayOfferEnterAnimation();
        SetStatus("빅 블라인드 클리어. 상점에서 다음 여정을 준비하세요.");
    }

    public void CloseShop()
    {
        if (panel != null) panel.SetActive(false);
        if (gameUI != null) gameUI.SetGameplayVisible(true);
        if (sentenceUI != null) sentenceUI.SetGameplayVisible(true);
        sentenceUI?.RefreshItemSlotsNow();
    }

    public void RollShop()
    {
        previousOfferIds.Clear();
        for (int i = 0; i < offers.Count; i++)
        {
            previousOfferIds.Add(offers[i].itemId);
        }

        offers.Clear();
        offers.AddRange(LearningItemDatabase.RollShopItems(LearningModeType.Exploration, LearningExplorationRunState.ShopSlots, previousOfferIds));
        RollCardOffers(3);
        SaveCurrentShop();
        RefreshOffers();
        RefreshHeader();
    }

    public void PaidRerollShop()
    {
        int cost = GetRerollCost();
        LearningItemDefinition freeItem = GetFreeRerollItem();
        if (freeItem != null && freeItem.stackValue > 0)
        {
            freeItem.stackValue -= 1;
            bool consumed = freeItem.stackValue <= 0 && freeItem.removeWhenStackZero;
            if (consumed) inventory?.TryRemove(freeItem);
            else inventory?.SaveExplorationInventory();
            RollShop();
            RefreshInventory();
            sentenceUI?.RefreshItemSlotsNow();
            SetStatus(consumed ? "무료 리롤 묶음을 모두 사용했습니다." : $"무료 리롤 사용. 남은 무료 리롤 {freeItem.stackValue}");
            return;
        }

        if (!LearningExplorationRunState.TrySpendCoin(cost))
        {
            SetStatus($"리롤 비용 {cost}G가 부족합니다.");
            return;
        }

        LearningExplorationRunState.IncrementRerollCount();
        RollShop();
        SetStatus($"리롤 {cost}G 사용.");
    }

    public void ContinueRun()
    {
        string message;
        if (sentenceController != null) message = sentenceController.ContinueAfterShop();
        else if (explorationController != null) message = explorationController.ContinueAfterShop();
        else return;
        LearningExplorationRunState.ClearShopOffers();
        LearningExplorationRunState.SetRerollCount(0);
        CloseShop();
        if (gameUI != null) gameUI.ShowResult(message);
    }

    private bool LoadSavedShop()
    {
        offers.Clear();
        cardOffers.Clear();

        LearningSavedShopOffers saved = LearningExplorationRunState.LoadShopOffers();
        if (saved == null) return false;

        if (saved.itemIds != null)
        {
            for (int i = 0; i < saved.itemIds.Count; i++)
            {
                LearningItemRecord record = LearningItemDatabase.GetItemById(LearningModeType.Exploration, saved.itemIds[i]);
                if (record != null) offers.Add(record);
            }
        }

        if (saved.cardOffers != null)
        {
            for (int i = 0; i < saved.cardOffers.Count; i++)
            {
                LearningDeckCard card = saved.cardOffers[i];
                if (card != null) cardOffers.Add(CloneShopCard(card));
            }
        }

        return offers.Count > 0 || cardOffers.Count > 0;
    }

    private void SaveCurrentShop()
    {
        var itemIds = new List<string>();
        for (int i = 0; i < offers.Count; i++)
        {
            if (offers[i] != null && !string.IsNullOrWhiteSpace(offers[i].itemId))
            {
                itemIds.Add(offers[i].itemId);
            }
        }

        LearningExplorationRunState.SaveShopOffers(itemIds, cardOffers);
    }

    private void BuyOffer(int index)
    {
        if (index < 0 || index >= offers.Count)
        {
            SetStatus("구매할 아이템이 없습니다.");
            return;
        }

        LearningItemRecord record = offers[index];
        LearningItemDefinition item = LearningItemFactory.CreateRuntimeDefinition(record);
        if (inventory == null || item == null || !inventory.CanAdd(item))
        {
            SetStatus("아이템 칸이 가득 찼습니다.");
            return;
        }

        int price = GetItemOfferPrice(record);
        if (!LearningExplorationRunState.TrySpendCoin(price))
        {
            SetStatus("코인이 부족합니다.");
            return;
        }

        if (!inventory.TryAdd(item))
        {
            LearningExplorationRunState.AddCoin(price);
            SetStatus("아이템을 담을 수 없습니다.");
            return;
        }

        if (effectExecutor != null && sentenceController != null)
        {
            effectExecutor.ApplyPurchasedExplorationItem(item, sentenceController.Deck);
            LearningExplorationRunState.SaveDeck(sentenceController.Deck);
        }

        offers.RemoveAt(index);
        SaveCurrentShop();
        SetStatus($"{record.displayName} 구매 완료.");
        RefreshHeader();
        RefreshOffers();
        RefreshInventory();
        sentenceUI?.RefreshItemSlotsNow();
    }

    private void BuyCardOffer(int index)
    {
        if (sentenceController == null || sentenceController.Deck == null)
        {
            SetStatus("현재 덱 정보가 없습니다.");
            return;
        }

        if (index < 0 || index >= cardOffers.Count)
        {
            SetStatus("구매할 카드가 없습니다.");
            return;
        }

        LearningDeckCard card = cardOffers[index];
        int price = GetCardPrice(card);
        if (!LearningExplorationRunState.TrySpendCoin(price))
        {
            SetStatus("코인이 부족합니다.");
            return;
        }

        sentenceController.Deck.drawPile.Add(CloneShopCard(card));
        LearningExplorationRunState.SaveDeck(sentenceController.Deck);
        cardOffers.RemoveAt(index);
        SaveCurrentShop();
        SetStatus($"{LearningSpecialDeckCardRules.GetCardLabelWithStats(card)} 구매 완료.");
        RefreshHeader();
        RefreshOffers();
    }

    private void UseInventoryItem(int index)
    {
        if (inventory == null || index < 0 || index >= inventory.Items.Count)
        {
            SetStatus("사용할 아이템이 없습니다.");
            return;
        }

        LearningItemDefinition item = inventory.Items[index];
        if (item != null && !item.consumable)
        {
            SetStatus($"{item.displayName}: 패시브 적용 중.");
            RefreshInventory();
            sentenceUI?.RefreshItemSlotsNow();
            return;
        }

        if (effectExecutor == null || !effectExecutor.UseItem(item))
        {
            SetStatus("지금 사용할 수 없는 아이템입니다.");
            return;
        }

        SetStatus($"{item.displayName} 사용.");
        inventory?.SaveExplorationInventory();
        RefreshInventory();
        sentenceUI?.RefreshItemSlotsNow();
    }

    private void RefreshHeader()
    {
        if (titleText != null)
        {
            titleText.text = $"탐험 상점  Chapter {LearningExplorationRunState.Chapter}";
        }

        if (coinText != null)
        {
            coinText.text = LearningNumberFormatter.Format(LearningExplorationRunState.Coin);
        }
        if (coinSlotView != null) coinSlotView.Refresh();

        if (rerollButtonText != null)
        {
            LearningItemDefinition freeItem = GetFreeRerollItem();
            rerollButtonText.text = freeItem != null && freeItem.stackValue > 0
                ? $"리롤 무료({freeItem.stackValue})"
                : $"리롤 {GetRerollCost()}G";
        }

        RefreshDeckDeleteButton();
    }

    private void RefreshOffers()
    {
        bool useBoundItemViews = itemOfferViews != null && itemOfferViews.Length > 0;
        bool useBoundCardViews = cardOfferViews != null && cardOfferViews.Length > 0;
        if (!useBoundItemViews) Clear(itemOfferRoot);
        if (!useBoundCardViews) Clear(cardOfferRoot);
        int itemCount = Mathf.Min(3, offers.Count);
        for (int i = 0; i < itemCount; i++)
        {
            int captured = i;
            LearningItemRecord item = offers[i];
            LearningShopItemOfferView view = useBoundItemViews ? GetBoundItemOfferView(i) : CreateItemOfferView(itemOfferRoot);
            if (view == null) continue;
            view.gameObject.SetActive(true);
            Sprite icon = item.icon != null ? item.icon : itemIconSprite != null ? itemIconSprite : LearningUiSkin.ResolveItemIconSprite(null);
            view.Bind(item, GetItemOfferPrice(item), icon, () => BuyOffer(captured));
        }

        for (int i = itemCount; i < 3; i++)
        {
            if (useBoundItemViews)
            {
                LearningShopItemOfferView view = GetBoundItemOfferView(i);
                if (view != null) view.BindEmpty("아이템\n품절");
            }
            else
            {
                CreateEmptyOfferSlot(itemOfferRoot, "아이템\n품절");
            }
        }

        int cardCount = Mathf.Min(3, cardOffers.Count);
        for (int i = 0; i < cardCount; i++)
        {
            int captured = i;
            LearningDeckCard card = cardOffers[i];
            LearningShopCardOfferView view = useBoundCardViews ? GetBoundCardOfferView(i) : CreateCardOfferView(cardOfferRoot);
            if (view == null) continue;
            view.gameObject.SetActive(true);
            view.Bind(card, GetCardPrice(card), cardIconSprite != null ? cardIconSprite : itemIconSprite, () => BuyCardOffer(captured));
        }

        for (int i = cardCount; i < 3; i++)
        {
            if (useBoundCardViews)
            {
                LearningShopCardOfferView view = GetBoundCardOfferView(i);
                if (view != null) view.BindEmpty("카드\n품절");
            }
            else
            {
                CreateEmptyOfferSlot(cardOfferRoot, "카드\n품절");
            }
        }
    }

    private LearningShopItemOfferView GetBoundItemOfferView(int index)
    {
        return itemOfferViews != null && index >= 0 && index < itemOfferViews.Length ? itemOfferViews[index] : null;
    }

    private LearningShopCardOfferView GetBoundCardOfferView(int index)
    {
        return cardOfferViews != null && index >= 0 && index < cardOfferViews.Length ? cardOfferViews[index] : null;
    }

    private void RefreshInventory()
    {
        Clear(inventoryRoot);
        if (inventoryRoot == null) return;
        if (inventory == null) return;

        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null) continue;
            int captured = i;
            Sprite icon = item.icon != null ? item.icon : itemIconSprite != null ? itemIconSprite : LearningUiSkin.ResolveItemIconSprite(null);
            Button button = CreateShopOfferButton(inventoryRoot, FormatInventoryItem(item), icon, new Color(0.88f, 0.96f, 1f, 1f), () => UseInventoryItem(captured), true);
            LayoutElement layout = button.GetComponent<LayoutElement>();
            if (layout != null) layout.preferredHeight = 118f;
        }
    }

    private void BindDeckDeleteButton(LearningShopActionButtonView view)
    {
        deckDeleteButtonView = view;
        deckDeleteButton = view != null ? view.Button : null;
        deckDeleteButtonText = view != null ? view.GetComponentInChildren<TMP_Text>(true) : null;
        RefreshDeckDeleteButton();
    }

    private void RefreshDeckDeleteButton()
    {
        if (deckDeleteButtonView != null)
        {
            deckDeleteButtonView.SetLabel(LearningExplorationRunState.ShopDeckDeletePurchased
                ? "카드 삭제 완료"
                : $"카드 삭제 {DeckDeletePrice}G");
        }
        else if (deckDeleteButtonText != null)
        {
            deckDeleteButtonText.text = LearningExplorationRunState.ShopDeckDeletePurchased
                ? "카드 삭제 완료"
                : $"카드 삭제 {DeckDeletePrice}G";
        }

        if (deckDeleteButton != null)
        {
            deckDeleteButton.interactable =
                !LearningExplorationRunState.ShopDeckDeletePurchased &&
                LearningExplorationRunState.Coin >= DeckDeletePrice &&
                HasDeletableDeckCards();
        }
    }

    private void TryBuyDeckDeleteService()
    {
        if (LearningExplorationRunState.ShopDeckDeletePurchased)
        {
            SetStatus("이번 상점에서는 이미 카드 삭제를 구매했습니다.");
            return;
        }

        if (!HasDeletableDeckCards())
        {
            SetStatus("삭제할 수 있는 카드가 없습니다.");
            return;
        }

        if (LearningExplorationRunState.Coin < DeckDeletePrice)
        {
            SetStatus($"카드 삭제 비용 {DeckDeletePrice}G가 부족합니다.");
            return;
        }

        RefreshHeader();
        OpenDeckDeletePopup();
        SetStatus($"삭제할 카드를 고르세요. 확정 시 {DeckDeletePrice}G가 사용됩니다.");
    }

    private bool HasDeletableDeckCards()
    {
        return GetDeletableDeckOptions().Count > 0;
    }

    private List<ShopDeckCardOption> GetDeletableDeckOptions()
    {
        var options = new List<ShopDeckCardOption>();
        LearningRunDeckState deck = sentenceController != null ? sentenceController.Deck : null;
        if (deck == null) return options;

        AddDeckDeleteOptions(options, deck.drawPile);
        AddDeckDeleteOptions(options, deck.hand);
        AddDeckDeleteOptions(options, deck.discardPile);
        return options;
    }

    private static void AddDeckDeleteOptions(List<ShopDeckCardOption> options, List<LearningDeckCard> cards)
    {
        if (options == null || cards == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            LearningDeckCard card = cards[i];
            if (card == null || card.temporary) continue;
            options.Add(new ShopDeckCardOption
            {
                card = card,
                source = cards,
                index = i,
            });
        }
    }

    private void OpenDeckDeletePopup()
    {
        BuildDeckDeletePopupIfNeeded();
        if (deckDeletePopup == null || deckDeleteCardRoot == null) return;

        selectedDeleteOption = null;
        deckDeletePopup.SetActive(true);
        deckDeletePopup.transform.SetAsLastSibling();
        if (deckDeleteConfirmRoot != null) deckDeleteConfirmRoot.SetActive(false);
        if (deckDeletePopupTitleText != null) deckDeletePopupTitleText.text = "삭제할 카드를 선택하세요";

        Clear(deckDeleteCardRoot);
        List<ShopDeckCardOption> options = GetDeletableDeckOptions();
        for (int i = 0; i < options.Count; i++)
        {
            ShopDeckCardOption option = options[i];
            GameObject cardObject = CreateDeckDeleteCardObject(deckDeleteCardRoot, option);
            Button button = cardObject.GetComponent<Button>();
            if (button == null) button = cardObject.AddComponent<Button>();
            button.onClick.RemoveAllListeners();
            button.onClick.AddListener(() => SelectDeckDeleteOption(option));
        }
    }

    private GameObject CreateDeckDeleteCardObject(Transform parent, ShopDeckCardOption option)
    {
        GameObject prefab = LearningUiSkin.ResolvePosCardPrefab(null);
        GameObject go = prefab != null ? Instantiate(prefab, parent) : new GameObject("DeleteDeckCard");
        if (prefab == null) go.transform.SetParent(parent, false);
        go.name = $"DeleteDeckCard_{LearningSpecialDeckCardRules.GetCardLabel(option.card)}";

        RectTransform rect = go.transform as RectTransform;
        if (rect == null) rect = go.AddComponent<RectTransform>();
        LayoutElement layout = go.GetComponent<LayoutElement>();
        if (layout == null) layout = go.AddComponent<LayoutElement>();
        layout.preferredWidth = 150f;
        layout.preferredHeight = 96f;
        layout.flexibleWidth = 0f;
        layout.flexibleHeight = 0f;

        LearningDeckCardView cardView = go.GetComponent<LearningDeckCardView>();
        if (cardView == null) cardView = go.AddComponent<LearningDeckCardView>();
        cardView.Bind(option.card, false, false, false);

        Image image = go.GetComponent<Image>();
        if (image != null) image.raycastTarget = true;
        return go;
    }

    private void SelectDeckDeleteOption(ShopDeckCardOption option)
    {
        selectedDeleteOption = option;
        if (deckDeleteConfirmRoot != null) deckDeleteConfirmRoot.SetActive(true);
        if (deckDeleteConfirmText != null)
        {
            deckDeleteConfirmText.text = $"이 카드 삭제 맞습니까?\n{LearningSpecialDeckCardRules.GetCardLabelWithStats(option.card)}";
        }
    }

    private void ConfirmDeckDeleteOption()
    {
        if (selectedDeleteOption == null)
        {
            SetStatus("삭제할 카드를 먼저 선택하세요.");
            return;
        }

        if (LearningExplorationRunState.ShopDeckDeletePurchased ||
            !LearningExplorationRunState.TrySpendCoin(DeckDeletePrice))
        {
            SetStatus("카드 삭제를 진행할 수 없습니다. 코인과 구매 상태를 확인하세요.");
            return;
        }

        LearningDeckCard removed = selectedDeleteOption.card;
        if (!RemoveDeckCardOption(selectedDeleteOption))
        {
            LearningExplorationRunState.AddCoin(DeckDeletePrice);
            SetStatus("선택한 카드를 찾을 수 없습니다.");
            OpenDeckDeletePopup();
            return;
        }

        if (sentenceController != null && sentenceController.Deck != null)
        {
            LearningExplorationRunState.SaveDeck(sentenceController.Deck);
        }

        LearningExplorationRunState.SetShopDeckDeletePurchased(true);
        CloseDeckDeletePopup();
        RefreshHeader();
        SetStatus($"{LearningSpecialDeckCardRules.GetCardLabelWithStats(removed)} 삭제 완료.");
    }

    private bool RemoveDeckCardOption(ShopDeckCardOption option)
    {
        if (option == null || option.source == null || option.card == null) return false;
        if (option.index >= 0 && option.index < option.source.Count && ReferenceEquals(option.source[option.index], option.card))
        {
            option.source.RemoveAt(option.index);
            return true;
        }

        for (int i = 0; i < option.source.Count; i++)
        {
            if (ReferenceEquals(option.source[i], option.card))
            {
                option.source.RemoveAt(i);
                return true;
            }
        }

        if (!string.IsNullOrEmpty(option.card.id))
        {
            for (int i = 0; i < option.source.Count; i++)
            {
                LearningDeckCard card = option.source[i];
                if (card != null && card.id == option.card.id && card.temporary == option.card.temporary)
                {
                    option.source.RemoveAt(i);
                    return true;
                }
            }
        }

        return false;
    }

    private void CloseDeckDeletePopup()
    {
        selectedDeleteOption = null;
        if (deckDeletePopup != null) deckDeletePopup.SetActive(false);
    }

    private void BuildDeckDeletePopupIfNeeded()
    {
        if (deckDeletePopup != null) return;
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        if (canvas == null) return;

        deckDeletePopup = new GameObject("DeckDeletePopup");
        deckDeletePopup.transform.SetParent(canvas.transform, false);
        deckDeletePopup.transform.SetAsLastSibling();

        Canvas popupCanvas = deckDeletePopup.AddComponent<Canvas>();
        popupCanvas.overrideSorting = true;
        popupCanvas.sortingOrder = 650;
        deckDeletePopup.AddComponent<GraphicRaycaster>();

        Image background = deckDeletePopup.AddComponent<Image>();
        background.color = LearningUiSkin.PaperColor;
        background.raycastTarget = true;

        RectTransform popupRect = deckDeletePopup.GetComponent<RectTransform>();
        popupRect.anchorMin = Vector2.zero;
        popupRect.anchorMax = Vector2.one;
        popupRect.offsetMin = Vector2.zero;
        popupRect.offsetMax = Vector2.zero;

        VerticalLayoutGroup layout = deckDeletePopup.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(38, 38, 54, 42);
        layout.spacing = 16f;
        layout.childAlignment = TextAnchor.UpperCenter;
        layout.childControlWidth = true;
        layout.childControlHeight = true;
        layout.childForceExpandWidth = true;
        layout.childForceExpandHeight = false;

        deckDeletePopupTitleText = CreateText(deckDeletePopup.transform, "삭제할 카드를 선택하세요", 34, 70);

        GameObject cardFrame = new GameObject("DeckDeleteCardFrame");
        cardFrame.transform.SetParent(deckDeletePopup.transform, false);
        Image cardFrameImage = cardFrame.AddComponent<Image>();
        cardFrameImage.color = LearningUiSkin.MintColor;
        cardFrame.AddComponent<RectMask2D>();
        LayoutElement cardFrameLayout = cardFrame.AddComponent<LayoutElement>();
        cardFrameLayout.preferredHeight = 560f;
        cardFrameLayout.flexibleWidth = 1f;

        deckDeleteCardRoot = new GameObject("DeckDeleteCardRoot").transform;
        deckDeleteCardRoot.SetParent(cardFrame.transform, false);
        RectTransform cardRootRect = deckDeleteCardRoot.gameObject.AddComponent<RectTransform>();
        deckDeleteCardRoot = cardRootRect;
        cardRootRect.anchorMin = Vector2.zero;
        cardRootRect.anchorMax = Vector2.one;
        cardRootRect.offsetMin = new Vector2(18f, 18f);
        cardRootRect.offsetMax = new Vector2(-18f, -18f);
        GridLayoutGroup grid = deckDeleteCardRoot.gameObject.AddComponent<GridLayoutGroup>();
        grid.cellSize = new Vector2(214f, 106f);
        grid.spacing = new Vector2(12f, 12f);
        grid.padding = new RectOffset(4, 4, 4, 4);
        grid.childAlignment = TextAnchor.UpperCenter;
        grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
        grid.constraintCount = 4;
        cardRootRect.anchorMin = new Vector2(0, 1);
        cardRootRect.anchorMax = Vector2.one;
        cardRootRect.pivot = new Vector2(.5f, 1);
        cardRootRect.anchoredPosition = new Vector2(0, -18);
        cardRootRect.sizeDelta = new Vector2(-36, 0);
        var fitter = deckDeleteCardRoot.gameObject.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        var scroll = cardFrame.AddComponent<ScrollRect>();
        scroll.viewport = cardFrame.transform as RectTransform;
        scroll.content = cardRootRect; scroll.horizontal = false; scroll.vertical = true;
        scroll.movementType = ScrollRect.MovementType.Clamped;
        scroll.scrollSensitivity = 35;

        deckDeleteConfirmRoot = new GameObject("DeckDeleteConfirmRoot");
        deckDeleteConfirmRoot.transform.SetParent(deckDeletePopup.transform, false);
        LayoutElement confirmLayoutElement = deckDeleteConfirmRoot.AddComponent<LayoutElement>();
        confirmLayoutElement.preferredHeight = 190f;
        VerticalLayoutGroup confirmLayout = deckDeleteConfirmRoot.AddComponent<VerticalLayoutGroup>();
        confirmLayout.spacing = 12f;
        confirmLayout.childAlignment = TextAnchor.MiddleCenter;
        confirmLayout.childControlWidth = true;
        confirmLayout.childControlHeight = false;
        confirmLayout.childForceExpandWidth = true;
        confirmLayout.childForceExpandHeight = false;

        deckDeleteConfirmText = CreateText(deckDeleteConfirmRoot.transform, "이 카드 삭제 맞습니까?", 28, 82);

        Transform confirmButtonRoot = CreateHorizontalGroup(deckDeleteConfirmRoot.transform, "ConfirmButtonRoot", 82f);
        ConfigureCenteredHorizontalGroup(confirmButtonRoot);
        CreateTextButton(confirmButtonRoot, "다시 선택", new Color(0.72f, 0.76f, 0.82f, 1f), () =>
        {
            selectedDeleteOption = null;
            if (deckDeleteConfirmRoot != null) deckDeleteConfirmRoot.SetActive(false);
        }, 250f, 74f, 26f);
        CreateTextButton(confirmButtonRoot, "삭제 확정", new Color(1f, 0.62f, 0.28f, 1f), ConfirmDeckDeleteOption, 250f, 74f, 26f);

        CreateTextButton(deckDeletePopup.transform, "상점으로 돌아가기", LearningUiSkin.MintColor,
            CloseDeckDeletePopup, 800f, 88f, 30f);
        deckDeleteConfirmRoot.SetActive(false);
        deckDeletePopup.SetActive(false);
    }

    private string FormatInventoryItem(LearningItemDefinition item)
    {
        string stackValue = effectExecutor != null ? effectExecutor.GetStackDisplay(item, sentenceController != null ? sentenceController.Deck : null) : string.Empty;
        string stack = !string.IsNullOrEmpty(stackValue) ? $"\n스택 {stackValue}" : string.Empty;
        return $"{item.displayName}{stack}\n패시브";
    }

    private string FormatOffer(LearningItemRecord item)
    {
        return $"[{item.rarity}] {item.displayName}  {GetItemOfferPrice(item)}G\n{item.description}";
    }

    private string FormatCardOffer(LearningDeckCard card)
    {
        return $"[카드] {LearningSpecialDeckCardRules.GetCardLabelWithStats(card)}  {GetCardPrice(card)}G";
    }

    private int GetRerollCost()
    {
        int baseCost = Mathf.Min(10, 2 + LearningExplorationRunState.RerollCount * 2);
        return Mathf.Max(0, baseCost + GetRerollDiscount());
    }

    private int GetItemOfferPrice(LearningItemRecord item)
    {
        return Mathf.Max(0, LearningItemDatabase.GetPrice(item));
    }

    private int GetCardPrice(LearningDeckCard card)
    {
        if (card == null) return 1;
        int price;
        if (card.multiplier > 1.01f)
        {
            float t = Mathf.InverseLerp(1.5f, 4f, card.multiplier);
            price = Mathf.Clamp(Mathf.RoundToInt(Mathf.Lerp(6f, 15f, t)), 6, 15);
        }
        else if (card.bonusScore > 0)
        {
            price = Mathf.Clamp(Mathf.CeilToInt(card.bonusScore * 0.8f), 1, 4);
        }
        else
        {
            price = 1;
        }

        return Mathf.Max(0, price + GetSpecialCardPurchaseDiscount(card));
    }

    private int GetSpecialCardPurchaseDiscount(LearningDeckCard card)
    {
        if (card == null || !IsSpecialCard(card) || inventory == null) return 0;

        int discount = 0;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item?.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                LearningItemEffect effect = item.effects[e];
                if (effect.effectType == LearningItemEffectType.Custom && effect.stringValue == "SpecialCardDiscount")
                {
                    discount += effect.intValue;
                }
            }
        }
        return discount;
    }

    private static bool IsSpecialCard(LearningDeckCard card)
    {
        if (card == null) return false;
        return card.pos == LearningPosType.DT_THE ||
               card.pos == LearningPosType.DT_AN ||
               card.pos == LearningPosType.IN ||
               card.pos == LearningPosType.PRP_POS ||
               card.pos == LearningPosType.TO_VB ||
               card.pos == LearningPosType.DO ||
               card.pos == LearningPosType.RB_NOT ||
               card.pos == LearningPosType.WH;
    }

    private void RollCardOffers(int count)
    {
        cardOffers.Clear();
        LearningDeckTemplate template = LearningDeckRepository.GetNaroStartingDeck();
        if (template == null || template.cards == null || template.cards.Count == 0) return;

        int safeGuard = 0;
        while (cardOffers.Count < count && safeGuard++ < 80)
        {
            LearningDeckCard source = template.cards[LearningRunRandom.Range(0, template.cards.Count)];
            if (source == null || LearningSpecialDeckCardRules.TryGetDrawAmount(source, out _)) continue;
            LearningDeckCard card = CloneShopCard(source);
            if (LearningRunRandom.Value() < 0.25f)
            {
                float[] multipliers = { 1.5f, 2f, 3f, 4f };
                card.bonusScore = 0;
                card.multiplier = multipliers[LearningRunRandom.Range(0, multipliers.Length)];
            }
            else
            {
                card.bonusScore = LearningRunRandom.Range(1, 6);
                card.multiplier = 1f;
            }
            card.id = $"shop_{source.id}_{System.Guid.NewGuid():N}";
            cardOffers.Add(card);
        }
    }

    private static LearningDeckCard CloneShopCard(LearningDeckCard source)
    {
        return new LearningDeckCard
        {
            id = source.id,
            pos = source.pos,
            displayName = source.displayName,
            bonusScore = source.bonusScore,
            multiplier = source.multiplier,
            temporary = false,
        };
    }

    private int GetRerollDiscount()
    {
        if (inventory == null) return 0;
        int discount = 0;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                if (item.effects[e].effectType == LearningItemEffectType.AddShopRerollDiscount)
                {
                    discount += item.effects[e].intValue;
                }
            }
        }
        return discount;
    }

    private LearningItemDefinition GetFreeRerollItem()
    {
        if (inventory == null) return null;
        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null || item.effects == null) continue;
            for (int e = 0; e < item.effects.Count; e++)
            {
                if (item.effects[e].effectType == LearningItemEffectType.AddFreeRerolls && item.stackValue > 0)
                {
                    return item;
                }
            }
        }
        return null;
    }

    private void SetStatus(string message)
    {
        if (statusText != null) statusText.text = message;
        Debug.Log($"[LearningExplorationShopUI] {message}");
    }

    private void BuildIfNeeded()
    {
        if (panel != null) return;
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        if (canvas == null) return;
        ResolveSkinSprites();

        if (shopPanelPrefab != null)
        {
            BuildFromPanelPrefab();
            return;
        }

        panel = new GameObject("ExplorationShopPanel");
        panel.transform.SetParent(canvas.transform, false);
        panel.transform.SetAsLastSibling();
        Canvas panelCanvas = panel.AddComponent<Canvas>();
        panelCanvas.overrideSorting = true;
        panelCanvas.sortingOrder = 500;
        panel.AddComponent<GraphicRaycaster>();
        CanvasGroup canvasGroup = panel.AddComponent<CanvasGroup>();
        canvasGroup.blocksRaycasts = true;
        canvasGroup.interactable = true;
        Image background = panel.AddComponent<Image>();
        background.color = LearningUiSkin.PaperColor;
        background.raycastTarget = true;
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = Vector2.zero;
        panelRect.anchorMax = Vector2.one;
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;

        VerticalLayoutGroup layout = panel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(42, 42, 52, 44);
        layout.spacing = 12f;
        layout.childControlHeight = true;
        layout.childControlWidth = true;
        layout.childForceExpandHeight = false;
        layout.childForceExpandWidth = true;

        Transform headerRoot = CreateHorizontalGroup(panel.transform, "HeaderRoot", 74f);
        HorizontalLayoutGroup headerLayout = headerRoot.GetComponent<HorizontalLayoutGroup>();
        headerLayout.childControlWidth = true;
        headerLayout.childForceExpandWidth = false;
        titleText = CreateText(headerRoot, "탐험 상점", 42, 70);
        titleText.GetComponent<LayoutElement>().preferredWidth = 560f;
        coinSlotView = CreateCurrencySlot(headerRoot, LearningCurrencyType.Coin);
        coinText = coinSlotView != null ? coinSlotView.GetComponentInChildren<TMP_Text>(true) : CreateCoinText(headerRoot);

        statusText = CreateText(panel.transform, string.Empty, 24, 50);
        CreateText(panel.transform, "아이템", 28, 38);
        itemOfferRoot = CreateHorizontalGroup(panel.transform, "ItemOfferRoot", 276f);
        ConfigureOfferRow(itemOfferRoot);
        CreateText(panel.transform, "강화 카드", 28, 38);
        cardOfferRoot = CreateHorizontalGroup(panel.transform, "CardOfferRoot", 252f);
        ConfigureOfferRow(cardOfferRoot);
        inventoryRoot = null;

        Transform rerollRoot = CreateHorizontalGroup(panel.transform, "RerollRoot", 72f);
        ConfigureCenteredHorizontalGroup(rerollRoot);
        LearningShopActionButtonView rerollView = CreateActionButton(rerollRoot, "리롤", PaidRerollShop, 260f, 66f);
        rerollButton = rerollView != null ? rerollView.Button : null;
        rerollButtonText = rerollView != null ? rerollView.GetComponentInChildren<TMP_Text>(true) : null;

        LearningShopActionButtonView deleteView = CreateActionButton(rerollRoot, $"카드 삭제 {DeckDeletePrice}G", TryBuyDeckDeleteService, 300f, 66f);
        BindDeckDeleteButton(deleteView);

        Transform continueRoot = CreateHorizontalGroup(panel.transform, "ContinueRoot", 84f);
        ConfigureCenteredHorizontalGroup(continueRoot);
        CreateActionButton(continueRoot, "계속하기", ContinueRun, 340f, 74f);
        panel.SetActive(false);
    }

    private void BuildFromPanelPrefab()
    {
        panel = Instantiate(shopPanelPrefab, canvas.transform);
        panel.name = "ExplorationShopPanel";
        panel.transform.SetAsLastSibling();
        panelView = panel.GetComponent<LearningShopPanelView>();

        Canvas panelCanvas = panel.GetComponent<Canvas>();
        if (panelCanvas == null) panelCanvas = panel.AddComponent<Canvas>();
        panelCanvas.overrideSorting = true;
        panelCanvas.sortingOrder = 500;
        if (panel.GetComponent<GraphicRaycaster>() == null) panel.AddComponent<GraphicRaycaster>();
        CanvasGroup canvasGroup = panel.GetComponent<CanvasGroup>();
        if (canvasGroup == null) canvasGroup = panel.AddComponent<CanvasGroup>();
        canvasGroup.blocksRaycasts = true;
        canvasGroup.interactable = true;

        RectTransform panelRect = panel.transform as RectTransform;
        if (panelRect != null)
        {
            panelRect.anchorMin = Vector2.zero;
            panelRect.anchorMax = Vector2.one;
            panelRect.offsetMin = Vector2.zero;
            panelRect.offsetMax = Vector2.zero;
        }

        titleText = panelView != null && panelView.titleText != null ? panelView.titleText : FindDeepComponent<TMP_Text>(panel.transform, "TitleText", "Title", "ShopTitle");
        statusText = panelView != null && panelView.statusText != null ? panelView.statusText : FindDeepComponent<TMP_Text>(panel.transform, "StatusText", "Status", "MessageText");
        itemOfferRoot = panelView != null && panelView.itemOfferRoot != null ? panelView.itemOfferRoot : FindDeepTransform(panel.transform, "ItemOfferRoot");
        cardOfferRoot = panelView != null && panelView.cardOfferRoot != null ? panelView.cardOfferRoot : FindDeepTransform(panel.transform, "CardOfferRoot");
        inventoryRoot = panelView != null && panelView.inventoryRoot != null ? panelView.inventoryRoot : FindDeepTransform(panel.transform, "InventoryRoot");
        itemOfferAnimationRoot = panelView != null && panelView.itemOfferAnimationRoot != null ? panelView.itemOfferAnimationRoot : itemOfferRoot as RectTransform;
        cardOfferAnimationRoot = panelView != null && panelView.cardOfferAnimationRoot != null ? panelView.cardOfferAnimationRoot : cardOfferRoot as RectTransform;
        itemOfferViews = panelView != null && panelView.itemOfferViews != null && panelView.itemOfferViews.Length > 0
            ? panelView.itemOfferViews
            : itemOfferRoot != null ? itemOfferRoot.GetComponentsInChildren<LearningShopItemOfferView>(true) : null;
        cardOfferViews = panelView != null && panelView.cardOfferViews != null && panelView.cardOfferViews.Length > 0
            ? panelView.cardOfferViews
            : cardOfferRoot != null ? cardOfferRoot.GetComponentsInChildren<LearningShopCardOfferView>(true) : null;
        CacheOfferAnimationBasePositions();

        coinSlotView = panelView != null && panelView.coinSlotView != null ? panelView.coinSlotView : FindDeepComponent<LearningCurrencySlotView>(panel.transform, "CoinHud", "CoinRoot", "CurrencyHudPrefab");
        if (coinSlotView != null)
        {
            coinSlotView.Bind(LearningCurrencyType.Coin, coinIconSprite);
            coinText = coinSlotView.GetComponentInChildren<TMP_Text>(true);
        }

        LearningShopActionButtonView rerollView = panelView != null && panelView.rerollButtonView != null ? panelView.rerollButtonView : FindDeepComponent<LearningShopActionButtonView>(panel.transform, "RerollButton", "RerollRoot");
        if (rerollView != null)
        {
            rerollView.Bind("리롤", PaidRerollShop);
            rerollButton = rerollView.Button;
            rerollButtonText = rerollView.GetComponentInChildren<TMP_Text>(true);
        }

        LearningShopActionButtonView continueView = panelView != null && panelView.continueButtonView != null ? panelView.continueButtonView : FindDeepComponent<LearningShopActionButtonView>(panel.transform, "ContinueButton", "ContinueRoot");
        if (continueView != null)
        {
            continueView.Bind("계속하기", ContinueRun);
        }

        LearningShopActionButtonView deleteView = panelView != null && panelView.deckDeleteButtonView != null
            ? panelView.deckDeleteButtonView
            : FindDeepComponent<LearningShopActionButtonView>(panel.transform, "DeckDeleteButton", "DeleteCardButton", "RemoveCardButton", "CardDeleteButton");
        if (deleteView != null)
        {
            deleteView.Bind($"카드 삭제 {DeckDeletePrice}G", TryBuyDeckDeleteService);
            BindDeckDeleteButton(deleteView);
        }
        else
        {
            Transform deleteParent = continueView != null ? continueView.transform.parent : panel.transform;
            deleteView = CreateActionButton(deleteParent, $"카드 삭제 {DeckDeletePrice}G", TryBuyDeckDeleteService, 300f, 66f);
            deleteView.gameObject.name = "DeckDeleteButton";
            BindDeckDeleteButton(deleteView);
        }

        if (itemOfferRoot == null) Debug.LogWarning("[LearningExplorationShopUI] ShopPanelPrefab missing ItemOfferRoot.");
        if (cardOfferRoot == null) Debug.LogWarning("[LearningExplorationShopUI] ShopPanelPrefab missing CardOfferRoot.");
        panel.SetActive(false);
    }

    private void CacheOfferAnimationBasePositions()
    {
        if (itemOfferAnimationRoot != null)
        {
            itemOfferBasePosition = itemOfferAnimationRoot.anchoredPosition;
            hasItemOfferBasePosition = true;
        }

        if (cardOfferAnimationRoot != null)
        {
            cardOfferBasePosition = cardOfferAnimationRoot.anchoredPosition;
            hasCardOfferBasePosition = true;
        }
    }

    private void PlayOfferEnterAnimation()
    {
        AnimateOfferRoot(itemOfferAnimationRoot, itemOfferBasePosition, hasItemOfferBasePosition, 0f);
        AnimateOfferRoot(cardOfferAnimationRoot, cardOfferBasePosition, hasCardOfferBasePosition, 0.05f);
    }

    private void AnimateOfferRoot(RectTransform root, Vector2 basePosition, bool hasBasePosition, float delay)
    {
        if (root == null || !hasBasePosition) return;
        root.DOKill();
        root.anchoredPosition = basePosition + new Vector2(offerEnterOffsetX, 0f);
        root.DOAnchorPos(basePosition, offerEnterDuration)
            .SetDelay(delay)
            .SetEase(offerEnterEase);
    }

    private void ResolveSkinSprites()
    {
        buttonSprite = LearningUiSkin.ResolveButtonSprite(buttonSprite);
        itemIconSprite = LearningUiSkin.ResolveItemIconSprite(itemIconSprite);
        cardIconSprite = LearningUiSkin.ResolveItemIconSprite(cardIconSprite);
        coinIconSprite = LearningUiSkin.ResolveCoinIconSprite(coinIconSprite);
        if (coinHudPrefab == null) coinHudPrefab = LearningUiSkin.ResolveCurrencyHudPrefab(coinHudPrefab);
        if (shopActionButtonPrefab == null) shopActionButtonPrefab = LearningUiSkin.ResolveActionButtonPrefab(shopActionButtonPrefab);
        if (shopItemOfferPrefab == null) shopItemOfferPrefab = LearningUiSkin.ResolveShopItemOfferPrefab(shopItemOfferPrefab);
        if (shopCardOfferPrefab == null) shopCardOfferPrefab = LearningUiSkin.ResolveShopCardOfferPrefab(shopCardOfferPrefab);
        if (shopPanelPrefab == null) shopPanelPrefab = LearningUiSkin.ResolveShopPanelPrefab(shopPanelPrefab);
    }

    private static Transform FindDeepTransform(Transform root, params string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < names.Length; i++)
        {
            if (NameMatches(root.name, names[i])) return root;
        }

        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindDeepTransform(root.GetChild(i), names);
            if (found != null) return found;
        }
        return null;
    }

    private static T FindDeepComponent<T>(Transform root, params string[] names) where T : Component
    {
        Transform found = FindDeepTransform(root, names);
        if (found != null)
        {
            T component = found.GetComponent<T>();
            if (component != null) return component;
            return found.GetComponentInChildren<T>(true);
        }
        return null;
    }

    private static bool NameMatches(string actual, string expected)
    {
        if (string.IsNullOrEmpty(actual) || string.IsNullOrEmpty(expected)) return false;
        return actual.Equals(expected, System.StringComparison.OrdinalIgnoreCase) ||
               actual.StartsWith(expected + " (", System.StringComparison.OrdinalIgnoreCase);
    }

    private static Transform CreateGroup(Transform parent, string name, float preferredHeight)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        element.preferredHeight = preferredHeight;
        VerticalLayoutGroup layout = go.AddComponent<VerticalLayoutGroup>();
        layout.spacing = 10f;
        layout.childControlHeight = true;
        layout.childControlWidth = true;
        layout.childForceExpandHeight = false;
        return go.transform;
    }

    private static Transform CreateHorizontalGroup(Transform parent, string name, float preferredHeight)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        element.preferredHeight = preferredHeight;
        HorizontalLayoutGroup layout = go.AddComponent<HorizontalLayoutGroup>();
        layout.spacing = 10f;
        layout.childControlHeight = true;
        layout.childControlWidth = true;
        layout.childForceExpandWidth = true;
        return go.transform;
    }

    private static void ConfigureCenteredHorizontalGroup(Transform root)
    {
        HorizontalLayoutGroup layout = root != null ? root.GetComponent<HorizontalLayoutGroup>() : null;
        if (layout == null) return;
        layout.spacing = 12f;
        layout.childControlWidth = false;
        layout.childForceExpandWidth = false;
        layout.childAlignment = TextAnchor.MiddleCenter;
    }

    private static void ConfigureOfferRow(Transform root)
    {
        HorizontalLayoutGroup layout = root != null ? root.GetComponent<HorizontalLayoutGroup>() : null;
        if (layout == null) return;
        layout.spacing = 14f;
        layout.childControlWidth = false;
        layout.childControlHeight = true;
        layout.childForceExpandWidth = false;
        layout.childForceExpandHeight = false;
        layout.childAlignment = TextAnchor.MiddleCenter;
    }

    private TMP_Text CreateText(Transform parent, string text, float fontSize, float preferredHeight)
    {
        GameObject go = new GameObject("Text");
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        element.preferredHeight = preferredHeight;
        TextMeshProUGUI label = go.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) label.font = fontAsset;
        label.text = text;
        label.fontSize = fontSize;
        label.color = LearningUiSkin.InkColor;
        label.alignment = TextAlignmentOptions.Center;
        return label;
    }

    private TMP_Text CreateCoinText(Transform parent)
    {
        GameObject go = new GameObject("CoinRoot");
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        element.preferredWidth = 330f;
        element.preferredHeight = 70f;
        HorizontalLayoutGroup layout = go.AddComponent<HorizontalLayoutGroup>();
        layout.padding = new RectOffset(8, 8, 4, 4);
        layout.spacing = 8f;
        layout.childAlignment = TextAnchor.MiddleRight;
        layout.childControlWidth = false;
        layout.childControlHeight = false;

        GameObject iconGo = new GameObject("CoinIcon");
        iconGo.transform.SetParent(go.transform, false);
        Image icon = iconGo.AddComponent<Image>();
        icon.sprite = coinIconSprite;
        icon.preserveAspect = true;
        LayoutElement iconLayout = iconGo.AddComponent<LayoutElement>();
        iconLayout.preferredWidth = 54f;
        iconLayout.preferredHeight = 54f;

        GameObject textGo = new GameObject("CoinText");
        textGo.transform.SetParent(go.transform, false);
        TextMeshProUGUI label = textGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) label.font = fontAsset;
        label.text = "0";
        label.fontSize = 30f;
        label.color = Color.white;
        label.alignment = TextAlignmentOptions.MidlineRight;
        LayoutElement labelLayout = textGo.AddComponent<LayoutElement>();
        labelLayout.preferredWidth = 250f;
        labelLayout.preferredHeight = 58f;
        return label;
    }

    private LearningCurrencySlotView CreateCurrencySlot(Transform parent, LearningCurrencyType currencyType)
    {
        GameObject go = InstantiateOrCreate(coinHudPrefab, parent, "CurrencyHudPrefab");
        LearningCurrencySlotView view = go.GetComponent<LearningCurrencySlotView>();
        if (view == null) view = go.AddComponent<LearningCurrencySlotView>();
        LayoutElement layout = go.GetComponent<LayoutElement>();
        if (layout == null) layout = go.AddComponent<LayoutElement>();
        layout.preferredWidth = 330f;
        layout.preferredHeight = 70f;
        view.Bind(currencyType, coinIconSprite);
        return view;
    }

    private LearningShopActionButtonView CreateActionButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick, float preferredWidth, float preferredHeight)
    {
        GameObject go = InstantiateOrCreate(shopActionButtonPrefab, parent, "ActionButtonPrefab");
        LearningShopActionButtonView view = go.GetComponent<LearningShopActionButtonView>();
        if (view == null) view = go.AddComponent<LearningShopActionButtonView>();
        LayoutElement layout = go.GetComponent<LayoutElement>();
        if (layout == null) layout = go.AddComponent<LayoutElement>();
        layout.preferredWidth = preferredWidth;
        layout.preferredHeight = preferredHeight;
        view.Bind(label, onClick);
        return view;
    }

    private LearningShopItemOfferView CreateItemOfferView(Transform parent)
    {
        GameObject go = InstantiateOrCreate(shopItemOfferPrefab, parent, "ShopItemOfferPrefab");
        LearningShopItemOfferView view = go.GetComponent<LearningShopItemOfferView>();
        if (view == null) Debug.LogWarning("[LearningExplorationShopUI] ShopItemOfferPrefab is missing LearningShopItemOfferView.");
        return view;
    }

    private LearningShopCardOfferView CreateCardOfferView(Transform parent)
    {
        GameObject go = InstantiateOrCreate(shopCardOfferPrefab, parent, "ShopCardOfferPrefab");
        LearningShopCardOfferView view = go.GetComponent<LearningShopCardOfferView>();
        if (view == null) Debug.LogWarning("[LearningExplorationShopUI] ShopCardOfferPrefab is missing LearningShopCardOfferView.");
        return view;
    }

    private GameObject InstantiateOrCreate(GameObject prefab, Transform parent, string fallbackName)
    {
        GameObject go = prefab != null ? Instantiate(prefab, parent) : new GameObject(fallbackName);
        if (prefab == null) go.transform.SetParent(parent, false);
        RectTransform rect = go.transform as RectTransform;
        if (rect == null) rect = go.AddComponent<RectTransform>();
        return go;
    }

    private Button CreateTextButton(Transform parent, string text, Color color, UnityEngine.Events.UnityAction onClick, float preferredWidth = 0f, float preferredHeight = 84f, float fontSize = 26f)
    {
        GameObject go = new GameObject("Button");
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        if (preferredWidth > 0f) element.preferredWidth = preferredWidth;
        element.preferredHeight = preferredHeight;
        Image image = go.AddComponent<Image>();
        image.sprite = LearningUiSkin.ResolveSurfaceSprite();
        image.type = buttonSprite != null ? Image.Type.Sliced : Image.Type.Simple;
        image.color = color;
        Button button = go.AddComponent<Button>();
        button.onClick.AddListener(onClick);

        GameObject labelGo = new GameObject("Label");
        labelGo.transform.SetParent(go.transform, false);
        RectTransform rect = labelGo.AddComponent<RectTransform>();
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = new Vector2(14f, 8f);
        rect.offsetMax = new Vector2(-14f, -8f);
        TextMeshProUGUI label = labelGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) label.font = fontAsset;
        label.text = text;
        label.fontSize = fontSize;
        label.color = new Color(0.16f, 0.2f, 0.28f, 1f);
        label.alignment = TextAlignmentOptions.Center;
        return button;
    }

    private Button CreateShopOfferButton(Transform parent, string text, Sprite icon, Color tint, UnityEngine.Events.UnityAction onClick, bool itemOffer)
    {
        GameObject go = new GameObject("ShopOffer");
        go.transform.SetParent(parent, false);
        LayoutElement element = go.AddComponent<LayoutElement>();
        element.preferredWidth = 302f;
        element.preferredHeight = itemOffer ? 250f : 230f;
        Image background = go.AddComponent<Image>();
        background.sprite = buttonSprite;
        background.type = buttonSprite != null ? Image.Type.Sliced : Image.Type.Simple;
        background.color = buttonSprite != null ? Color.white : tint;
        Button button = go.AddComponent<Button>();
        button.onClick.AddListener(onClick);

        VerticalLayoutGroup column = go.AddComponent<VerticalLayoutGroup>();
        column.padding = new RectOffset(16, 16, 18, 16);
        column.spacing = 8f;
        column.childAlignment = TextAnchor.UpperCenter;
        column.childControlWidth = false;
        column.childControlHeight = false;
        column.childForceExpandWidth = false;
        column.childForceExpandHeight = false;

        GameObject iconGo = new GameObject("Icon");
        iconGo.transform.SetParent(go.transform, false);
        Image iconImage = iconGo.AddComponent<Image>();
        iconImage.sprite = icon;
        iconImage.preserveAspect = true;
        iconImage.color = icon != null ? Color.white : tint;
        LayoutElement iconLayout = iconGo.AddComponent<LayoutElement>();
        iconLayout.preferredWidth = itemOffer ? 96f : 76f;
        iconLayout.preferredHeight = itemOffer ? 96f : 76f;

        GameObject labelGo = new GameObject("Label");
        labelGo.transform.SetParent(go.transform, false);
        TextMeshProUGUI label = labelGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) label.font = fontAsset;
        label.text = text;
        label.fontSize = itemOffer ? 20f : 21f;
        label.color = new Color(0.16f, 0.2f, 0.28f, 1f);
        label.alignment = TextAlignmentOptions.Center;
        label.enableWordWrapping = true;
        LayoutElement labelLayout = labelGo.AddComponent<LayoutElement>();
        labelLayout.preferredWidth = 258f;
        labelLayout.preferredHeight = itemOffer ? 116f : 110f;
        labelLayout.flexibleWidth = 1f;
        return button;
    }

    private void CreateEmptyOfferSlot(Transform parent, string text)
    {
        LearningShopItemOfferView view = CreateItemOfferView(parent);
        view.BindEmpty(text);
    }

    private static void Clear(Transform root)
    {
        if (root == null) return;
        for (int i = root.childCount - 1; i >= 0; i--)
        {
            Destroy(root.GetChild(i).gameObject);
        }
    }
}
