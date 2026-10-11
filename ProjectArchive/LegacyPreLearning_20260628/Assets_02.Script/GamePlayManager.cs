using System;
using System.Collections;
using System.Collections.Generic;
using Fusion;
using Photon.Voice;
using UnityEngine;
using TCG_CardMaker;

public class GamePlayManager : MonoBehaviour
{
    public static GamePlayManager instance;
    public FieldManager fieldManager;
    public HandManager handManager;
    public GameUIManager gameUIManager;

    public int currentRound, maxRound;

    public int currentPlayCount, currentDropCount;

    [Header("Blind (Temporary Defaults)")]
    [SerializeField] private int smallBlindHp = 20;
    [SerializeField] private int smallBlind2Hp = 30;
    [SerializeField] private int bigBlindHp = 50;
    [SerializeField] private int startingCoins = 20;

    public int currentBlindIndex; // 0: small1, 1: small2, 2: big
    public int enemyHp;

    private void EnsureRunContext()
    {
        if (RunContext.Instance == null)
        {
            var go = new GameObject("RunContext");
            go.AddComponent<RunContext>();
        }

        if (AudioManager.Instance == null)
        {
            var go = new GameObject("AudioManager");
            go.AddComponent<AudioManager>();
        }

        if (SubmitFeedbackPlayer.Instance == null)
        {
            var go = new GameObject("SubmitFeedbackPlayer");
            go.AddComponent<SubmitFeedbackPlayer>();
        }

        if (ArcanaSelectionMode.Instance == null)
        {
            var go = new GameObject("ArcanaSelectionMode");
            go.AddComponent<ArcanaSelectionMode>();
        }

        if (ArcanaOverlayUI.Instance == null)
        {
            var go = new GameObject("ArcanaOverlayUI");
            go.AddComponent<ArcanaOverlayUI>();
        }

        if (ShopRuntimeUI.Instance == null)
        {
            var go = new GameObject("ShopRuntimeUI");
            go.AddComponent<ShopRuntimeUI>();
        }

        if (RunInventoryRuntimeUI.Instance == null)
        {
            var go = new GameObject("RunInventoryRuntimeUI");
            go.AddComponent<RunInventoryRuntimeUI>();
        }

        if (RunHudButtonsRuntimeUI.Instance == null)
        {
            var go = new GameObject("RunHudButtonsRuntimeUI");
            go.AddComponent<RunHudButtonsRuntimeUI>();
        }

        if (AudioSettingsRuntimeUI.Instance == null)
        {
            var go = new GameObject("AudioSettingsRuntimeUI");
            go.AddComponent<AudioSettingsRuntimeUI>();
        }
    }

    public void Start()
    {
        instance = this;

        //나중에 지우기
        GameStart();

        
    }

    [UnityEngine.ContextMenu("GameStart")]
    public void GameStart()
    {
        EnsureRunContext();
        StartCoroutine(DrawStartHandFromRunDeck(8));

        // If this is effectively a fresh run, seed coins for shop testing/iteration.
        if (RunContext.Instance != null && RunContext.Instance.State.coins <= 0 && startingCoins > 0)
        {
            RunContext.Instance.SetCoins(startingCoins);
            RunContext.Instance.SaveRun();
        }

        ResetCountsForBlind();
        StartBlind(0);

        gameUIManager.UpdateCurrentUI();
    }

    private IEnumerator DrawStartHandFromRunDeck(int count)
    {
        if (count <= 0) yield break;

        DeckManager deckManager = FindAnyObjectByType<DeckManager>();
        if (deckManager == null)
        {
            Debug.LogWarning("DeckManager not found. Cannot draw start hand.");
            yield break;
        }

        for (int i = 0; i < count; i++)
        {
            deckManager.DrawOneFromRunDeck();
            yield return new WaitForSeconds(ValueDictionary.CardGainSecond);
        }
    }

    public void TrySubmitHand()
    {
        EnsureRunContext();

        if (ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive)
        {
            if (ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.CardPackPickOne)
            {
                if (ArcanaSelectionMode.Instance.SelectedIndex < 0) return;
                RunContext.Instance.EventQueue.Enqueue(() => ArcanaSelectionMode.Instance.Confirm());
                return;
            }

            // Single-card confirm: some arcanas require a field card (targeting), others don't.
            if (ArcanaSelectionMode.Instance.ModeType == ArcanaModeType.HandTypePickOne)
            {
                if (ArcanaSelectionMode.Instance.SelectedIndex < 0) return;
            }
            else if (ArcanaSelectionMode.Instance.RequireFieldCardForConfirm)
            {
                if (GetFieldCardCount() != 1) return;
            }
            RunContext.Instance.EventQueue.Enqueue(() => ArcanaSelectionMode.Instance.Confirm());
            return;
        }

        if (currentPlayCount <= 0) return;
        string posJson = FieldManager.Instance.MakeJsonToSummit();
        if (string.IsNullOrWhiteSpace(posJson)) return;
        RunContext.Instance.EventQueue.Enqueue(() => NetworkManager.instance.CheckGrammar(posJson));
    }

    public void TryDiscardSelected()
    {
        EnsureRunContext();

        if (ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive)
        {
            // Cancel: do not consume item.
            RunContext.Instance.EventQueue.Enqueue(() => ArcanaSelectionMode.Instance.Cancel());
            return;
        }

        if (currentDropCount <= 0) return;
        RunContext.Instance.EventQueue.Enqueue(DiscardSelectedRoutine());
    }

    public void TrySkipArcana()
    {
        EnsureRunContext();
        if (ArcanaSelectionMode.Instance == null || !ArcanaSelectionMode.Instance.IsActive) return;
        RunContext.Instance.EventQueue.Enqueue(() => ArcanaSelectionMode.Instance.Skip());
    }

    public void CheckGrammar(bool isValid, int handType)
    {
        EnsureRunContext();
        RunContext.Instance.EventQueue.Enqueue(SubmitRoutine(isValid, handType));
    }

    // Backward-compat for older callers (e.g. network response that only returns valid).
    public void CheckGrammar(bool isValid)
    {
        CheckGrammar(isValid, 0);
    }

    private IEnumerator SubmitRoutine(bool isValid, int handType)
    {
        int playedCount = GetFieldCardCount();
        if (playedCount <= 0) yield break;

        currentPlayCount = Mathf.Max(0, currentPlayCount - 1);
        if (RunContext.Instance != null)
        {
            RunContext.Instance.ApplyBlindState(currentBlindIndex, enemyHp, currentPlayCount, currentDropCount);
        }
        gameUIManager.UpdateCurrentUI();

        if (!isValid)
        {
            gameUIManager.GrammarFail();
            // Still consume the hand: discard played cards, clear field, draw replacement.
            DiscardFieldCardsToRunDeck();
            fieldManager.ClearField();
            yield return new WaitForSeconds(0.2f);
            DrawReplacementCards(playedCount);
            yield break;
        }

        List<ScoreStep> steps;
        int score = fieldManager.CalculateScore(out steps);

        if (RunContext.Instance != null)
        {
            var posCounts = BuildPosCountsFromField();
            score = RunContext.Instance.ApplyEquipmentsToScore(posCounts, score, out var equipmentSteps);
            if (equipmentSteps != null && equipmentSteps.Count > 0)
            {
                RunContext.Instance.EventQueue.Enqueue(SubmitFeedbackPlayer.Instance != null
                    ? SubmitFeedbackPlayer.Instance.PlayEquipmentSteps(equipmentSteps)
                    : null);
            }
            score = RunContext.Instance.ApplyPermanentBaseScore(score);
            int handTypeIndex = Mathf.Clamp(handType, 1, 5) - 1;
            score = RunContext.Instance.ApplyHandTypeBonuses(handTypeIndex, score);
            IncrementHandTypeUseCount(handTypeIndex);
        }

        enemyHp = Mathf.Max(0, enemyHp - score);
        if (RunContext.Instance != null)
        {
            RunContext.Instance.ApplyBlindState(currentBlindIndex, enemyHp, currentPlayCount, currentDropCount);
        }

        yield return StartCoroutine(gameUIManager.PlayScoreAnimation(steps));

        DiscardFieldCardsToRunDeck();
        fieldManager.ClearField();
        yield return new WaitForSeconds(0.2f);
        DrawReplacementCards(playedCount);

        if (enemyHp <= 0)
        {
            AdvanceBlind();
        }
    }

    private IEnumerator DiscardSelectedRoutine()
    {
        int playedCount = GetFieldCardCount();
        if (playedCount <= 0) yield break;

        currentDropCount = Mathf.Max(0, currentDropCount - 1);
        if (RunContext.Instance != null)
        {
            RunContext.Instance.ApplyBlindState(currentBlindIndex, enemyHp, currentPlayCount, currentDropCount);
        }
        gameUIManager.UpdateCurrentUI();

        DiscardFieldCardsToRunDeck();
        fieldManager.ClearField();
        yield return new WaitForSeconds(0.2f);
        DrawReplacementCards(playedCount);
    }

    private int GetFieldCardCount()
    {
        int count = 0;
        foreach (Transform child in fieldManager.fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;
            count++;
        }
        return count;
    }

    private void DiscardFieldCardsToRunDeck()
    {
        DeckManager deckManager = FindAnyObjectByType<DeckManager>();
        if (deckManager == null) return;

        var toDiscard = new List<CardSO>();
        foreach (Transform child in fieldManager.fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;
            toDiscard.Add(view.card);
        }

        deckManager.DiscardToRunDeck(toDiscard);
    }

    private void DrawReplacementCards(int count)
    {
        if (count <= 0) return;
        DeckManager deckManager = FindAnyObjectByType<DeckManager>();
        if (deckManager == null) return;
        deckManager.DrawFromRunDeck(count);
    }

    private Dictionary<string, int> BuildPosCountsFromField()
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (Transform child in fieldManager.fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;

            int index = (int)view.card.Type;
            string posId = Enum.GetName(typeof(CardTypeJson), index);
            if (string.IsNullOrWhiteSpace(posId)) continue;

            counts.TryGetValue(posId, out int cur);
            counts[posId] = cur + 1;
        }

        return counts;
    }

    private void IncrementHandTypeUseCount(int handTypeIndex)
    {
        if (RunContext.Instance == null) return;
        if (handTypeIndex < 0 || handTypeIndex >= 5) return;

        var arr = RunContext.Instance.State.handTypeUseCount;
        if (arr == null || arr.Length != 5) RunContext.Instance.State.handTypeUseCount = new int[5];
        RunContext.Instance.State.handTypeUseCount[handTypeIndex] += 1;
        RunContext.Instance.SaveRun();
    }

    private void ResetCountsForBlind()
    {
        currentPlayCount = 4;
        currentDropCount = 4;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.ApplyBlindState(currentBlindIndex, enemyHp, currentPlayCount, currentDropCount);
        }
    }

    private void StartBlind(int blindIndex)
    {
        currentBlindIndex = Mathf.Clamp(blindIndex, 0, 2);
        enemyHp = currentBlindIndex == 0 ? smallBlindHp : currentBlindIndex == 1 ? smallBlind2Hp : bigBlindHp;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.ApplyBlindState(currentBlindIndex, enemyHp, currentPlayCount, currentDropCount);
            RunContext.Instance.SaveRun();
        }
    }

    private void AdvanceBlind()
    {
        // Blind clear checkpoint
        if (RunContext.Instance != null)
        {
            RunContext.Instance.SaveRun();
        }

        if (currentBlindIndex < 2)
        {
            ResetCountsForBlind();
            StartBlind(currentBlindIndex + 1);
            gameUIManager.UpdateCurrentUI();
            return;
        }

        // Big blind cleared: placeholder for shop transition.
        OpenShop();
        ResetCountsForBlind();
        StartBlind(0);
        gameUIManager.UpdateCurrentUI();
    }

    private void OpenShop()
    {
        // Shop open checkpoint
        if (RunContext.Instance != null)
        {
            RunContext.Instance.OnShopOpened();
            RunContext.Instance.GrantCoinsFromShopOpenEquipments();
            RunContext.Instance.SaveRun();
        }
        if (ShopRuntimeUI.Instance != null)
        {
            ShopRuntimeUI.Instance.Open();
        }
        else
        {
            GameManager.instance.ToastText("Shop Open (missing UI)");
        }
    }
}
