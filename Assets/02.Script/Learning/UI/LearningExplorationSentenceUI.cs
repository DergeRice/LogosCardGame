using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

[System.Serializable]
public class LearningBossSpriteSet
{
    public string bossId;
    public Sprite normalSprite;
    public Sprite hitSprite;
    public Sprite deadSprite;
}

public class LearningExplorationSentenceUI : MonoBehaviour
{
    private LearningExplorationSentenceController controller;
    private LearningExplorationShopUI shopUI;
    private LearningItemInventory inventory;
    private LearningItemEffectExecutor effectExecutor;
    private Canvas canvas;
    private TMP_FontAsset fontAsset;
    private Sprite buttonSprite;
    private GameObject cardPrefab;
    private GameObject damageProjectilePrefab;
    private GameObject drawGhostCardPrefab;
    private RectTransform drawPileButtonRoot;
    private RectTransform discardPileButtonRoot;
    private LearningExplorationScreenView screenView;
    private LearningBossView bossView;

    private RectTransform uiRootRect;
    private TMP_Text titleText;
    private TMP_Text hpText;
    private TMP_Text countText;
    private TMP_Text submitCountText;
    private TMP_Text dropCountText;
    private TMP_Text messageText;
    private TMP_Text damageText;
    private TMP_Text plusText;
    private TMP_Text multiplyText;
    private Transform plusCountRoot;
    private Transform multiplyCountRoot;
    private Transform multiplyMinusRoot;
    private Image plusCountFill;
    private Image multiplyCountFill;
    private Image monsterImage;
    private Image monsterHpFill;
    private Image monsterHpDelayFill;
    private TMP_Text monsterHpText;
    private TMP_Text clearText;
    private Transform sentenceRoot;
    private Transform handRoot;
    private Transform itemRoot;
    private LearningItemSlotView[] itemSlotViews;
    private Button submitButton;
    private Button dropButton;
    private Button lobbyButton;
    private Button deckButton;
    private GameObject deckPanel;
    private GameObject drawPilePanel;
    private GameObject discardPilePanel;
    private TMP_Text deckPanelText;
    private Transform drawPileRoot;
    private Transform discardPileRoot;
    private GameObject defeatPanel;
    private readonly List<RectTransform> sentenceCardRects = new List<RectTransform>();
    private readonly List<LearningDeckCardView> sentenceCardViews = new List<LearningDeckCardView>();
    private readonly List<CanvasGroup> sentenceCardCanvasGroups = new List<CanvasGroup>();
    private readonly List<RectTransform> handCardRects = new List<RectTransform>();
    private readonly List<CanvasGroup> handCardCanvasGroups = new List<CanvasGroup>();
    private readonly HashSet<LearningDeckCard> sentenceStatPopPlayedCards = new HashSet<LearningDeckCard>();
    private readonly List<GameObject> itemSlotObjects = new List<GameObject>();
    private readonly List<string> itemSlotIds = new List<string>();
    private readonly List<GameObject> runtimeOverflowItemSlots = new List<GameObject>();
    private Coroutine submitAnimation;
    private RectTransform draggingSentenceCard;
    private CanvasGroup draggingSentenceCanvasGroup;
    private LayoutElement draggingSentenceLayoutElement;
    private Vector2 draggingSentencePointerOffset;
    private bool draggingSentenceOriginalIgnoreLayout;
    private bool draggingFromSentence;
    private int observedChapter = -1;
    private int observedBlindIndex = -1;
    private int observedHandCount = -1;
    private int observedSentenceCount = -1;
    private int observedDrawPileCount = -1;
    private int observedDiscardPileCount = -1;
    private int observedSupplyCount = -1;
    private bool awakeComplete;
    private bool uiBuilt;
    private GameObject dragVacantPreview;
    private bool pendingSentenceReturnToHand;
    private Vector2 pendingSentenceReturnStartPosition;
    private bool pendingHandPlayToSentence;
    private Vector2 pendingHandPlayStartPosition;
    private bool pendingTemporaryCardGeneration;
    private int pendingTemporaryCardGenerationCount;
    private bool hasSentenceGridBaseValues;
    private Vector2 sentenceGridBaseCellSize;
    private Vector2 sentenceGridBaseSpacing;
    private RectOffset sentenceGridBasePadding;
    private const float MovingCardMinAlpha = 0.75f;
    private const int SentenceGridCompactThreshold = 10;
    private static readonly Vector2 SentenceGridCompactCellSize = new Vector2(149.2f, 80f);
    private static readonly Vector2 SentenceGridCompactSpacing = new Vector2(8.2f, 50f);

    public void Configure(LearningExplorationSentenceController targetController, LearningExplorationShopUI targetShopUI, Canvas targetCanvas, TMP_FontAsset targetFontAsset = null)
    {
        controller = targetController;
        shopUI = targetShopUI;
        canvas = targetCanvas;
        ResolveRuntimeItemReferences();
        if (targetFontAsset != null) fontAsset = targetFontAsset;
        if (awakeComplete)
        {
            BuildIfNeeded();
            Subscribe();
            ApplyCurrentBossNormalSprite();
        }
    }

    private void Awake()
    {
        if (fontAsset == null) fontAsset = LearningFontProvider.DefaultFont;
        buttonSprite = LearningUiSkin.ResolveButtonSprite(buttonSprite);
        if (cardPrefab == null) cardPrefab = LearningUiSkin.ResolvePosCardPrefab(cardPrefab);
        if (screenView == null) screenView = GetComponent<LearningExplorationScreenView>();
        if (screenView == null) screenView = FindFirstObjectByType<LearningExplorationScreenView>();
        ApplyScreenViewBindings();
        if (controller == null) controller = FindFirstObjectByType<LearningExplorationSentenceController>();
        if (shopUI == null) shopUI = FindFirstObjectByType<LearningExplorationShopUI>();
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (effectExecutor == null) effectExecutor = FindFirstObjectByType<LearningItemEffectExecutor>();
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        BuildIfNeeded();
        Subscribe();
        awakeComplete = true;
        StartCoroutine(RefreshItemsNextFrame());
    }

    private void OnDestroy()
    {
        Unsubscribe();
    }

    public void PlayHandCard(int index) => RequestPlayHandCard(index, GetHandCard(index));
    public void PlayHandCard(int index, LearningDeckCard card) => RequestPlayHandCard(index, card);
    public void ReturnSentenceCard(int index) => RequestReturnSentenceCard(index);
    public bool IsScoringSentenceCard(int index) => controller != null && controller.IsScoringSentenceCard(index);

    public void SetGameplayVisible(bool visible)
    {
        if (sentenceRoot != null) sentenceRoot.gameObject.SetActive(visible);
        if (handRoot != null) handRoot.gameObject.SetActive(visible);
        if (itemRoot != null) itemRoot.gameObject.SetActive(visible);
        if (submitButton != null) submitButton.gameObject.SetActive(visible);
        if (dropButton != null) dropButton.gameObject.SetActive(visible);
        if (visible) RefreshItemSlotsNow();
    }

    public void RefreshItemSlotsNow()
    {
        ResolveRuntimeItemReferences();
        ApplyScreenViewBindings();
        RefreshItems();
        ForceLayoutRebuild(itemRoot);
    }

    public void PreviewSentenceDrag(int fromIndex, Vector2 screenPosition)
    {
        if (sentenceRoot == null || fromIndex < 0 || fromIndex >= sentenceCardRects.Count) return;

        UpdateDraggingSentenceCardPosition(screenPosition);

        int target = GetSentenceIndexFromScreenPosition(screenPosition);
        EnsureDragVacantPreview(fromIndex);
        if (dragVacantPreview == null) return;

        dragVacantPreview.transform.SetSiblingIndex(Mathf.Clamp(target, 0, sentenceRoot.childCount - 1));
    }

    public void CommitSentenceDrag(int fromIndex, Vector2 screenPosition)
    {
        int target = GetSentenceTargetIndexFromPreview(fromIndex, screenPosition);
        bool returnToHand = IsScreenPointOverRoot(handRoot, screenPosition);
        if (returnToHand)
        {
            QueueSentenceReturnAnimation(fromIndex, GetCanvasPosition(draggingSentenceCard, new Vector2(0f, -80f)));
        }
        EndSentenceCardDragVisual();
        ClearDragVacantPreview();
        if (controller == null || sentenceRoot == null) return;
        if (returnToHand)
        {
            controller.ReturnSentenceCard(fromIndex);
            return;
        }
        controller.MoveSentenceCard(fromIndex, target);
    }

    public void BeginSentenceDrag(int fromIndex, Vector2 screenPosition, RectTransform cardRect, CanvasGroup cardCanvasGroup)
    {
        BeginCardDrag(fromIndex, true, screenPosition, cardRect, cardCanvasGroup);
    }

    public void BeginHandDrag(int fromIndex, Vector2 screenPosition, RectTransform cardRect, CanvasGroup cardCanvasGroup)
    {
        BeginCardDrag(fromIndex, false, screenPosition, cardRect, cardCanvasGroup);
    }

    public void BeginHandDrag(int fromIndex, LearningDeckCard card, Vector2 screenPosition, RectTransform cardRect, CanvasGroup cardCanvasGroup)
    {
        BeginHandDrag(fromIndex, screenPosition, cardRect, cardCanvasGroup);
    }

    private void BeginCardDrag(int fromIndex, bool fromSentence, Vector2 screenPosition, RectTransform cardRect, CanvasGroup cardCanvasGroup)
    {
        if (cardRect == null) return;
        if (fromSentence && (sentenceRoot == null || fromIndex < 0 || fromIndex >= sentenceCardRects.Count)) return;
        if (!fromSentence && (handRoot == null || fromIndex < 0 || fromIndex >= handCardRects.Count)) return;

        draggingFromSentence = fromSentence;
        if (fromSentence)
        {
            EnsureDragVacantPreview(fromIndex);
            if (dragVacantPreview != null) dragVacantPreview.transform.SetSiblingIndex(fromIndex);
        }

        draggingSentenceCard = cardRect;
        draggingSentenceCanvasGroup = cardCanvasGroup;
        draggingSentenceLayoutElement = cardRect.GetComponent<LayoutElement>();
        if (draggingSentenceLayoutElement == null) draggingSentenceLayoutElement = cardRect.gameObject.AddComponent<LayoutElement>();
        draggingSentenceOriginalIgnoreLayout = draggingSentenceLayoutElement.ignoreLayout;
        draggingSentenceLayoutElement.ignoreLayout = true;

        if (draggingSentenceCanvasGroup != null)
        {
            draggingSentenceCanvasGroup.alpha = 0.82f;
            draggingSentenceCanvasGroup.blocksRaycasts = false;
        }

        RectTransform parentRect = cardRect.parent as RectTransform;
        if (parentRect != null &&
            RectTransformUtility.ScreenPointToLocalPointInRectangle(parentRect, screenPosition, GetCanvasCamera(), out Vector2 localPoint))
        {
            draggingSentencePointerOffset = cardRect.anchoredPosition - localPoint;
        }
        else
        {
            draggingSentencePointerOffset = Vector2.zero;
        }

        cardRect.SetAsLastSibling();
        UpdateDraggingSentenceCardPosition(screenPosition);
        ForceLayoutRebuild(fromSentence ? sentenceRoot : handRoot);
    }

    public void UpdateSentenceDrag(int fromIndex, Vector2 screenPosition)
    {
        if (fromIndex < 0) return;
        PreviewSentenceDrag(fromIndex, screenPosition);
    }

    public void UpdateHandDrag(int fromIndex, Vector2 screenPosition)
    {
        if (fromIndex < 0) return;
        UpdateDraggingSentenceCardPosition(screenPosition);
        if (IsScreenPointOverRoot(sentenceRoot, screenPosition))
        {
            if (controller != null && !controller.CanAddSentenceCard)
            {
                ClearDragVacantPreview();
                return;
            }

            EnsureHandToSentenceVacantPreview();
            if (dragVacantPreview != null) dragVacantPreview.transform.SetAsLastSibling();
        }
        else
        {
            ClearDragVacantPreview();
        }
    }

    public void CommitHandDrag(int fromIndex, Vector2 screenPosition)
    {
        CommitHandDrag(fromIndex, GetHandCard(fromIndex), screenPosition);
    }

    public void CommitHandDrag(int fromIndex, LearningDeckCard card, Vector2 screenPosition)
    {
        Vector2 dragStartPosition = GetCanvasPosition(draggingSentenceCard, new Vector2(0f, -320f));
        EndSentenceCardDragVisual();
        ClearDragVacantPreview();
        if (controller == null) return;
        if (IsScreenPointOverRoot(sentenceRoot, screenPosition))
        {
            if (!controller.CanAddSentenceCard)
            {
                SetMessage($"문장은 최대 {LearningExplorationSentenceController.MaxSentenceCardCount}장까지 올릴 수 있습니다.");
                return;
            }

            QueueHandPlayAnimation(fromIndex, dragStartPosition);
            QueueTemporaryCardGenerationIfNeeded(card);
            if (card != null) controller.PlayHandCard(card);
            else controller.PlayHandCard(fromIndex);
            return;
        }
    }

    private void RequestPlayHandCard(int index, LearningDeckCard card)
    {
        if (controller != null && !controller.CanAddSentenceCard && !LearningSpecialDeckCardRules.TryGetDrawAmount(card, out _))
        {
            SetMessage($"문장은 최대 {LearningExplorationSentenceController.MaxSentenceCardCount}장까지 올릴 수 있습니다.");
            return;
        }

        QueueHandPlayAnimation(index);
        QueueTemporaryCardGenerationIfNeeded(card);
        if (card != null) controller?.PlayHandCard(card);
        else controller?.PlayHandCard(index);
    }

    private void QueueTemporaryCardGenerationIfNeeded(LearningDeckCard card)
    {
        if (!LearningSpecialDeckCardRules.TryGetDrawAmount(card, out int drawAmount)) return;
        if (!LearningSpecialDeckCardRules.CreatesTemporaryCards(card)) return;
        if (effectExecutor != null && effectExecutor.ShouldRealizeTemporaryCards()) return;

        pendingTemporaryCardGeneration = true;
        pendingTemporaryCardGenerationCount = Mathf.Max(0, drawAmount);
    }

    private void QueueHandPlayAnimation(int index)
    {
        RectTransform source = index >= 0 && index < handCardRects.Count ? handCardRects[index] : null;
        Vector2 fallback = new Vector2(-320f + Mathf.Max(0, index) * 110f, -360f);
        QueueHandPlayAnimation(index, GetCanvasPosition(source, fallback));
    }

    private void QueueHandPlayAnimation(int index, Vector2 startPosition)
    {
        if (index < 0) return;
        pendingHandPlayToSentence = true;
        pendingHandPlayStartPosition = startPosition;
    }

    private void RequestReturnSentenceCard(int index)
    {
        QueueSentenceReturnAnimation(index);
        controller?.ReturnSentenceCard(index);
    }

    private void QueueSentenceReturnAnimation(int index)
    {
        RectTransform source = index >= 0 && index < sentenceCardRects.Count ? sentenceCardRects[index] : null;
        Vector2 fallback = new Vector2(-260f + Mathf.Max(0, index) * 24f, -90f);
        QueueSentenceReturnAnimation(index, GetCanvasPosition(source, fallback));
    }

    private void QueueSentenceReturnAnimation(int index, Vector2 startPosition)
    {
        if (index < 0) return;
        pendingSentenceReturnToHand = true;
        pendingSentenceReturnStartPosition = startPosition;
    }

    public void CancelSentenceDragVisual()
    {
        EndSentenceCardDragVisual();
        ClearDragVacantPreview();
    }

    private int GetSentenceIndexFromScreenPosition(Vector2 screenPosition)
    {
        int count = controller != null ? controller.SentenceCards.Count : 0;
        if (count <= 1) return 0;

        if (draggingSentenceCard != null && sentenceRoot != null)
        {
            int target = 0;
            for (int i = 0; i < sentenceRoot.childCount; i++)
            {
                Transform child = sentenceRoot.GetChild(i);
                if (child == null || child == draggingSentenceCard) continue;
                if (dragVacantPreview != null && child.gameObject == dragVacantPreview) continue;
                RectTransform rect = child as RectTransform;
                if (rect == null) continue;
                Vector2 childCenter = GetRectScreenCenter(rect);
                float rowThreshold = GetRectScreenHeight(rect) * 0.55f;
                bool sameRow = Mathf.Abs(screenPosition.y - childCenter.y) <= rowThreshold;
                bool beforeRow = screenPosition.y > childCenter.y + rowThreshold;
                bool beforeInRow = sameRow && screenPosition.x < childCenter.x;
                if (beforeRow || beforeInRow) return Mathf.Clamp(target, 0, count - 1);
                target++;
            }

            return count - 1;
        }

        for (int i = 0; i < sentenceCardRects.Count; i++)
        {
            RectTransform child = sentenceCardRects[i];
            if (child == null) continue;
            Vector2 childCenter = GetRectScreenCenter(child);
            float rowThreshold = GetRectScreenHeight(child) * 0.55f;
            bool sameRow = Mathf.Abs(screenPosition.y - childCenter.y) <= rowThreshold;
            bool beforeRow = screenPosition.y > childCenter.y + rowThreshold;
            bool beforeInRow = sameRow && screenPosition.x < childCenter.x;
            if (beforeRow || beforeInRow) return i;
        }
        return count - 1;
    }

    private int GetSentenceTargetIndexFromPreview(int fallbackFromIndex, Vector2 screenPosition)
    {
        int count = controller != null ? controller.SentenceCards.Count : 0;
        if (count <= 1) return 0;
        if (dragVacantPreview == null || sentenceRoot == null) return GetSentenceIndexFromScreenPosition(screenPosition);

        int target = 0;
        for (int i = 0; i < sentenceRoot.childCount; i++)
        {
            Transform child = sentenceRoot.GetChild(i);
            if (child == null || child == draggingSentenceCard) continue;
            if (child.gameObject == dragVacantPreview) return Mathf.Clamp(target, 0, count - 1);
            target++;
        }

        return Mathf.Clamp(fallbackFromIndex, 0, count - 1);
    }

    private Vector2 GetRectScreenCenter(RectTransform rect)
    {
        if (rect == null) return Vector2.zero;
        Vector3 world = rect.TransformPoint(rect.rect.center);
        return RectTransformUtility.WorldToScreenPoint(GetCanvasCamera(), world);
    }

    private float GetRectScreenHeight(RectTransform rect)
    {
        if (rect == null) return 1f;
        Vector3 top = rect.TransformPoint(new Vector3(rect.rect.center.x, rect.rect.yMax, 0f));
        Vector3 bottom = rect.TransformPoint(new Vector3(rect.rect.center.x, rect.rect.yMin, 0f));
        Vector2 topScreen = RectTransformUtility.WorldToScreenPoint(GetCanvasCamera(), top);
        Vector2 bottomScreen = RectTransformUtility.WorldToScreenPoint(GetCanvasCamera(), bottom);
        return Mathf.Max(1f, Mathf.Abs(topScreen.y - bottomScreen.y));
    }

    private void UpdateDraggingSentenceCardPosition(Vector2 screenPosition)
    {
        if (draggingSentenceCard == null) return;
        RectTransform parentRect = draggingSentenceCard.parent as RectTransform;
        if (parentRect == null) return;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(parentRect, screenPosition, GetCanvasCamera(), out Vector2 localPoint)) return;
        draggingSentenceCard.anchoredPosition = localPoint + draggingSentencePointerOffset;
    }

    private void EndSentenceCardDragVisual()
    {
        if (draggingSentenceLayoutElement != null)
        {
            draggingSentenceLayoutElement.ignoreLayout = draggingSentenceOriginalIgnoreLayout;
        }

        if (draggingSentenceCanvasGroup != null)
        {
            draggingSentenceCanvasGroup.alpha = 1f;
            draggingSentenceCanvasGroup.blocksRaycasts = true;
        }

        draggingSentenceCard = null;
        draggingSentenceCanvasGroup = null;
        draggingSentenceLayoutElement = null;
        draggingSentencePointerOffset = Vector2.zero;
        draggingSentenceOriginalIgnoreLayout = false;
        draggingFromSentence = false;
        ForceLayoutRebuild(sentenceRoot);
        ForceLayoutRebuild(handRoot);
    }

    private bool IsScreenPointOverRoot(Transform root, Vector2 screenPosition)
    {
        RectTransform rect = root as RectTransform;
        return rect != null && RectTransformUtility.RectangleContainsScreenPoint(rect, screenPosition, GetCanvasCamera());
    }

    private Camera GetCanvasCamera()
    {
        if (canvas == null || canvas.renderMode == RenderMode.ScreenSpaceOverlay) return null;
        return canvas.worldCamera;
    }

    private static Transform FindChildRecursive(Transform root, string childName)
    {
        if (root == null || string.IsNullOrEmpty(childName)) return null;
        for (int i = 0; i < root.childCount; i++)
        {
            Transform child = root.GetChild(i);
            if (child == null) continue;
            if (child.name == childName) return child;
            Transform nested = FindChildRecursive(child, childName);
            if (nested != null) return nested;
        }

        return null;
    }

    private void Subscribe()
    {
        if (controller == null) return;
        controller.StateChanged -= Refresh;
        controller.StateChanged += Refresh;
        controller.MessageRaised -= SetMessage;
        controller.MessageRaised += SetMessage;
        controller.ShopRequested -= OpenShop;
        controller.ShopRequested += OpenShop;
        controller.Defeated -= OpenDefeatPanel;
        controller.Defeated += OpenDefeatPanel;
        controller.SubmitAnimationRequested -= PlaySubmitAnimation;
        controller.SubmitAnimationRequested += PlaySubmitAnimation;
        Refresh();
    }

    private IEnumerator RefreshItemsNextFrame()
    {
        yield return null;
        ApplyScreenViewBindings();
        RefreshItems();
    }

    private void Unsubscribe()
    {
        if (controller == null) return;
        controller.StateChanged -= Refresh;
        controller.MessageRaised -= SetMessage;
        controller.ShopRequested -= OpenShop;
        controller.Defeated -= OpenDefeatPanel;
        controller.SubmitAnimationRequested -= PlaySubmitAnimation;
    }

    private void Refresh()
    {
        if (controller == null) return;
        ApplyScreenViewBindings();
        ApplyBossSprites();
        bool newBlind = observedChapter >= 0 && (observedChapter != controller.Chapter || observedBlindIndex != controller.BlindIndex);
        int currentHandCount = controller.Deck != null ? controller.Deck.hand.Count : 0;
        int currentSentenceCount = controller.SentenceCards.Count;
        int currentDrawPileCount = controller.Deck != null ? controller.Deck.drawPile.Count : 0;
        int currentDiscardPileCount = controller.Deck != null ? controller.Deck.discardPile.Count : 0;
        int currentSupplyCount = controller.DropsRemaining;
        int drawDelta = observedHandCount >= 0 ? Mathf.Max(0, currentHandCount - observedHandCount) : currentHandCount;
        int drawRevealStartIndex = Mathf.Max(0, currentHandCount - drawDelta);
        bool useSentenceReturnAnimation = pendingSentenceReturnToHand && drawDelta > 0 && !controller.IsResolvingSubmit;
        Vector2 sentenceReturnStartPosition = pendingSentenceReturnStartPosition;
        if (useSentenceReturnAnimation || pendingSentenceReturnToHand)
        {
            pendingSentenceReturnToHand = false;
            pendingSentenceReturnStartPosition = Vector2.zero;
        }
        int sentenceDelta = observedSentenceCount >= 0 ? currentSentenceCount - observedSentenceCount : 0;
        bool useHandPlayAnimation = pendingHandPlayToSentence && sentenceDelta > 0 && !controller.IsResolvingSubmit;
        int handPlayTargetSentenceIndex = useHandPlayAnimation ? currentSentenceCount - 1 : -1;
        Vector2 handPlayStartPosition = pendingHandPlayStartPosition;
        if (useHandPlayAnimation || pendingHandPlayToSentence)
        {
            pendingHandPlayToSentence = false;
            pendingHandPlayStartPosition = Vector2.zero;
        }
        int generatedTemporaryCount = Mathf.Min(Mathf.Max(0, pendingTemporaryCardGenerationCount), currentHandCount);
        int generatedTemporaryStartIndex = Mathf.Max(0, currentHandCount - generatedTemporaryCount);
        bool useTemporaryGenerationAnimation = pendingTemporaryCardGeneration && generatedTemporaryCount > 0 && !controller.IsResolvingSubmit;
        if (useTemporaryGenerationAnimation || pendingTemporaryCardGeneration)
        {
            pendingTemporaryCardGeneration = false;
            pendingTemporaryCardGenerationCount = 0;
        }
        int recycleCount = observedDiscardPileCount > 0 && currentDiscardPileCount == 0 && currentDrawPileCount > observedDrawPileCount
            ? observedDiscardPileCount
            : 0;
        bool supplyUsed = observedSupplyCount >= 0 && currentSupplyCount < observedSupplyCount;
        List<RectTransform> oldHandClearGhosts = newBlind ? CaptureHandClearGhosts() : null;

        Clear(sentenceRoot);
        Clear(handRoot);
        if (!HasFixedItemSlots()) Clear(itemRoot);
        sentenceCardRects.Clear();
        sentenceCardViews.Clear();
        sentenceCardCanvasGroups.Clear();
        handCardRects.Clear();
        handCardCanvasGroups.Clear();
        PruneSentenceStatPopPlayedCards();
        itemSlotObjects.Clear();
        itemSlotIds.Clear();
        ClearDragVacantPreview();
        ApplySentenceGridScale(currentSentenceCount);

        if (titleText != null) titleText.text = $"탐험 Chapter {controller.Chapter} / {(controller.BlindIndex == 2 ? "Big" : "Small " + (controller.BlindIndex + 1))}";
        if (hpText != null) hpText.text = $"HP {LearningNumberFormatter.Format(controller.BlindHp)}/{LearningNumberFormatter.Format(controller.MaxBlindHp)}";
        if (countText != null) countText.text = $"제출 {controller.HandsRemaining} / 드로우 {controller.DropsRemaining} / 배율 x{controller.CurrentScoreMultiplier:0.#} / 덱 {controller.Deck?.drawPile.Count ?? 0} / 버린덱 {controller.Deck?.discardPile.Count ?? 0}";
        if (submitCountText != null) submitCountText.text = $"{controller.HandsRemaining}/{controller.HandsMax}";
        if (dropCountText != null) dropCountText.text = $"{controller.DropsRemaining}/{controller.DropsMax}";
        RefreshScorePreview();
        SetMonsterHpVisual(controller.BlindHp, controller.MaxBlindHp);
        if (!controller.IsResolvingSubmit)
        {
            if (clearText != null) clearText.gameObject.SetActive(false);
            SetDamageTextVisible(false);
            ApplyCurrentBossNormalSprite();
        }

        for (int i = 0; i < controller.SentenceCards.Count; i++)
        {
            bool hideForHandPlay = useHandPlayAnimation && i == handPlayTargetSentenceIndex;
            CreateCard(sentenceRoot, i, controller.SentenceCards[i], true, hideForHandPlay);
        }

        if (controller.Deck != null)
        {
            for (int i = 0; i < controller.Deck.hand.Count; i++)
            {
                bool hideForDraw = !controller.IsResolvingSubmit && drawDelta > 0 && i >= drawRevealStartIndex;
                if (newBlind) hideForDraw = true;
                if (useTemporaryGenerationAnimation)
                {
                    hideForDraw = i >= generatedTemporaryStartIndex && i < generatedTemporaryStartIndex + generatedTemporaryCount;
                }
                CreateCard(handRoot, i, controller.Deck.hand[i], false, hideForDraw);
            }
        }

        RefreshItems();

        ForceLayoutRebuild(sentenceRoot);
        ForceLayoutRebuild(handRoot);
        ForceLayoutRebuild(itemRoot);

        observedChapter = controller.Chapter;
        observedBlindIndex = controller.BlindIndex;
        observedHandCount = currentHandCount;
        observedSentenceCount = currentSentenceCount;
        observedDrawPileCount = currentDrawPileCount;
        observedDiscardPileCount = currentDiscardPileCount;
        observedSupplyCount = currentSupplyCount;

        if (!controller.IsResolvingSubmit)
        {
            if (newBlind) StartCoroutine(PlayNewBlindTransition(oldHandClearGhosts, currentHandCount, 0));
            else if (supplyUsed) StartCoroutine(PlaySupplyUseSequence(recycleCount, drawDelta, drawRevealStartIndex));
            else if (recycleCount > 0) StartCoroutine(PlayRecycleThenDrawGhosts(recycleCount, drawDelta, drawRevealStartIndex));
            else if (useTemporaryGenerationAnimation) StartCoroutine(PlayTemporaryGeneratedCards(generatedTemporaryCount, generatedTemporaryStartIndex));
            else if (useHandPlayAnimation) StartCoroutine(PlayHandToSentenceGhost(handPlayTargetSentenceIndex, handPlayStartPosition));
            else if (useSentenceReturnAnimation) StartCoroutine(PlaySentenceReturnToHandGhost(drawRevealStartIndex, sentenceReturnStartPosition));
            else if (drawDelta > 0) StartCoroutine(PlayDrawGhosts(drawDelta, drawRevealStartIndex));
        }
    }

    private void SetMessage(string message)
    {
        if (messageText != null) messageText.text = message;
    }

    private void ApplyScreenViewBindings()
    {
        if (screenView == null) return;
        screenView.RefreshItemSlotReferences();
        if (screenView.canvas != null) canvas = screenView.canvas;
        if (screenView.uiRootRect != null) uiRootRect = screenView.uiRootRect;
        if (screenView.bossView != null) bossView = screenView.bossView;
        if (screenView.titleText != null) titleText = screenView.titleText;
        if (screenView.hpText != null) hpText = screenView.hpText;
        if (screenView.countText != null) countText = screenView.countText;
        if (screenView.submitCountText != null) submitCountText = screenView.submitCountText;
        if (screenView.dropCountText != null) dropCountText = screenView.dropCountText;
        if (screenView.messageText != null) messageText = screenView.messageText;
        if (screenView.damageText != null) damageText = screenView.damageText;
        if (screenView.plusText != null) plusText = screenView.plusText;
        if (screenView.multiplyText != null) multiplyText = screenView.multiplyText;
        if (screenView.plusRoot != null) plusCountRoot = screenView.plusRoot;
        if (screenView.multiplyRoot != null) multiplyCountRoot = screenView.multiplyRoot;
        if (multiplyCountRoot != null && multiplyMinusRoot == null) multiplyMinusRoot = FindChildRecursive(multiplyCountRoot, "Minus");
        if (screenView.plusFill != null) plusCountFill = screenView.plusFill;
        if (screenView.multiplyFill != null) multiplyCountFill = screenView.multiplyFill;
        if (screenView.damageProjectilePrefab != null) damageProjectilePrefab = screenView.damageProjectilePrefab;
        if (screenView.drawGhostCardPrefab != null) drawGhostCardPrefab = screenView.drawGhostCardPrefab;
        if (screenView.drawPileButtonRoot != null) drawPileButtonRoot = screenView.drawPileButtonRoot;
        if (screenView.discardPileButtonRoot != null) discardPileButtonRoot = screenView.discardPileButtonRoot;
        if (screenView.sentenceRoot != null) sentenceRoot = screenView.sentenceRoot;
        if (screenView.handRoot != null) handRoot = screenView.handRoot;
        if (screenView.itemRoot != null) itemRoot = screenView.itemRoot;
        if (screenView.itemSlotViews != null && screenView.itemSlotViews.Length > 0) itemSlotViews = screenView.itemSlotViews;
        if (screenView.submitButton != null) submitButton = screenView.submitButton;
        if (screenView.dropButton != null) dropButton = screenView.dropButton;
        if (screenView.lobbyButton != null) lobbyButton = screenView.lobbyButton;
        if (screenView.deckButton != null) deckButton = screenView.deckButton;
        if (screenView.deckPanel != null) deckPanel = screenView.deckPanel;
        if (screenView.drawPilePanel != null) drawPilePanel = screenView.drawPilePanel;
        if (screenView.discardPilePanel != null) discardPilePanel = screenView.discardPilePanel;
        if (screenView.deckPanelText != null) deckPanelText = screenView.deckPanelText;
        if (screenView.drawPileRoot != null) drawPileRoot = screenView.drawPileRoot;
        if (screenView.discardPileRoot != null) discardPileRoot = screenView.discardPileRoot;
        if (screenView.defeatPanel != null) defeatPanel = screenView.defeatPanel;
        ApplyBossViewBindings();
    }

    private void ApplyBossViewBindings()
    {
        if (bossView == null) return;
        if (monsterImage == null) monsterImage = bossView.BossImage;
        if (monsterHpText == null) monsterHpText = bossView.HpText;
        if (clearText == null) clearText = bossView.ClearText;
    }

    private void RefreshScorePreview()
    {
        int plus = 0;
        float multiply = GetCurrentCountsBaseMultiplier();
        for (int i = 0; i < SentenceCardsSafeCount(); i++)
        {
            LearningDeckCard card = controller.SentenceCards[i];
            if (card == null) continue;
            plus += card.bonusScore;
            multiply += GetCardMultiplierBonus(card);
        }

        if (plusText != null) plusText.text = plus >= 0 ? $"+{plus}" : plus.ToString();
        if (multiplyText != null) multiplyText.text = $"x{multiply:0.##}";
        SetStatFill(plusCountFill, SentenceCardsSafeCount() > 0 && plus != 0 ? 1f : 0f);
        SetStatFill(multiplyCountFill, SentenceCardsSafeCount() > 0 && Mathf.Abs(multiply - 1f) > 0.001f ? 1f : 0f);
        ApplyCountScale(plusCountRoot != null ? plusCountRoot : plusText != null ? plusText.transform : null, Mathf.Abs(plus), 60f);
        ApplyMultiplierCountScale(multiplyCountRoot != null ? multiplyCountRoot : multiplyText != null ? multiplyText.transform : null, multiply);
    }

    private void EnsureDragVacantPreview(int fromIndex)
    {
        if (dragVacantPreview != null) return;
        if (fromIndex < 0 || fromIndex >= sentenceCardRects.Count) return;
        RectTransform source = sentenceCardRects[fromIndex];
        if (source == null) return;

        dragVacantPreview = Instantiate(source.gameObject, sentenceRoot);
        dragVacantPreview.name = "VacantPreview";
        LearningExplorationSentenceCardView sentenceView = dragVacantPreview.GetComponent<LearningExplorationSentenceCardView>();
        if (sentenceView != null) sentenceView.enabled = false;
        Button[] buttons = dragVacantPreview.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++) buttons[i].interactable = false;

        CanvasGroup group = dragVacantPreview.GetComponent<CanvasGroup>();
        if (group == null) group = dragVacantPreview.AddComponent<CanvasGroup>();
        group.alpha = 0.38f;
        group.blocksRaycasts = false;
        group.interactable = false;

        Image[] images = dragVacantPreview.GetComponentsInChildren<Image>(true);
        for (int i = 0; i < images.Length; i++)
        {
            Color color = images[i].color;
            images[i].color = new Color(color.r * 0.45f, color.g * 0.45f, color.b * 0.45f, color.a);
        }
    }

    private void EnsureHandToSentenceVacantPreview()
    {
        if (dragVacantPreview != null || draggingSentenceCard == null || sentenceRoot == null) return;

        dragVacantPreview = Instantiate(draggingSentenceCard.gameObject, sentenceRoot);
        dragVacantPreview.name = "VacantPreview";
        LearningExplorationSentenceCardView sentenceView = dragVacantPreview.GetComponent<LearningExplorationSentenceCardView>();
        if (sentenceView != null) sentenceView.enabled = false;
        Button[] buttons = dragVacantPreview.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++) buttons[i].interactable = false;

        CanvasGroup group = dragVacantPreview.GetComponent<CanvasGroup>();
        if (group == null) group = dragVacantPreview.AddComponent<CanvasGroup>();
        group.alpha = 0.38f;
        group.blocksRaycasts = false;
        group.interactable = false;

        Image[] images = dragVacantPreview.GetComponentsInChildren<Image>(true);
        for (int i = 0; i < images.Length; i++)
        {
            Color color = images[i].color;
            images[i].color = new Color(color.r * 0.45f, color.g * 0.45f, color.b * 0.45f, color.a);
        }
    }

    private void ClearDragVacantPreview()
    {
        if (dragVacantPreview == null) return;
        Destroy(dragVacantPreview);
        dragVacantPreview = null;
    }

    private static void SetStatFill(Image image, float value)
    {
        if (image == null) return;
        image.fillAmount = Mathf.Clamp01(value);
    }

    private void ApplyCountScale(Transform target, float value, float maxReference)
    {
        if (target == null) return;
        float t = Mathf.Clamp01(value / Mathf.Max(1f, maxReference));
        target.localScale = Vector3.one * Mathf.Lerp(1f, 2f, t);
        RefreshCountsLayout(target);
    }

    private void ApplyCountsTextAndScale(int plusValue, float multiplierValue)
    {
        if (plusText != null) plusText.text = plusValue >= 0 ? $"+{plusValue}" : plusValue.ToString();
        if (multiplyText != null) multiplyText.text = $"x{multiplierValue:0.##}";
        ApplyCountScale(plusCountRoot != null ? plusCountRoot : plusText != null ? plusText.transform : null, Mathf.Abs(plusValue), 60f);
        ApplyMultiplierCountScale(multiplyCountRoot != null ? multiplyCountRoot : multiplyText != null ? multiplyText.transform : null, multiplierValue);
    }

    private void ApplyMultiplierCountScale(Transform target, float multiplierValue)
    {
        if (target == null) return;
        target.localScale = GetMultiplierCountScale(multiplierValue);
        RefreshCountsLayout(target);
    }

    private void RefreshCountsLayout(Transform target)
    {
        if (target == null) return;
        RectTransform rect = target as RectTransform;
        if (rect != null) LayoutRebuilder.MarkLayoutForRebuild(rect);
        RectTransform parent = target.parent as RectTransform;
        if (parent != null)
        {
            LayoutRebuilder.MarkLayoutForRebuild(parent);
            LayoutRebuilder.ForceRebuildLayoutImmediate(parent);
        }
    }

    private static Vector3 GetMultiplierCountScale(float multiplierValue)
    {
        float t = Mathf.Clamp01(Mathf.Max(0f, multiplierValue - 1f) / 12f);
        return Vector3.one * Mathf.Lerp(1f, 1.45f, t);
    }

    private float GetCurrentCountsBaseMultiplier()
    {
        return controller != null ? Mathf.Max(0f, controller.CurrentScoreMultiplier) : 1f;
    }

    private int SentenceCardsSafeCount()
    {
        return controller != null && controller.SentenceCards != null ? controller.SentenceCards.Count : 0;
    }

    private void ApplyBossSprites()
    {
        if (controller != null && controller.IsWaitingForShop)
        {
            if (bossView != null) bossView.HideUntilNextBoss();
            if (monsterImage != null) monsterImage.gameObject.SetActive(false);
            return;
        }

        if (bossView != null) bossView.BindBossIndex(GetCurrentBossIndex());
    }

    private int GetCurrentBossIndex()
    {
        if (controller == null) return 0;
        return Mathf.Max(0, ((controller.Chapter - 1) * 3 + controller.BlindIndex) % 15);
    }

    private Sprite GetBossNormalSprite()
    {
        return null;
    }

    private Sprite GetBossHitSprite()
    {
        return null;
    }

    private Sprite GetBossDeadSprite()
    {
        return null;
    }

    private void ApplyCurrentBossNormalSprite()
    {
        if (controller != null && controller.IsWaitingForShop)
        {
            if (bossView != null) bossView.HideUntilNextBoss();
            if (monsterImage != null) monsterImage.gameObject.SetActive(false);
            return;
        }

        if (bossView != null)
        {
            bossView.BindBossIndex(GetCurrentBossIndex());
            bossView.ShowNormal();
            return;
        }

        if (monsterImage == null) return;
        Sprite normal = GetBossNormalSprite();
        monsterImage.sprite = normal;
        monsterImage.color = normal != null
            ? new Color(1f, 1f, 1f, 0.82f)
            : new Color(0.38f, 0.18f, 0.22f, 0.54f);
    }

    private void OpenShop()
    {
        shopUI?.OpenShop();
    }

    private void ToggleDeckPanel()
    {
        BuildDeckPanelIfNeeded();
        bool next = !AreDeckPanelsVisible();
        SetDeckPanelsVisible(next);
        if (next && controller != null)
        {
            RefreshDeckPanel();
        }
    }

    private void ToggleDrawPilePanel()
    {
        BuildDeckPanelIfNeeded();
        bool next = drawPilePanel == null || !drawPilePanel.activeSelf || discardPilePanel != null && discardPilePanel.activeSelf;
        SetPilePanelsVisible(next, true);
        if (next && controller != null) RefreshDeckPanel();
    }

    private void ToggleDiscardPilePanel()
    {
        BuildDeckPanelIfNeeded();
        bool next = discardPilePanel == null || !discardPilePanel.activeSelf || drawPilePanel != null && drawPilePanel.activeSelf;
        SetPilePanelsVisible(next, false);
        if (next && controller != null) RefreshDeckPanel();
    }

    private bool AreDeckPanelsVisible()
    {
        if (drawPilePanel != null && drawPilePanel.activeSelf) return true;
        if (discardPilePanel != null && discardPilePanel.activeSelf) return true;
        return deckPanel != null && deckPanel.activeSelf;
    }

    private void SetDeckPanelsVisible(bool visible)
    {
        if (deckPanel != null) deckPanel.SetActive(visible);
        if (drawPilePanel != null) drawPilePanel.SetActive(visible);
        if (discardPilePanel != null) discardPilePanel.SetActive(visible);
    }

    private void SetPilePanelsVisible(bool visible, bool showDrawPile)
    {
        if (deckPanel != null) deckPanel.SetActive(visible);
        if (drawPilePanel != null) drawPilePanel.SetActive(visible && showDrawPile);
        if (discardPilePanel != null) discardPilePanel.SetActive(visible && !showDrawPile);
    }

    private void OpenDefeatPanel()
    {
        BuildDefeatPanelIfNeeded();
        WireDefeatPanelButtons();
        if (defeatPanel != null) defeatPanel.SetActive(true);
        SetGameplayVisible(false);
    }

    private void PlaySubmitAnimation(int startIndex, int usedLength, int baseScore, int finalScore, string triggerSummary, int oldHp, int newHp, bool willClear)
    {
        if (submitAnimation != null) StopCoroutine(submitAnimation);
        var triggeredItemIds = new HashSet<string>();
        if (effectExecutor != null && effectExecutor.LastTriggeredItemIds != null)
        {
            for (int i = 0; i < effectExecutor.LastTriggeredItemIds.Count; i++)
            {
                string id = effectExecutor.LastTriggeredItemIds[i];
                if (!string.IsNullOrWhiteSpace(id)) triggeredItemIds.Add(id);
            }
        }
        submitAnimation = StartCoroutine(PlaySubmitAnimationRoutine(startIndex, usedLength, baseScore, finalScore, triggerSummary, triggeredItemIds, oldHp, newHp, willClear));
    }

    private IEnumerator PlaySubmitAnimationRoutine(int startIndex, int usedLength, int baseScore, int finalScore, string triggerSummary, HashSet<string> triggeredItemIds, int oldHp, int newHp, bool willClear)
    {
        int end = Mathf.Min(sentenceCardRects.Count, startIndex + usedLength);
        var originalPositions = new Dictionary<RectTransform, Vector2>();
        var originalScales = new Dictionary<RectTransform, Vector3>();
        var originalRotations = new Dictionary<RectTransform, Quaternion>();
        SetStatFill(plusCountFill, 0f);
        SetStatFill(multiplyCountFill, 0f);
        SetDamageTextVisible(false);
        float baseCountsMultiplier = GetCurrentCountsBaseMultiplier();
        if (plusText != null) plusText.text = "+0";
        if (multiplyText != null) multiplyText.text = $"x{baseCountsMultiplier:0.##}";
        ApplyCountScale(plusCountRoot != null ? plusCountRoot : plusText != null ? plusText.transform : null, 0f, 60f);
        ApplyMultiplierCountScale(multiplyCountRoot != null ? multiplyCountRoot : multiplyText != null ? multiplyText.transform : null, baseCountsMultiplier);
        int damageDisplayValue = 0;
        bool useBaseCardScore = baseCountsMultiplier > 0f;

        for (int i = Mathf.Max(0, startIndex); i < end; i++)
        {
            RectTransform rect = sentenceCardRects[i];
            if (rect == null) continue;
            LearningDeckCardView cardView = i >= 0 && i < sentenceCardViews.Count ? sentenceCardViews[i] : null;
            if (messageText != null && controller != null && i >= 0 && i < controller.SentenceCards.Count)
            {
                messageText.text = $"카드 점수: {LearningSpecialDeckCardRules.GetCardLabelWithStats(controller.SentenceCards[i])}";
            }
            originalPositions[rect] = rect.anchoredPosition;
            originalScales[rect] = rect.localScale;
            originalRotations[rect] = rect.localRotation;
            rect.anchoredPosition += new Vector2(0f, 24f);
            ApplySentenceCardLayoutScale(rect, 1.15f);
            LearningSfxPlayer.PlayCardTick();
            yield return WiggleCard(rect, originalRotations[rect]);
            if (useBaseCardScore)
            {
                LearningSfxPlayer.PlayScoreCount();
                yield return CountScore(damageDisplayValue, damageDisplayValue + 1, "기본 점수", 1);
                damageDisplayValue += 1;
            }
            yield return AnimateCardStatFillToCounts(cardView, i, startIndex, usedLength);
            yield return new WaitForSeconds(0.035f);
        }

        int additiveScore = GetSubmittedCardBonusScore(startIndex, usedLength);
        if (additiveScore != 0)
        {
            LearningSfxPlayer.PlayScoreCount();
            yield return CountScoreWithFillDrain(damageDisplayValue, damageDisplayValue + additiveScore, "추가 점수", 1, plusCountFill);
            damageDisplayValue += additiveScore;
            if (plusText != null) plusText.text = "+0";
            ApplyCountScale(plusCountRoot != null ? plusCountRoot : plusText != null ? plusText.transform : null, 0f, 60f);
            yield return new WaitForSeconds(0.12f);
        }

        if (!string.IsNullOrEmpty(triggerSummary))
        {
            LearningSfxPlayer.PlayItemTrigger();
            yield return PulseItemSlots(triggeredItemIds);
        }

        if (baseScore != damageDisplayValue)
        {
            LearningSfxPlayer.PlayScoreCount();
            yield return CountScore(damageDisplayValue, baseScore, "배율 계산", Mathf.Max(1, usedLength));
            damageDisplayValue = baseScore;
            yield return new WaitForSeconds(0.12f);
        }

        if (finalScore != damageDisplayValue)
        {
            LearningSfxPlayer.PlayScoreCount();
            yield return CountScore(damageDisplayValue, finalScore, "아이템 계산", Mathf.Max(1, usedLength));
            damageDisplayValue = finalScore;
            yield return new WaitForSeconds(0.12f);
        }

        float scoreMultiplier = baseScore > 0 ? Mathf.Max(1f, (float)finalScore / baseScore) : 1f;
        if (messageText != null) messageText.text = $"데미지 발사 {LearningNumberFormatter.Format(finalScore)}";
        yield return new WaitForSeconds(0.22f);
        yield return MergeAndFireDamage(finalScore, oldHp, newHp, willClear, scoreMultiplier);
        yield return PlayCardPileTransition("제출 카드 -> 버린덱", startIndex, usedLength);

        foreach (KeyValuePair<RectTransform, Vector2> entry in originalPositions)
        {
            if (entry.Key != null) entry.Key.anchoredPosition = entry.Value;
        }

        foreach (KeyValuePair<RectTransform, Vector3> entry in originalScales)
        {
            if (entry.Key != null) ApplySentenceCardLayoutScale(entry.Key, entry.Value.x);
        }

        foreach (KeyValuePair<RectTransform, Quaternion> entry in originalRotations)
        {
            if (entry.Key != null) entry.Key.localRotation = entry.Value;
        }

        submitAnimation = null;
    }

    private IEnumerator MergeAndFireDamage(int damage, int oldHp, int newHp, bool willClear, float scoreMultiplier)
    {
        if (messageText != null) messageText.text = $"최종 데미지 {LearningNumberFormatter.Format(damage)}";
        ApplyDamageText(damage);

        RectTransform projectile = CreateProjectile();
        if (projectile != null)
        {
            LearningSfxPlayer.PlayDamageFire();
            Vector2 start = new Vector2(0f, -360f);
            Vector2 end = new Vector2(0f, 190f);
            float elapsed = 0f;
            const float duration = 0.32f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = 1f - Mathf.Pow(1f - t, 3f);
                projectile.anchoredPosition = Vector2.Lerp(start, end, eased);
                projectile.localScale = Vector3.one * Mathf.Lerp(0.65f, 1.25f, eased);
                yield return null;
            }
            Destroy(projectile.gameObject);
        }

        yield return HitMonster(willClear, scoreMultiplier);
        yield return AnimateHp(oldHp, newHp);
        if (willClear)
        {
            yield return ClearMonster();
        }
    }

    private RectTransform CreateProjectile()
    {
        if (canvas == null) return null;
        GameObject go = damageProjectilePrefab != null ? Instantiate(damageProjectilePrefab) : new GameObject("DamageProjectile");
        go.name = "DamageProjectile";
        go.transform.SetParent(canvas.transform, false);
        RectTransform rect = go.GetComponent<RectTransform>();
        if (rect == null) rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        if (damageProjectilePrefab == null)
        {
            Image image = go.AddComponent<Image>();
            image.color = new Color(1f, 0.82f, 0.18f, 0.96f);
            rect.sizeDelta = new Vector2(84f, 84f);
        }
        rect.anchoredPosition = new Vector2(0f, -360f);
        return rect;
    }

    private IEnumerator HitMonster(bool willClear, float scoreMultiplier)
    {
        if (bossView != null)
        {
            LearningSfxPlayer.PlayMonsterHit();
            StartCoroutine(ShakeScreen(scoreMultiplier));
            yield return bossView.PlayHit(willClear);
            yield break;
        }

        if (monsterImage == null) yield break;
        LearningSfxPlayer.PlayMonsterHit();
        Sprite normalSprite = GetBossNormalSprite();
        Sprite hitSprite = GetBossHitSprite();
        Sprite deadSprite = GetBossDeadSprite();
        Color normalColor = normalSprite != null
            ? new Color(1f, 1f, 1f, 0.82f)
            : new Color(0.38f, 0.18f, 0.22f, 0.54f);
        Vector3 originalScale = monsterImage.transform.localScale;

        StartCoroutine(ShakeScreen(scoreMultiplier));
        monsterImage.color = Color.white;
        monsterImage.transform.localScale = originalScale * 1.045f;
        yield return null;
        yield return null;

        if (hitSprite != null) monsterImage.sprite = hitSprite;
        monsterImage.color = hitSprite != null ? new Color(1f, 1f, 1f, 0.92f) : new Color(1f, 0.32f, 0.26f, 0.86f);
        monsterImage.transform.localScale = originalScale * 1.035f;

        for (int i = 0; i < 5; i++)
        {
            monsterImage.color = new Color(monsterImage.color.r, monsterImage.color.g, monsterImage.color.b, 0.35f);
            yield return new WaitForSeconds(0.045f);
            monsterImage.color = hitSprite != null ? new Color(1f, 1f, 1f, 0.92f) : new Color(1f, 0.32f, 0.26f, 0.86f);
            yield return new WaitForSeconds(0.045f);
        }

        monsterImage.sprite = willClear && deadSprite != null ? deadSprite : normalSprite;
        monsterImage.color = willClear && deadSprite != null ? new Color(1f, 1f, 1f, 0.9f) : normalColor;
        monsterImage.transform.localScale = originalScale;
    }

    private IEnumerator ShakeScreen(float scoreMultiplier)
    {
        if (uiRootRect == null) yield break;

        float powerScale = scoreMultiplier >= 20f ? 6f : scoreMultiplier >= 10f ? 3f : 1f;
        Vector2 originalPosition = uiRootRect.anchoredPosition;
        const float baseAmplitude = 7f;
        const float duration = 0.34f;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            float damping = Mathf.Pow(1f - t, 1.8f);
            float wave = Mathf.Sin(t * Mathf.PI * 10f);
            float counterWave = Mathf.Sin(t * Mathf.PI * 5f + Mathf.PI * 0.5f);
            uiRootRect.anchoredPosition = originalPosition + new Vector2(
                wave * baseAmplitude * powerScale * damping,
                counterWave * baseAmplitude * 0.38f * powerScale * damping);
            yield return null;
        }

        const float aftershockDuration = 0.18f;
        elapsed = 0f;
        while (elapsed < aftershockDuration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / aftershockDuration);
            float damping = Mathf.Pow(1f - t, 2.2f);
            float wave = Mathf.Sin(t * Mathf.PI * 4f);
            uiRootRect.anchoredPosition = originalPosition + new Vector2(
                wave * baseAmplitude * 0.35f * powerScale * damping,
                0f);
            yield return null;
        }

        uiRootRect.anchoredPosition = originalPosition;
    }

    private IEnumerator AnimateHp(int oldHp, int newHp)
    {
        int maxHp = controller != null ? Mathf.Max(1, controller.MaxBlindHp) : Mathf.Max(1, oldHp);
        if (bossView != null)
        {
            Vector3 hudOriginalScale = hpText != null ? hpText.transform.localScale : Vector3.one;
            if (hpText != null) hpText.transform.localScale = hudOriginalScale * 1.18f;
            LearningSfxPlayer.PlayHpDrain();
            yield return bossView.AnimateHp(oldHp, newHp, maxHp);
            if (hpText != null)
            {
                hpText.transform.localScale = hudOriginalScale;
                hpText.text = $"HP {LearningNumberFormatter.Format(newHp)}/{LearningNumberFormatter.Format(maxHp)}";
            }
            yield break;
        }

        oldHp = Mathf.Clamp(oldHp, 0, maxHp);
        newHp = Mathf.Clamp(newHp, 0, maxHp);
        Vector3 originalScale = hpText != null ? hpText.transform.localScale : Vector3.one;
        if (hpText != null) hpText.transform.localScale = originalScale * 1.18f;
        LearningSfxPlayer.PlayHpDrain();

        SetMonsterHpText(oldHp, maxHp);
        SetHpFill(monsterHpFill, (float)oldHp / maxHp);
        SetHpFill(monsterHpDelayFill, (float)oldHp / maxHp);

        float elapsed = 0f;
        const float redDuration = 0.28f;
        while (elapsed < redDuration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / redDuration));
            int hp = Mathf.RoundToInt(Mathf.Lerp(oldHp, newHp, t));
            SetMonsterHpText(hp, maxHp);
            SetHpFill(monsterHpFill, (float)hp / maxHp);
            yield return null;
        }

        SetMonsterHpText(newHp, maxHp);
        SetHpFill(monsterHpFill, (float)newHp / maxHp);
        yield return new WaitForSeconds(0.12f);

        elapsed = 0f;
        const float delayDuration = 0.42f;
        while (elapsed < delayDuration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / delayDuration));
            float fill = Mathf.Lerp((float)oldHp / maxHp, (float)newHp / maxHp, t);
            SetHpFill(monsterHpDelayFill, fill);
            yield return null;
        }

        SetHpFill(monsterHpDelayFill, (float)newHp / maxHp);
        if (hpText != null) hpText.transform.localScale = originalScale;
    }

    private IEnumerator ClearMonster()
    {
        if (bossView != null)
        {
            LearningSfxPlayer.PlayClear();
            yield return bossView.PlayDeath();
            yield break;
        }

        LearningSfxPlayer.PlayClear();
        if (clearText != null)
        {
            clearText.gameObject.SetActive(true);
            clearText.text = "Clear!";
            clearText.transform.localScale = Vector3.one * 0.65f;
        }

        RectTransform rect = monsterImage != null ? monsterImage.GetComponent<RectTransform>() : null;
        Vector2 original = rect != null ? rect.anchoredPosition : Vector2.zero;
        if (monsterImage != null)
        {
            Sprite deadSprite = GetBossDeadSprite();
            if (deadSprite != null)
            {
                monsterImage.sprite = deadSprite;
                monsterImage.color = new Color(1f, 1f, 1f, 0.9f);
            }
            else
            {
                monsterImage.color = new Color(0.22f, 0.22f, 0.28f, 0.42f);
            }
        }

        if (rect != null)
        {
            yield return MoveMonster(rect, original, original + new Vector2(0f, 48f), 0.16f, EaseOutCubic);
            yield return MoveMonster(rect, rect.anchoredPosition, original + new Vector2(0f, -72f), 0.34f, EaseInCubic);
        }

        if (clearText != null) clearText.transform.localScale = Vector3.one * 1.15f;
        yield return new WaitForSeconds(0.38f);
        if (rect != null) rect.anchoredPosition = original;
    }

    private IEnumerator MoveMonster(RectTransform rect, Vector2 from, Vector2 to, float duration, System.Func<float, float> ease)
    {
        if (rect == null) yield break;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / Mathf.Max(0.001f, duration));
            rect.anchoredPosition = Vector2.Lerp(from, to, ease != null ? ease(t) : t);
            yield return null;
        }

        rect.anchoredPosition = to;
    }

    private void SetMonsterHpVisual(int hp, int maxHp)
    {
        if (bossView != null) bossView.SetHpInstant(hp, maxHp);

        maxHp = Mathf.Max(1, maxHp);
        hp = Mathf.Clamp(hp, 0, maxHp);
        SetMonsterHpText(hp, maxHp);
        float fill = Mathf.Clamp01((float)hp / maxHp);
        SetHpFill(monsterHpFill, fill);
        SetHpFill(monsterHpDelayFill, fill);
    }

    private void SetMonsterHpText(int hp, int maxHp)
    {
        if (hpText != null) hpText.text = $"HP {LearningNumberFormatter.Format(hp)}/{LearningNumberFormatter.Format(maxHp)}";
        if (monsterHpText != null) monsterHpText.text = $"{LearningNumberFormatter.Format(hp)} / {LearningNumberFormatter.Format(maxHp)}";
    }

    private static void SetHpFill(Image image, float fill)
    {
        if (image != null) image.fillAmount = Mathf.Clamp01(fill);
    }

    private static float EaseOutCubic(float t)
    {
        return 1f - Mathf.Pow(1f - t, 3f);
    }

    private static float EaseInCubic(float t)
    {
        return t * t * t;
    }

    private IEnumerator PlayCardPileTransition(string label, int startIndex, int usedLength)
    {
        if (messageText != null) messageText.text = label;
        int shown = sentenceCardRects.Count;
        Vector2 discardPosition = GetCanvasPosition(discardPileButtonRoot, new Vector2(360f, 330f));
        for (int i = 0; i < shown; i++)
        {
            RectTransform source = sentenceCardRects[i];
            Vector2 sourcePosition = GetCanvasPosition(source, new Vector2(-260f + i * 24f, -90f));
            RectTransform ghost = CreateUsedCardGhost(source, sourcePosition);
            Coroutine shrinkSource = StartCoroutine(ShrinkSourceCardForPileMove(source, 0.13f));
            if (ghost != null) yield return FlyUsedCardGhost(ghost, discardPosition, 0.13f);
            if (shrinkSource != null) yield return shrinkSource;
            yield return new WaitForSeconds(0.025f);
        }
        yield return new WaitForSeconds(0.08f);
    }

    private IEnumerator PlayNewBlindTransition(List<RectTransform> oldHandClearGhosts, int handCount, int revealStartIndex)
    {
        yield return PlayOldHandToDiscardGhosts(oldHandClearGhosts);

        if (messageText != null) messageText.text = "임시 카드 정리 / 덱 셔플";
        for (int i = 0; i < 3; i++)
        {
            Vector2 start = GetCanvasPosition(discardPileButtonRoot, new Vector2(-160f + i * 36f, 20f));
            Vector2 end = GetCanvasPosition(drawPileButtonRoot, new Vector2(340f, 330f));
            RectTransform ghost = CreateGhostCard(start, end);
            if (ghost != null) StartCoroutine(FlyGhostCard(ghost, end, 0.16f + i * 0.04f));
            yield return new WaitForSeconds(0.04f);
        }

        yield return new WaitForSeconds(0.18f);
        yield return PlayDrawGhosts(handCount, revealStartIndex);
    }

    private List<RectTransform> CaptureHandClearGhosts()
    {
        var ghosts = new List<RectTransform>();
        for (int i = 0; i < handCardRects.Count; i++)
        {
            RectTransform source = handCardRects[i];
            if (source == null) continue;
            Vector2 sourcePosition = GetCanvasPosition(source, new Vector2(-260f + i * 24f, -320f));
            RectTransform ghost = CreateUsedCardGhost(source, sourcePosition);
            if (ghost != null) ghosts.Add(ghost);
        }
        return ghosts;
    }

    private IEnumerator PlayOldHandToDiscardGhosts(List<RectTransform> ghosts)
    {
        if (ghosts == null || ghosts.Count == 0) yield break;

        if (messageText != null) messageText.text = "손패 정리";
        Vector2 discardPosition = GetCanvasPosition(discardPileButtonRoot, new Vector2(360f, 330f));
        for (int i = 0; i < ghosts.Count; i++)
        {
            RectTransform ghost = ghosts[i];
            if (ghost != null)
            {
                yield return FlyUsedCardGhost(ghost, discardPosition, 0.14f);
                LearningSfxPlayer.PlayCardTick();
            }
            yield return new WaitForSeconds(0.035f);
        }

        yield return new WaitForSeconds(0.12f);
    }

    private IEnumerator PlayDrawGhosts(int count, int revealStartIndex)
    {
        if (count <= 0) yield break;
        if (messageText != null) messageText.text = $"카드 {count}장 드로우";
        int shown = Mathf.Max(0, count);
        Vector2 start = GetCanvasPosition(drawPileButtonRoot, new Vector2(360f, 330f));
        for (int i = 0; i < shown; i++)
        {
            int handIndex = revealStartIndex + i;
            LearningDeckCard card = GetHandCard(handIndex);
            Vector2 end = GetHandGhostTarget(i, shown, handIndex);
            if (card != null && card.temporary)
            {
                yield return SpawnTemporaryHandCard(handIndex);
            }
            else
            {
                RectTransform ghost = CreateDrawCardGhost(start, card);
                if (ghost != null) yield return FlyDrawCardGhost(ghost, end, 0.18f);
                RevealHandCard(handIndex);
            }
            LearningSfxPlayer.PlayCardTick();
            yield return new WaitForSeconds(0.06f);
        }
    }

    private IEnumerator PlaySentenceReturnToHandGhost(int handIndex, Vector2 start)
    {
        if (messageText != null) messageText.text = "카드 회수";
        LearningDeckCard card = GetHandCard(handIndex);
        Vector2 end = GetHandGhostTarget(0, 1, handIndex);
        RectTransform ghost = CreateDrawCardGhost(start, card);
        if (ghost != null) yield return FlyDrawCardGhost(ghost, end, 0.16f);
        RevealHandCard(handIndex);
        LearningSfxPlayer.PlayCardTick();
    }

    private IEnumerator PlayHandToSentenceGhost(int sentenceIndex, Vector2 start)
    {
        if (messageText != null) messageText.text = "카드 배치";
        LearningDeckCard card = GetSentenceCard(sentenceIndex);
        Vector2 end = GetSentenceGhostTarget(sentenceIndex);
        RectTransform ghost = CreateDrawCardGhost(start, card);
        if (ghost != null) yield return FlyDrawCardGhost(ghost, end, 0.11f);
        RevealSentenceCard(sentenceIndex);
        LearningSfxPlayer.PlayCardTick();
    }

    private IEnumerator PlayTemporaryGeneratedCards(int count, int startIndex)
    {
        if (count <= 0) yield break;
        if (messageText != null) messageText.text = $"임시 카드 {count}장 생성";

        for (int i = 0; i < count; i++)
        {
            int handIndex = startIndex + i;
            yield return SpawnTemporaryHandCard(handIndex);
            LearningSfxPlayer.PlayCardTick();
            yield return new WaitForSeconds(0.08f);
        }
    }

    private IEnumerator PlayRecycleThenDrawGhosts(int recycleCount, int drawCount, int revealStartIndex)
    {
        yield return PlayDiscardRecycleGhosts(recycleCount);
        if (drawCount > 0) yield return PlayDrawGhosts(drawCount, revealStartIndex);
    }

    private IEnumerator PlaySupplyUseSequence(int recycleCount, int drawCount, int revealStartIndex)
    {
        yield return PlaySupplyMultiplierUseStart();
        if (recycleCount > 0) yield return PlayDiscardRecycleGhosts(recycleCount);
        if (drawCount > 0) yield return PlayDrawGhosts(drawCount, revealStartIndex);
        yield return PlaySupplyMultiplierUseEnd();
    }

    private IEnumerator PlayDiscardRecycleGhosts(int count)
    {
        if (count <= 0) yield break;
        if (messageText != null) messageText.text = $"버린 카드 {count}장 재셔플";

        int shown = Mathf.Min(count, 12);
        Vector2 start = GetCanvasPosition(discardPileButtonRoot, new Vector2(360f, 330f));
        Vector2 end = GetCanvasPosition(drawPileButtonRoot, new Vector2(260f, 330f));
        float interval = shown <= 1 ? 0f : Mathf.Min(0.07f, 0.9f / shown);
        for (int i = 0; i < shown; i++)
        {
            RectTransform ghost = CreateGhostCard(start + new Vector2((i % 3 - 1) * 8f, 0f), end);
            if (ghost != null) StartCoroutine(FlyGhostCard(ghost, end, 0.22f));
            LearningSfxPlayer.PlayCardTick();
            yield return new WaitForSeconds(interval);
        }

        yield return new WaitForSeconds(0.14f);
    }

    private void RevealHandCard(int index)
    {
        if (index < 0 || index >= handCardCanvasGroups.Count) return;
        CanvasGroup group = handCardCanvasGroups[index];
        if (group == null) return;
        group.alpha = 1f;
        group.blocksRaycasts = true;
        group.interactable = true;
        if (index >= 0 && index < handCardRects.Count && handCardRects[index] != null)
        {
            handCardRects[index].localScale = Vector3.one;
        }
    }

    private void RevealSentenceCard(int index)
    {
        if (index < 0 || index >= sentenceCardCanvasGroups.Count) return;
        CanvasGroup group = sentenceCardCanvasGroups[index];
        if (group == null) return;
        group.alpha = 1f;
        group.blocksRaycasts = true;
        group.interactable = true;
        if (index >= 0 && index < sentenceCardRects.Count && sentenceCardRects[index] != null)
        {
            ApplySentenceCardLayoutScale(sentenceCardRects[index], 1f);
        }
    }

    private IEnumerator SpawnTemporaryHandCard(int index)
    {
        if (index < 0 || index >= handCardRects.Count)
        {
            RevealHandCard(index);
            yield break;
        }

        RectTransform rect = handCardRects[index];
        CanvasGroup group = index < handCardCanvasGroups.Count ? handCardCanvasGroups[index] : null;
        if (rect == null || group == null)
        {
            RevealHandCard(index);
            yield break;
        }

        group.alpha = MovingCardMinAlpha;
        group.blocksRaycasts = false;
        group.interactable = false;
        rect.localScale = Vector3.one * 0.1f;

        const float duration = 0.1f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            float eased = t * t * t;
            float overshoot = Mathf.Sin(t * Mathf.PI) * 0.16f;
            rect.localScale = Vector3.one * Mathf.Lerp(0.1f, 1f, eased + overshoot);
            group.alpha = Mathf.Lerp(MovingCardMinAlpha, 1f, eased);
            yield return null;
        }

        rect.localScale = Vector3.one;
        RevealHandCard(index);
    }

    private LearningDeckCard GetHandCard(int index)
    {
        if (controller == null || controller.Deck == null || controller.Deck.hand == null) return null;
        if (index < 0 || index >= controller.Deck.hand.Count) return null;
        return controller.Deck.hand[index];
    }

    private LearningDeckCard GetSentenceCard(int index)
    {
        if (controller == null || controller.SentenceCards == null) return null;
        if (index < 0 || index >= controller.SentenceCards.Count) return null;
        return controller.SentenceCards[index];
    }

    private IEnumerator ShrinkSourceCardForPileMove(RectTransform source, float duration)
    {
        if (source == null) yield break;
        CanvasGroup group = source.GetComponent<CanvasGroup>();
        if (group == null) group = source.gameObject.AddComponent<CanvasGroup>();
        group.blocksRaycasts = false;
        group.interactable = false;

        Vector3 startScale = source.localScale;
        float startAlpha = group.alpha;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / Mathf.Max(0.001f, duration)));
            source.localScale = Vector3.Lerp(startScale, Vector3.one * 0.1f, t);
            group.alpha = Mathf.Lerp(startAlpha, MovingCardMinAlpha, t);
            yield return null;
        }

        source.localScale = Vector3.one * 0.1f;
        group.alpha = 0f;
    }

    private IEnumerator PlaySupplyMultiplierUseStart()
    {
        Transform target = multiplyCountRoot != null ? multiplyCountRoot : multiplyText != null ? multiplyText.transform : null;
        if (multiplyMinusRoot == null && target != null) multiplyMinusRoot = FindChildRecursive(target, "Minus");
        if (multiplyMinusRoot != null) multiplyMinusRoot.gameObject.SetActive(true);
        if (target == null) yield break;

        Vector3 startScale = target.localScale;
        Vector3 peakScale = Vector3.one * Mathf.Max(startScale.x, 1.35f);
        const float duration = 0.12f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / duration));
            target.localScale = Vector3.Lerp(startScale, peakScale, t);
            yield return null;
        }

        target.localScale = peakScale;
    }

    private IEnumerator PlaySupplyMultiplierUseEnd()
    {
        Transform target = multiplyCountRoot != null ? multiplyCountRoot : multiplyText != null ? multiplyText.transform : null;
        if (target == null)
        {
            if (multiplyMinusRoot != null) multiplyMinusRoot.gameObject.SetActive(false);
            yield break;
        }

        Vector3 startScale = target.localScale;
        Vector3 endScale = GetMultiplierCountScale(GetCurrentCountsBaseMultiplier());
        const float duration = 0.18f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / duration));
            target.localScale = Vector3.Lerp(startScale, endScale, t);
            yield return null;
        }

        target.localScale = endScale;
        if (multiplyMinusRoot != null) multiplyMinusRoot.gameObject.SetActive(false);
    }

    private RectTransform CreateGhostCard(Vector2 start, Vector2 end)
    {
        if (canvas == null) return null;
        GameObject go = drawGhostCardPrefab != null ? Instantiate(drawGhostCardPrefab) : new GameObject("GhostCard");
        go.name = "GhostCard";
        go.transform.SetParent(canvas.transform, false);
        RectTransform rect = go.GetComponent<RectTransform>();
        if (rect == null) rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        if (drawGhostCardPrefab == null)
        {
            Image image = go.AddComponent<Image>();
            image.color = new Color(0.9f, 0.95f, 1f, MovingCardMinAlpha);
            rect.sizeDelta = new Vector2(88f, 52f);
        }
        EnsureMovingGhostVisible(go);
        rect.anchoredPosition = start;
        return rect;
    }

    private RectTransform CreateDrawCardGhost(Vector2 start, LearningDeckCard card)
    {
        if (canvas == null || cardPrefab == null) return CreateGhostCard(start, start);

        GameObject go = Instantiate(cardPrefab);
        go.name = "DrawCardGhost";
        go.transform.SetParent(canvas.transform, false);

        LearningWordCardButton wordCardButton = go.GetComponent<LearningWordCardButton>();
        if (wordCardButton != null) wordCardButton.enabled = false;

        LearningExplorationSentenceCardView sentenceView = go.GetComponent<LearningExplorationSentenceCardView>();
        if (sentenceView != null) sentenceView.enabled = false;

        Button[] buttons = go.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            buttons[i].onClick.RemoveAllListeners();
            buttons[i].interactable = false;
        }

        LearningDeckCardView cardView = go.GetComponent<LearningDeckCardView>();
        if (cardView != null) cardView.Bind(card, false, false, false);

        CanvasGroup group = go.GetComponent<CanvasGroup>();
        if (group == null) group = go.AddComponent<CanvasGroup>();
        group.alpha = MovingCardMinAlpha;
        group.blocksRaycasts = false;
        group.interactable = false;

        RectTransform rect = go.GetComponent<RectTransform>();
        if (rect == null) rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = start;
        rect.localScale = Vector3.one * 0.1f;
        EnsureMovingGhostVisible(go);
        return rect;
    }

    private RectTransform CreateUsedCardGhost(RectTransform source, Vector2 start)
    {
        if (canvas == null || source == null) return null;

        GameObject go = Instantiate(source.gameObject);
        go.name = "UsedCardGhost";
        go.transform.SetParent(canvas.transform, false);

        LearningExplorationSentenceCardView sentenceView = go.GetComponent<LearningExplorationSentenceCardView>();
        if (sentenceView != null) sentenceView.enabled = false;

        Button[] buttons = go.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            buttons[i].onClick.RemoveAllListeners();
            buttons[i].interactable = false;
        }

        CanvasGroup group = go.GetComponent<CanvasGroup>();
        if (group == null) group = go.AddComponent<CanvasGroup>();
        group.alpha = 1f;
        group.blocksRaycasts = false;
        group.interactable = false;

        RectTransform rect = go.GetComponent<RectTransform>();
        if (rect == null) rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = start;
        rect.localScale = Vector3.one;
        EnsureMovingGhostVisible(go);
        return rect;
    }

    private static void EnsureMovingGhostVisible(GameObject root)
    {
        if (root == null) return;

        CanvasGroup group = root.GetComponent<CanvasGroup>();
        if (group != null) group.alpha = Mathf.Max(group.alpha, MovingCardMinAlpha);

        Image[] images = root.GetComponentsInChildren<Image>(true);
        for (int i = 0; i < images.Length; i++)
        {
            if (images[i] == null) continue;
            Color color = images[i].color;
            if (color.a < MovingCardMinAlpha)
            {
                images[i].color = new Color(color.r, color.g, color.b, MovingCardMinAlpha);
            }
        }
    }

    private IEnumerator FlyGhostCard(RectTransform rect, Vector2 end, float duration)
    {
        Vector2 start = rect.anchoredPosition;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            rect.anchoredPosition = Vector2.Lerp(start, end, 1f - Mathf.Pow(1f - t, 2f));
            rect.localScale = Vector3.one * Mathf.Lerp(1f, 0.35f, t);
            yield return null;
        }
        Destroy(rect.gameObject);
    }

    private IEnumerator FlyDrawCardGhost(RectTransform rect, Vector2 end, float duration)
    {
        if (rect == null) yield break;
        CanvasGroup group = rect.GetComponent<CanvasGroup>();
        Vector2 start = rect.anchoredPosition;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / Mathf.Max(0.001f, duration));
            float eased = EaseOutCubic(t);
            rect.anchoredPosition = Vector2.Lerp(start, end, eased);
            rect.localScale = Vector3.one * Mathf.Lerp(0.1f, 1f, eased);
            if (group != null) group.alpha = Mathf.Lerp(MovingCardMinAlpha, 1f, eased);
            yield return null;
        }

        if (group != null) group.alpha = 1f;
        rect.localScale = Vector3.one;
        rect.anchoredPosition = end;
        Destroy(rect.gameObject);
    }

    private IEnumerator FlyUsedCardGhost(RectTransform rect, Vector2 end, float duration)
    {
        if (rect == null) yield break;
        CanvasGroup group = rect.GetComponent<CanvasGroup>();
        Vector2 start = rect.anchoredPosition;
        Vector3 startScale = rect.localScale;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / Mathf.Max(0.001f, duration));
            float eased = EaseOutCubic(t);
            rect.anchoredPosition = Vector2.Lerp(start, end, eased);
            rect.localScale = Vector3.Lerp(startScale, Vector3.one * 0.1f, eased);
            if (group != null) group.alpha = Mathf.Lerp(1f, MovingCardMinAlpha, eased);
            yield return null;
        }

        Destroy(rect.gameObject);
    }

    private Vector2 GetHandGhostTarget(int index, int count, int handIndex)
    {
        if (handIndex >= 0 && handIndex < handCardRects.Count && handCardRects[handIndex] != null)
        {
            return GetCanvasPosition(handCardRects[handIndex], new Vector2(-320f + index * 110f, -360f));
        }

        if (handRoot != null)
        {
            RectTransform handRect = handRoot as RectTransform;
            if (handRect != null)
            {
                Vector2 center = GetCanvasPosition(handRect, new Vector2(0f, -360f));
                float spacing = count <= 1 ? 0f : 92f;
                float offset = (index - (count - 1) * 0.5f) * spacing;
                return center + new Vector2(offset, 0f);
            }
        }

        return new Vector2(-320f + index * 110f, -360f);
    }

    private Vector2 GetSentenceGhostTarget(int sentenceIndex)
    {
        if (sentenceIndex >= 0 && sentenceIndex < sentenceCardRects.Count && sentenceCardRects[sentenceIndex] != null)
        {
            return GetCanvasPosition(sentenceCardRects[sentenceIndex], new Vector2(-260f + sentenceIndex * 110f, -90f));
        }

        if (sentenceRoot != null)
        {
            RectTransform sentenceRect = sentenceRoot as RectTransform;
            if (sentenceRect != null)
            {
                Vector2 center = GetCanvasPosition(sentenceRect, new Vector2(0f, -90f));
                int count = controller != null ? Mathf.Max(1, controller.SentenceCards.Count) : 1;
                float spacing = count <= 1 ? 0f : 92f;
                float offset = (sentenceIndex - (count - 1) * 0.5f) * spacing;
                return center + new Vector2(offset, 0f);
            }
        }

        return new Vector2(-260f + Mathf.Max(0, sentenceIndex) * 110f, -90f);
    }

    private void ApplySentenceCardLayoutScale(RectTransform rect, float scale)
    {
        if (rect == null) return;
        scale = Mathf.Max(0.01f, scale);
        rect.localScale = Vector3.one * scale;

        LayoutElement layout = rect.GetComponent<LayoutElement>();
        if (layout == null) layout = rect.gameObject.AddComponent<LayoutElement>();
        Vector2 baseSize = GetRectBaseSize(rect);
        layout.preferredWidth = baseSize.x * scale;
        layout.preferredHeight = baseSize.y * scale;
        ForceLayoutRebuild(rect.parent);
    }

    private static Vector2 GetRectBaseSize(RectTransform rect)
    {
        if (rect == null) return new Vector2(100f, 140f);
        LayoutElement layout = rect.GetComponent<LayoutElement>();
        if (layout != null && layout.minWidth > 0f && layout.minHeight > 0f)
        {
            return new Vector2(layout.minWidth, layout.minHeight);
        }

        Vector2 size = rect.rect.size;
        if (size.x <= 0f || size.y <= 0f) size = rect.sizeDelta;
        if (size.x <= 0f) size.x = 100f;
        if (size.y <= 0f) size.y = 140f;
        if (layout != null)
        {
            layout.minWidth = size.x;
            layout.minHeight = size.y;
        }
        return size;
    }

    private Vector2 GetCanvasPosition(RectTransform target, Vector2 fallback)
    {
        if (target == null || canvas == null) return fallback;
        RectTransform canvasRect = canvas.transform as RectTransform;
        if (canvasRect == null) return fallback;

        Vector2 screenPoint = RectTransformUtility.WorldToScreenPoint(GetCanvasCamera(), target.TransformPoint(target.rect.center));
        if (RectTransformUtility.ScreenPointToLocalPointInRectangle(canvasRect, screenPoint, GetCanvasCamera(), out Vector2 localPoint))
        {
            return localPoint;
        }

        return fallback;
    }

    private IEnumerator WiggleCard(RectTransform rect, Quaternion originalRotation)
    {
        const float duration = 0.46f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            float easeOut = 1f - Mathf.Pow(1f - t, 3f);
            float ring = Mathf.Sin(easeOut * Mathf.PI * 4.5f);
            float damping = Mathf.Pow(1f - t, 1.35f);
            float angle = ring * 9f * damping;
            if (rect != null) rect.localRotation = originalRotation * Quaternion.Euler(0f, 0f, angle);
            yield return null;
        }

        if (rect != null) rect.localRotation = originalRotation;
    }

    private IEnumerator AnimateCardStatFillToCounts(LearningDeckCardView cardView, int cardIndex, int startIndex, int usedLength)
    {
        if (cardView == null) yield break;

        float baseMultiplier = GetCurrentCountsBaseMultiplier();
        bool multiplierEnabled = baseMultiplier > 0f;
        int totalPlus = 0;
        float totalMultiplierBonus = 0f;
        for (int i = startIndex; i < Mathf.Min(startIndex + usedLength, sentenceCardViews.Count); i++)
        {
            LearningDeckCardView view = sentenceCardViews[i];
            if (view == null) continue;
            totalPlus += Mathf.Max(0, view.BonusScore);
            if (multiplierEnabled) totalMultiplierBonus += GetCardViewMultiplierBonus(view);
        }

        int completedPlus = 0;
        float completedMultiplierBonus = 0f;
        float completedMultiplier = baseMultiplier;
        int previousPlus = 0;
        float previousMultiplier = baseMultiplier;
        for (int i = startIndex; i <= cardIndex && i < sentenceCardViews.Count; i++)
        {
            LearningDeckCardView view = sentenceCardViews[i];
            if (view == null) continue;
            if (i < cardIndex)
            {
                previousPlus += Mathf.Max(0, view.BonusScore);
                if (multiplierEnabled) previousMultiplier += GetCardViewMultiplierBonus(view);
            }
            completedPlus += Mathf.Max(0, view.BonusScore);
            if (multiplierEnabled)
            {
                float multiplierBonus = GetCardViewMultiplierBonus(view);
                completedMultiplierBonus += multiplierBonus;
                completedMultiplier += multiplierBonus;
            }
        }

        float plusTarget = totalPlus > 0 ? Mathf.Clamp01((float)completedPlus / totalPlus) : 0f;
        float multiplyTarget = totalMultiplierBonus > 0f ? Mathf.Clamp01(completedMultiplierBonus / totalMultiplierBonus) : 0f;
        float plusStart = plusCountFill != null ? plusCountFill.fillAmount : 0f;
        float multiplyStart = multiplyCountFill != null ? multiplyCountFill.fillAmount : 0f;

        const float duration = 0.12f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = EaseOutCubic(Mathf.Clamp01(elapsed / duration));
            if (cardView.BonusScore > 0) cardView.SetPlusFill(1f - t);
            if (multiplierEnabled && cardView.Multiplier > 1f) cardView.SetMultiplyFill(1f - t);
            SetStatFill(plusCountFill, Mathf.Lerp(plusStart, plusTarget, t));
            SetStatFill(multiplyCountFill, Mathf.Lerp(multiplyStart, multiplyTarget, t));
            ApplyCountsTextAndScale(
                Mathf.RoundToInt(Mathf.Lerp(previousPlus, completedPlus, t)),
                Mathf.Lerp(previousMultiplier, completedMultiplier, t));
            yield return null;
        }

        if (cardView.BonusScore > 0) cardView.SetPlusFill(0f);
        if (multiplierEnabled && cardView.Multiplier > 1f) cardView.SetMultiplyFill(0f);
        SetStatFill(plusCountFill, plusTarget);
        SetStatFill(multiplyCountFill, multiplyTarget);
        ApplyCountsTextAndScale(completedPlus, completedMultiplier);
    }

    private IEnumerator PulseItemSlots(HashSet<string> targetItemIds)
    {
        var originalColors = new Dictionary<Image, Color>();
        var originalScales = new Dictionary<Transform, Vector3>();
        var originalPositions = new Dictionary<RectTransform, Vector2>();
        for (int i = 0; i < itemSlotObjects.Count; i++)
        {
            GameObject slot = itemSlotObjects[i];
            if (slot == null) continue;
            if (targetItemIds == null || i >= itemSlotIds.Count || !targetItemIds.Contains(itemSlotIds[i])) continue;
            Image image = slot.GetComponent<Image>();
            if (image != null)
            {
                originalColors[image] = image.color;
                image.color = new Color(1f, 0.78f, 0.16f, 1f);
            }
            originalScales[slot.transform] = slot.transform.localScale;
            slot.transform.localScale = Vector3.one * 1.16f;
            RectTransform rect = slot.transform as RectTransform;
            if (rect != null)
            {
                originalPositions[rect] = rect.anchoredPosition;
                rect.anchoredPosition += new Vector2(i % 2 == 0 ? 6f : -6f, 0f);
            }
        }

        yield return new WaitForSeconds(0.08f);

        for (int i = 0; i < itemSlotObjects.Count; i++)
        {
            GameObject slot = itemSlotObjects[i];
            if (slot == null) continue;
            if (targetItemIds == null || i >= itemSlotIds.Count || !targetItemIds.Contains(itemSlotIds[i])) continue;
            RectTransform rect = slot.transform as RectTransform;
            if (rect != null) rect.anchoredPosition += new Vector2(i % 2 == 0 ? -12f : 12f, 0f);
        }

        yield return new WaitForSeconds(0.08f);

        foreach (KeyValuePair<Image, Color> entry in originalColors)
        {
            if (entry.Key != null) entry.Key.color = entry.Value;
        }

        foreach (KeyValuePair<Transform, Vector3> entry in originalScales)
        {
            if (entry.Key != null) entry.Key.localScale = entry.Value;
        }

        foreach (KeyValuePair<RectTransform, Vector2> entry in originalPositions)
        {
            if (entry.Key != null) entry.Key.anchoredPosition = entry.Value;
        }
    }

    private IEnumerator CountScore(int baseScore, int finalScore, string label, int stepSize)
    {
        stepSize = GetScoreCountStep(baseScore, finalScore, stepSize);
        int direction = finalScore >= baseScore ? 1 : -1;
        int value = baseScore;
        if (damageText != null && damageText.gameObject.activeSelf) ApplyDamageText(value);
        if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(value)}";

        int maxSteps = Mathf.CeilToInt(Mathf.Abs(finalScore - baseScore) / (float)stepSize) + 4;
        int guard = 0;
        while (value != finalScore && guard++ < maxSteps)
        {
            int next = value + stepSize * direction;
            value = direction > 0 ? Mathf.Min(next, finalScore) : Mathf.Max(next, finalScore);
            if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(value)}";
            yield return PopDamageText(value);
        }

        if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(finalScore)}";
        ApplyDamageText(finalScore);
    }

    private IEnumerator CountScoreWithFillDrain(int baseScore, int finalScore, string label, int stepSize, Image drainFill)
    {
        stepSize = GetScoreCountStep(baseScore, finalScore, stepSize);
        int direction = finalScore >= baseScore ? 1 : -1;
        int value = baseScore;
        int totalDelta = Mathf.Abs(finalScore - baseScore);
        float startFill = drainFill != null ? drainFill.fillAmount : 0f;

        if (damageText != null && damageText.gameObject.activeSelf) ApplyDamageText(value);
        if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(value)}";

        int maxSteps = Mathf.CeilToInt(Mathf.Abs(finalScore - baseScore) / (float)stepSize) + 4;
        int guard = 0;
        while (value != finalScore && guard++ < maxSteps)
        {
            int next = value + stepSize * direction;
            value = direction > 0 ? Mathf.Min(next, finalScore) : Mathf.Max(next, finalScore);
            float progress = totalDelta > 0 ? Mathf.Clamp01(Mathf.Abs(value - baseScore) / (float)totalDelta) : 1f;
            SetStatFill(drainFill, Mathf.Lerp(startFill, 0f, progress));
            if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(value)}";
            yield return PopDamageText(value);
        }

        SetStatFill(drainFill, 0f);
        if (messageText != null) messageText.text = $"{label} {LearningNumberFormatter.Format(finalScore)}";
        ApplyDamageText(finalScore);
    }

    private static int GetScoreCountStep(int baseScore, int finalScore, int requestedStep)
    {
        int delta = Mathf.Abs(finalScore - baseScore);
        int cappedStep = Mathf.CeilToInt(delta / 42f);
        return Mathf.Max(1, requestedStep, cappedStep);
    }

    private IEnumerator PopDamageText(int value)
    {
        ApplyDamageText(value);
        if (damageText == null)
        {
            yield return new WaitForSeconds(0.015f);
            yield break;
        }

        float baseSize = GetDamageFontSize(value);
        const float duration = 0.035f;
        float elapsed = 0f;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            float pop = Mathf.Sin(t * Mathf.PI) * 0.28f;
            damageText.fontSize = Mathf.Clamp(baseSize * (1f + pop), 100f, 300f);
            yield return null;
        }

        damageText.fontSize = baseSize;
    }

    private void ApplyDamageText(int value)
    {
        if (damageText == null) return;
        SetDamageTextVisible(true);
        damageText.text = LearningNumberFormatter.Format(value);
        damageText.fontSize = GetDamageFontSize(value);
    }

    private static float GetDamageFontSize(int value)
    {
        return Mathf.Lerp(100f, 300f, Mathf.Clamp01(Mathf.Abs(value) / 300f));
    }

    private void SetDamageTextVisible(bool visible)
    {
        if (damageText == null) return;
        damageText.gameObject.SetActive(visible);
        if (!visible)
        {
            damageText.text = string.Empty;
            damageText.fontSize = 100f;
        }
    }

    private int GetSubmittedCardBonusScore(int startIndex, int usedLength)
    {
        int bonus = 0;
        int end = Mathf.Min(sentenceCardViews.Count, startIndex + usedLength);
        for (int i = Mathf.Max(0, startIndex); i < end; i++)
        {
            LearningDeckCardView view = sentenceCardViews[i];
            if (view == null) continue;
            bonus += view.BonusScore;
        }
        return bonus;
    }

    private void BuildIfNeeded()
    {
        if (uiBuilt) return;
        if (UseSceneBindingsIfReady())
        {
            uiBuilt = true;
            return;
        }

        if (canvas == null)
        {
            GameObject canvasGo = new GameObject("LearningExplorationCanvas");
            canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            canvasGo.AddComponent<GraphicRaycaster>();
        }

        GameObject root = new GameObject("ExplorationSentenceUI");
        root.transform.SetParent(canvas.transform, false);
        uiRootRect = root.AddComponent<RectTransform>();
        uiRootRect.anchorMin = Vector2.zero;
        uiRootRect.anchorMax = Vector2.one;
        uiRootRect.offsetMin = Vector2.zero;
        uiRootRect.offsetMax = Vector2.zero;

        BuildMonsterLayer(root.transform);

        titleText = CreateText(root.transform, "Title", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -120f), new Vector2(920f, 70f), 42);
        hpText = CreateText(root.transform, "Hp", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -190f), new Vector2(920f, 58f), 34);
        countText = CreateText(root.transform, "Counts", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -250f), new Vector2(920f, 52f), 28);
        messageText = CreateText(root.transform, "Message", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -315f), new Vector2(920f, 70f), 28);

        itemRoot = CreateHorizontalRoot(root.transform, "ItemRoot", new Vector2(0.05f, 0.49f), new Vector2(0.95f, 0.54f), 10f);
        sentenceRoot = CreateGridRoot(root.transform, "SentenceRoot", new Vector2(0.05f, 0.57f), new Vector2(0.95f, 0.73f));
        handRoot = CreateGridRoot(root.transform, "HandRoot", new Vector2(0.05f, 0.12f), new Vector2(0.95f, 0.45f));
        CreateButton(root.transform, "로비", new Vector2(0.05f, 0.92f), new Vector2(0.2f, 0.97f), LearningSceneLoader.LoadLobby);
        CreateButton(root.transform, "덱보기", new Vector2(0.78f, 0.92f), new Vector2(0.93f, 0.97f), ToggleDeckPanel);
        submitButton = CreateButton(root.transform, "제출", new Vector2(0.32f, 0.04f), new Vector2(0.48f, 0.09f), () => controller?.SubmitSentence());
        dropButton = CreateButton(root.transform, "드로우", new Vector2(0.52f, 0.04f), new Vector2(0.68f, 0.09f), () => controller?.SupplyCards());
        uiBuilt = true;
    }

    private bool UseSceneBindingsIfReady()
    {
        ApplyScreenViewBindings();
        if (sentenceRoot == null || handRoot == null) return false;

        if (uiRootRect == null) uiRootRect = transform as RectTransform;
        if (canvas == null) canvas = GetComponentInParent<Canvas>();
        if (itemRoot == null)
        {
            Transform item = transform.Find("ItemRoot");
            if (item != null) itemRoot = item;
        }

        ApplyCurrentBossNormalSprite();
        if (clearText != null) clearText.gameObject.SetActive(false);
        WireSceneButtons();
        return true;
    }

    private void WireSceneButtons()
    {
        if (submitButton != null)
        {
            submitButton.onClick.RemoveListener(SubmitSentenceFromButton);
            submitButton.onClick.AddListener(SubmitSentenceFromButton);
        }

        if (dropButton != null)
        {
            dropButton.onClick.RemoveListener(DropSentenceFromButton);
            dropButton.onClick.AddListener(DropSentenceFromButton);
            TMP_Text label = dropButton.GetComponentInChildren<TMP_Text>(true);
            if (label != null && (label.text == "드랍" || label.text == "Drop" || label.text == "수급")) label.text = "드로우";
        }

        if (lobbyButton != null)
        {
            lobbyButton.onClick.RemoveListener(LoadLobbyFromButton);
            lobbyButton.onClick.AddListener(LoadLobbyFromButton);
        }

        if (deckButton != null)
        {
            deckButton.onClick.RemoveListener(ToggleDeckPanel);
            deckButton.onClick.AddListener(ToggleDeckPanel);
        }

        WireRootButton(drawPileButtonRoot, ToggleDrawPilePanel);
        WireRootButton(discardPileButtonRoot, ToggleDiscardPilePanel);
    }

    private void SubmitSentenceFromButton() => controller?.SubmitSentence();
    private void DropSentenceFromButton() => controller?.SupplyCards();
    private void LoadLobbyFromButton() => LearningSceneLoader.LoadLobby();

    private void WireRootButton(RectTransform root, UnityEngine.Events.UnityAction action)
    {
        if (root == null || action == null) return;
        Button button = root.GetComponent<Button>();
        if (button == null) button = root.GetComponentInChildren<Button>(true);
        if (button == null) return;
        button.onClick.RemoveListener(action);
        button.onClick.AddListener(action);
    }

    private void BuildMonsterLayer(Transform parent)
    {
        GameObject monster = new GameObject("BackgroundMonster");
        monster.transform.SetParent(parent, false);
        monsterImage = monster.AddComponent<Image>();
        monsterImage.sprite = GetBossNormalSprite();
        monsterImage.preserveAspect = true;
        monsterImage.color = monsterImage.sprite != null
            ? new Color(1f, 1f, 1f, 0.82f)
            : new Color(0.38f, 0.18f, 0.22f, 0.54f);
        RectTransform rect = monster.GetComponent<RectTransform>();
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        GameObject hpBg = new GameObject("MonsterHpBg");
        hpBg.transform.SetParent(parent, false);
        Image bg = hpBg.AddComponent<Image>();
        bg.color = new Color(0.09f, 0.08f, 0.08f, 0.82f);
        RectTransform hpRect = hpBg.GetComponent<RectTransform>();
        hpRect.anchorMin = new Vector2(0.12f, 0.78f);
        hpRect.anchorMax = new Vector2(0.88f, 0.805f);
        hpRect.offsetMin = Vector2.zero;
        hpRect.offsetMax = Vector2.zero;

        GameObject hpFillGo = new GameObject("MonsterHpFill");
        GameObject hpDelayGo = new GameObject("MonsterHpDelayFill");
        hpDelayGo.transform.SetParent(hpBg.transform, false);
        monsterHpDelayFill = hpDelayGo.AddComponent<Image>();
        monsterHpDelayFill.color = new Color(1f, 0.82f, 0.12f, 0.95f);
        monsterHpDelayFill.type = Image.Type.Filled;
        monsterHpDelayFill.fillMethod = Image.FillMethod.Horizontal;
        monsterHpDelayFill.fillOrigin = (int)Image.OriginHorizontal.Left;
        RectTransform delayRect = hpDelayGo.GetComponent<RectTransform>();
        delayRect.anchorMin = Vector2.zero;
        delayRect.anchorMax = Vector2.one;
        delayRect.offsetMin = Vector2.zero;
        delayRect.offsetMax = Vector2.zero;

        hpFillGo.transform.SetParent(hpBg.transform, false);
        monsterHpFill = hpFillGo.AddComponent<Image>();
        monsterHpFill.color = new Color(0.9f, 0.16f, 0.16f, 0.95f);
        monsterHpFill.type = Image.Type.Filled;
        monsterHpFill.fillMethod = Image.FillMethod.Horizontal;
        monsterHpFill.fillOrigin = (int)Image.OriginHorizontal.Left;
        RectTransform fillRect = hpFillGo.GetComponent<RectTransform>();
        fillRect.anchorMin = Vector2.zero;
        fillRect.anchorMax = Vector2.one;
        fillRect.offsetMin = Vector2.zero;
        fillRect.offsetMax = Vector2.zero;

        monsterHpText = CreateText(parent, "MonsterHpText", new Vector2(0.5f, 0.81f), new Vector2(0.5f, 0.81f), Vector2.zero, new Vector2(720f, 52f), 28f);
        clearText = CreateText(parent, "ClearText", new Vector2(0.5f, 0.58f), new Vector2(0.5f, 0.58f), Vector2.zero, new Vector2(760f, 110f), 64f);
        clearText.color = new Color(1f, 0.82f, 0.12f, 1f);
        clearText.gameObject.SetActive(false);
    }

    private void BuildDeckPanelIfNeeded()
    {
        if (canvas == null) return;
        if (deckPanel != null && drawPilePanel != null && discardPilePanel != null) return;

        if (deckPanel == null)
        {
            deckPanel = new GameObject("DeckListPanelRoot");
            deckPanel.transform.SetParent(canvas.transform, false);
            RectTransform rect = deckPanel.AddComponent<RectTransform>();
            rect.anchorMin = new Vector2(0.06f, 0.14f);
            rect.anchorMax = new Vector2(0.94f, 0.88f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            Image surface = deckPanel.AddComponent<Image>();
            surface.sprite = LearningUiSkin.ResolveSurfaceSprite();
            surface.type = Image.Type.Sliced;
            surface.color = LearningUiSkin.PaperColor;
        }

        if (drawPilePanel == null)
        {
            drawPilePanel = CreateDeckPilePanel(deckPanel.transform, "DrawPilePanel", "뽑을 카드 더미", new Vector2(0.03f, 0.48f), new Vector2(0.97f, 0.89f), out drawPileRoot);
        }
        else if (drawPileRoot == null)
        {
            Transform found = FindChildRecursive(drawPilePanel.transform, "DrawPileRoot");
            if (found != null) drawPileRoot = found;
        }

        if (discardPilePanel == null)
        {
            discardPilePanel = CreateDeckPilePanel(deckPanel.transform, "DiscardPilePanel", "버린 카드 더미", new Vector2(0.03f, 0.03f), new Vector2(0.97f, 0.46f), out discardPileRoot);
        }
        else if (discardPileRoot == null)
        {
            Transform found = FindChildRecursive(discardPilePanel.transform, "DiscardPileRoot");
            if (found != null) discardPileRoot = found;
        }

        if (deckPanelText == null)
        {
            deckPanelText = CreateText(deckPanel.transform, "DeckText", Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero, 24f);
            deckPanelText.alignment = TextAlignmentOptions.TopLeft;
            deckPanelText.color = LearningUiSkin.InkColor;
            RectTransform textRect = deckPanelText.GetComponent<RectTransform>();
            textRect.offsetMin = new Vector2(28f, 92f);
            textRect.offsetMax = new Vector2(-28f, -28f);
            deckPanelText.enableWordWrapping = true;
            deckPanelText.gameObject.SetActive(false);
        }

        if (FindChildRecursive(deckPanel.transform, "DeckPanelCloseButton") == null)
        {
            Button close = CreateButton(deckPanel.transform, "닫기", new Vector2(0.35f, 0.92f), new Vector2(0.65f, 0.99f), ToggleDeckPanel);
            close.gameObject.name = "DeckPanelCloseButton";
        }

        SetDeckPanelsVisible(false);
    }

    private GameObject CreateDeckPilePanel(Transform parent, string panelName, string title, Vector2 anchorMin, Vector2 anchorMax, out Transform pileRoot)
    {
        GameObject panel = new GameObject(panelName);
        panel.transform.SetParent(parent, false);
        Image bg = panel.AddComponent<Image>();
        bg.sprite = LearningUiSkin.ResolveSurfaceSprite();
        bg.type = Image.Type.Sliced;
        bg.color = LearningUiSkin.MintColor;
        RectTransform rect = panel.GetComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        TMP_Text label = CreateText(panel.transform, panelName + "Label", new Vector2(0.05f, 0.82f), new Vector2(0.95f, 0.96f), Vector2.zero, Vector2.zero, 28f);
        label.text = title;
        label.alignment = TextAlignmentOptions.Left;

        string rootName = panelName.StartsWith("Draw") ? "DrawPileRoot" : "DiscardPileRoot";
        var viewport = new GameObject("Viewport", typeof(RectTransform), typeof(RectMask2D));
        viewport.transform.SetParent(panel.transform, false);
        var viewportRect = viewport.GetComponent<RectTransform>();
        viewportRect.anchorMin = new Vector2(0.04f, 0.04f);
        viewportRect.anchorMax = new Vector2(0.96f, 0.78f);
        viewportRect.offsetMin = viewportRect.offsetMax = Vector2.zero;
        pileRoot = CreateGridRoot(viewport.transform, rootName, new Vector2(0, 1), Vector2.one);
        var content = (RectTransform)pileRoot;
        content.pivot = new Vector2(.5f, 1);
        var grid = pileRoot.GetComponent<GridLayoutGroup>();
        grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
        grid.constraintCount = 4;
        var fit = pileRoot.gameObject.AddComponent<ContentSizeFitter>();
        fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        var scroll = panel.AddComponent<ScrollRect>();
        scroll.viewport = viewportRect;
        scroll.content = content;
        scroll.horizontal = false;
        scroll.movementType = ScrollRect.MovementType.Clamped;
        return panel;
    }

    private void RefreshDeckPanel()
    {
        if (controller == null || controller.Deck == null) return;

        bool hasCardRoots = drawPileRoot != null || discardPileRoot != null;
        if (deckPanelText != null)
        {
            deckPanelText.gameObject.SetActive(!hasCardRoots);
            if (!hasCardRoots) deckPanelText.text = controller.BuildDeckListText();
        }

        if (drawPileRoot != null)
        {
            Clear(drawPileRoot);
            CreateDeckPileCards(drawPileRoot, controller.Deck.drawPile);
            ForceLayoutRebuild(drawPileRoot);
        }

        if (discardPileRoot != null)
        {
            Clear(discardPileRoot);
            CreateDeckPileCards(discardPileRoot, controller.Deck.discardPile);
            ForceLayoutRebuild(discardPileRoot);
        }
    }

    private void CreateDeckPileCards(Transform root, List<LearningDeckCard> cards)
    {
        if (root == null || cards == null) return;
        for (int i = 0; i < cards.Count; i++)
        {
            CreateDeckDisplayCard(root, cards[i]);
        }
    }

    private void CreateDeckDisplayCard(Transform parent, LearningDeckCard card)
    {
        if (cardPrefab == null || parent == null) return;

        GameObject go = Instantiate(cardPrefab, parent);
        go.name = "DeckPanelCard";
        go.transform.SetParent(parent, false);

        LearningWordCardButton wordCardButton = go.GetComponent<LearningWordCardButton>();
        if (wordCardButton != null) wordCardButton.enabled = false;

        LearningExplorationSentenceCardView sentenceView = go.GetComponent<LearningExplorationSentenceCardView>();
        if (sentenceView != null) sentenceView.enabled = false;

        Button[] buttons = go.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            buttons[i].onClick.RemoveAllListeners();
            buttons[i].interactable = false;
        }

        LearningDeckCardView cardView = go.GetComponent<LearningDeckCardView>();
        if (cardView != null) cardView.Bind(card, false, false);
    }

    private void BuildDefeatPanelIfNeeded()
    {
        if (defeatPanel != null || canvas == null) return;

        defeatPanel = new GameObject("ExplorationDefeatPanel");
        defeatPanel.transform.SetParent(canvas.transform, false);
        Image bg = defeatPanel.AddComponent<Image>();
        bg.sprite = LearningUiSkin.ResolveSurfaceSprite();
        bg.type = Image.Type.Sliced;
        bg.color = LearningUiSkin.PaperColor;
        RectTransform rect = defeatPanel.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.08f, 0.34f);
        rect.anchorMax = new Vector2(0.92f, 0.66f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        TMP_Text title = CreateText(defeatPanel.transform, "DefeatText", new Vector2(0.08f, 0.48f), new Vector2(0.92f, 0.88f), Vector2.zero, Vector2.zero, 38f);
        title.text = "도전이 종료되었습니다\n다시 시도할까요?";
        title.color = LearningUiSkin.InkColor;
        CreateButton(defeatPanel.transform, "재시작", new Vector2(0.12f, 0.12f), new Vector2(0.46f, 0.34f), RestartExplorationRun);
        CreateButton(defeatPanel.transform, "로비로", new Vector2(0.54f, 0.12f), new Vector2(0.88f, 0.34f), LearningSceneLoader.LoadLobby);
        defeatPanel.SetActive(false);
    }

    private void WireDefeatPanelButtons()
    {
        if (defeatPanel == null) return;

        TMP_Text[] texts = defeatPanel.GetComponentsInChildren<TMP_Text>(true);
        for (int i = 0; i < texts.Length; i++)
        {
            TMP_Text text = texts[i];
            if (text == null) continue;
            if (text.name.IndexOf("Defeat", System.StringComparison.OrdinalIgnoreCase) >= 0 ||
                text.text.Contains("패배") ||
                text.text.Contains("실패"))
            {
                text.text = "도전이 종료되었습니다\n다시 시도할까요?";
                break;
            }
        }

        Button restartButton = FindDefeatPanelButton("Restart", "Retry", "Replay", "재시작", "다시");
        if (restartButton != null)
        {
            restartButton.onClick.RemoveListener(RestartExplorationRun);
            restartButton.onClick.AddListener(RestartExplorationRun);
        }

        Button lobbyButtonInPanel = FindDefeatPanelButton("Lobby", "Back", "로비", "나가기");
        if (lobbyButtonInPanel != null)
        {
            lobbyButtonInPanel.onClick.RemoveListener(LearningSceneLoader.LoadLobby);
            lobbyButtonInPanel.onClick.AddListener(LearningSceneLoader.LoadLobby);
        }
    }

    private Button FindDefeatPanelButton(params string[] keywords)
    {
        if (defeatPanel == null || keywords == null) return null;
        Button[] buttons = defeatPanel.GetComponentsInChildren<Button>(true);
        for (int i = 0; i < buttons.Length; i++)
        {
            Button button = buttons[i];
            if (button == null) continue;
            if (MatchesAnyKeyword(button.name, keywords)) return button;

            TMP_Text label = button.GetComponentInChildren<TMP_Text>(true);
            if (label != null && MatchesAnyKeyword(label.text, keywords)) return button;
        }

        return null;
    }

    private static bool MatchesAnyKeyword(string value, string[] keywords)
    {
        if (string.IsNullOrWhiteSpace(value) || keywords == null) return false;
        for (int i = 0; i < keywords.Length; i++)
        {
            string keyword = keywords[i];
            if (string.IsNullOrWhiteSpace(keyword)) continue;
            if (value.IndexOf(keyword, System.StringComparison.OrdinalIgnoreCase) >= 0) return true;
        }

        return false;
    }

    private void RestartExplorationRun()
    {
        LearningExplorationRunState.Clear();
        LearningExplorationRunState.StartNewRun();
        LearningSceneLoader.LoadExploration();
    }

    private void CreateCard(Transform parent, int index, LearningDeckCard card, bool inSentence, bool hiddenInitially = false)
    {
        if (cardPrefab == null) cardPrefab = LearningUiSkin.ResolvePosCardPrefab(cardPrefab);
        if (cardPrefab == null)
        {
            Debug.LogWarning("[LearningExplorationSentenceUI] PosCard prefab is not assigned.");
            return;
        }

        GameObject go = Instantiate(cardPrefab, parent);
        go.name = inSentence ? "SentenceCard" : "HandCard";
        go.transform.SetParent(parent, false);

        LearningWordCardButton wordCardButton = go.GetComponent<LearningWordCardButton>();
        if (wordCardButton != null) wordCardButton.enabled = false;

        bool scoring = inSentence && IsScoringSentenceCard(index);
        LearningDeckCardView cardView = go.GetComponent<LearningDeckCardView>();
        if (cardView != null)
        {
            bool playSentenceStatPop = ShouldPlaySentenceStatPop(card, inSentence);
            cardView.Bind(card, inSentence, scoring, playSentenceStatPop);
        }
        else
        {
            Debug.LogWarning("[LearningExplorationSentenceUI] PosCard is missing LearningDeckCardView.");
        }

        LearningExplorationSentenceCardView view = go.GetComponent<LearningExplorationSentenceCardView>();
        if (view == null) view = go.AddComponent<LearningExplorationSentenceCardView>();
        view.Init(this, index, card, inSentence);
        CanvasGroup group = go.GetComponent<CanvasGroup>();
        if (group == null) group = go.AddComponent<CanvasGroup>();
        group.alpha = hiddenInitially ? 0f : group.alpha;
        group.blocksRaycasts = !hiddenInitially;
        group.interactable = !hiddenInitially;
        if (hiddenInitially && !inSentence) go.transform.localScale = Vector3.one * 0.1f;

        if (inSentence)
        {
            RectTransform rect = go.GetComponent<RectTransform>();
            sentenceCardRects.Add(rect);
            sentenceCardViews.Add(cardView);
            sentenceCardCanvasGroups.Add(group);
        }
        else
        {
            handCardRects.Add(go.GetComponent<RectTransform>());
            handCardCanvasGroups.Add(group);
        }
    }

    private bool ShouldPlaySentenceStatPop(LearningDeckCard card, bool inSentence)
    {
        if (!inSentence || card == null) return false;
        if (sentenceStatPopPlayedCards.Contains(card)) return false;
        sentenceStatPopPlayedCards.Add(card);
        return true;
    }

    private void PruneSentenceStatPopPlayedCards()
    {
        if (controller == null || controller.SentenceCards == null)
        {
            sentenceStatPopPlayedCards.Clear();
            return;
        }

        sentenceStatPopPlayedCards.RemoveWhere(card => card == null || !controller.SentenceCards.Contains(card));
    }

    private void RefreshItems()
    {
        itemSlotObjects.Clear();
        itemSlotIds.Clear();
        ClearRuntimeOverflowItemSlots();
        ResolveRuntimeItemReferences();

        if (inventory == null)
        {
            if (HasFixedItemSlots())
            {
                for (int i = 0; i < itemSlotViews.Length; i++)
                {
                    if (itemSlotViews[i] != null) itemSlotViews[i].BindEmpty();
                }
            }
            return;
        }

        if (HasFixedItemSlots())
        {
            int visibleSlots = Mathf.Clamp(LearningExplorationRunState.ItemSlots, 2, 5);
            for (int i = 0; i < itemSlotViews.Length; i++)
            {
                LearningItemSlotView slot = itemSlotViews[i];
                if (slot == null) continue;
                bool activeSlot = i < visibleSlots;
                slot.gameObject.SetActive(activeSlot);
                if (!activeSlot) continue;

                LearningItemDefinition item = i < inventory.Items.Count ? inventory.Items[i] : null;
                if (item == null)
                {
                    slot.BindEmpty();
                    continue;
                }

                string stack = effectExecutor != null ? effectExecutor.GetStackDisplay(item, controller != null ? controller.Deck : null) : string.Empty;
                slot.BindItem(item, stack, null, ShowItemDetails);
                itemSlotObjects.Add(slot.gameObject);
                itemSlotIds.Add(item.itemId);
            }

            // Scene 04 provides two art-directed frames. Keep them, then create only
            // the additional occupied slots required by the run (up to five total).
            int fixedCount = itemSlotViews.Length;
            int overflowCount = Mathf.Min(inventory.Items.Count, visibleSlots);
            for (int i = fixedCount; i < overflowCount; i++)
            {
                LearningItemDefinition item = inventory.Items[i];
                if (item != null) CreateItemSlot(itemRoot, item);
            }
            return;
        }

        if (itemRoot == null)
        {
            return;
        }

        for (int i = 0; i < inventory.Items.Count; i++)
        {
            LearningItemDefinition item = inventory.Items[i];
            if (item == null) continue;
            CreateItemSlot(itemRoot, item);
        }
    }

    private void CreateItemSlot(Transform parent, LearningItemDefinition item)
    {
        GameObject go = new GameObject("ItemSlot");
        go.transform.SetParent(parent, false);
        Image image = go.AddComponent<Image>();
        image.color = new Color(0.12f, 0.18f, 0.28f, 0.92f);
        LayoutElement layout = go.AddComponent<LayoutElement>();
        layout.preferredWidth = 136f;
        layout.preferredHeight = 134f;

        GameObject labelGo = new GameObject("Label");
        labelGo.transform.SetParent(go.transform, false);
        RectTransform labelRect = labelGo.AddComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.offsetMin = new Vector2(8f, 5f);
        labelRect.offsetMax = new Vector2(-8f, -5f);
        TextMeshProUGUI label = labelGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) label.font = fontAsset;
        string stack = effectExecutor != null ? effectExecutor.GetStackDisplay(item, controller != null ? controller.Deck : null) : string.Empty;
        label.text = string.IsNullOrEmpty(stack) ? item.displayName : $"{item.displayName}\n{stack}";
        label.alignment = TextAlignmentOptions.Center;
        label.fontSize = 17f;
        label.color = Color.white;
        Button button = go.AddComponent<Button>();
        button.targetGraphic = image;
        LearningItemDefinition capturedItem = item;
        button.onClick.AddListener(() => ShowItemDetails(capturedItem));
        itemSlotObjects.Add(go);
        itemSlotIds.Add(item.itemId);
        runtimeOverflowItemSlots.Add(go);
    }

    private void ShowItemDetails(LearningItemDefinition item)
    {
        if (item == null) return;
        string stack = effectExecutor != null ? effectExecutor.GetStackDisplay(item, controller != null ? controller.Deck : null) : string.Empty;
        string stackText = string.IsNullOrEmpty(stack) ? string.Empty : $" / 스택 {stack}";
        SetMessage($"{item.displayName}: {item.description}{stackText}");
    }

    private bool HasFixedItemSlots()
    {
        return itemSlotViews != null && itemSlotViews.Length > 0;
    }

    private void ClearRuntimeOverflowItemSlots()
    {
        for (int i = 0; i < runtimeOverflowItemSlots.Count; i++)
        {
            GameObject slot = runtimeOverflowItemSlots[i];
            if (slot == null) continue;
            slot.SetActive(false);
            Destroy(slot);
        }
        runtimeOverflowItemSlots.Clear();
    }

    private static float GetCardMultiplierBonus(LearningDeckCard card)
    {
        if (card == null || Mathf.Abs(card.multiplier - 1f) <= 0.001f) return 0f;
        return Mathf.Max(0f, card.multiplier);
    }

    private static float GetCardViewMultiplierBonus(LearningDeckCardView view)
    {
        if (view == null || Mathf.Abs(view.Multiplier - 1f) <= 0.001f) return 0f;
        return Mathf.Max(0f, view.Multiplier);
    }

    private void ResolveRuntimeItemReferences()
    {
        if (controller != null)
        {
            if (inventory == null) inventory = controller.GetComponent<LearningItemInventory>();
            if (effectExecutor == null) effectExecutor = controller.GetComponent<LearningItemEffectExecutor>();
        }

        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (effectExecutor == null) effectExecutor = FindFirstObjectByType<LearningItemEffectExecutor>();
    }

    private TMP_Text CreateText(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 size, float fontSize)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.pivot = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = pos;
        rect.sizeDelta = size;
        TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) text.font = fontAsset;
        text.alignment = TextAlignmentOptions.Center;
        text.fontSize = fontSize;
        text.color = new Color(0.12f, 0.16f, 0.24f, 1f);
        return text;
    }

    private Transform CreateHorizontalRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, float spacing)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        HorizontalLayoutGroup layout = go.AddComponent<HorizontalLayoutGroup>();
        layout.spacing = spacing;
        layout.childAlignment = TextAnchor.MiddleCenter;
        layout.childControlWidth = false;
        layout.childControlHeight = false;
        return go.transform;
    }

    private Transform CreateGridRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        GridLayoutGroup grid = go.AddComponent<GridLayoutGroup>();
        grid.cellSize = new Vector2(170f, 88f);
        grid.spacing = new Vector2(14f, 14f);
        grid.childAlignment = TextAnchor.UpperCenter;
        return go.transform;
    }

    private Button CreateButton(Transform parent, string label, Vector2 anchorMin, Vector2 anchorMax, UnityEngine.Events.UnityAction action)
    {
        GameObject go = new GameObject(label);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        Image image = go.AddComponent<Image>();
        image.sprite = LearningUiSkin.ResolveSurfaceSprite();
        image.type = Image.Type.Sliced;
        image.color = LearningUiSkin.InkColor;
        Button button = go.AddComponent<Button>();
        button.onClick.AddListener(action);

        GameObject labelGo = new GameObject("Label");
        labelGo.transform.SetParent(go.transform, false);
        RectTransform labelRect = labelGo.AddComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.offsetMin = Vector2.zero;
        labelRect.offsetMax = Vector2.zero;
        TextMeshProUGUI text = labelGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) text.font = fontAsset;
        text.text = label;
        text.fontSize = 30f;
        text.color = Color.white;
        text.alignment = TextAlignmentOptions.Center;
        return button;
    }

    private static void Clear(Transform root)
    {
        if (root == null) return;
        for (int i = root.childCount - 1; i >= 0; i--)
        {
            Transform child = root.GetChild(i);
            child.SetParent(null, false);
            Destroy(child.gameObject);
        }
    }

    private void ApplySentenceGridScale(int sentenceCount)
    {
        GridLayoutGroup grid = sentenceRoot != null ? sentenceRoot.GetComponent<GridLayoutGroup>() : null;
        if (grid == null) return;

        CaptureSentenceGridBaseValues(grid);
        bool compact = sentenceCount >= SentenceGridCompactThreshold;
        grid.cellSize = compact ? SentenceGridCompactCellSize : sentenceGridBaseCellSize;
        grid.spacing = compact ? SentenceGridCompactSpacing : sentenceGridBaseSpacing;
        grid.padding = compact ? CreateCompactSentenceGridPadding() : CopyPadding(sentenceGridBasePadding);
    }

    private void CaptureSentenceGridBaseValues(GridLayoutGroup grid)
    {
        if (grid == null || hasSentenceGridBaseValues) return;
        sentenceGridBaseCellSize = grid.cellSize;
        sentenceGridBaseSpacing = grid.spacing;
        sentenceGridBasePadding = CopyPadding(grid.padding);
        hasSentenceGridBaseValues = true;
    }

    private static RectOffset CopyPadding(RectOffset padding)
    {
        if (padding == null) return new RectOffset();
        return new RectOffset(padding.left, padding.right, padding.top, padding.bottom);
    }

    private static RectOffset CreateCompactSentenceGridPadding()
    {
        return new RectOffset(0, 0, 10, 0);
    }

    private static void ForceLayoutRebuild(Transform root)
    {
        RectTransform rect = root as RectTransform;
        if (rect != null) LayoutRebuilder.ForceRebuildLayoutImmediate(rect);
    }
}
