using System.Collections.Generic;
using TCG_CardMaker;
using UnityEngine;

public class ArcanaSelectionMode : MonoBehaviour
{
    public static ArcanaSelectionMode Instance { get; private set; }

    public bool IsActive { get; private set; }
    public ConsumableItemSO PendingItem { get; private set; }
    public ArcanaModeType ModeType { get; private set; } = ArcanaModeType.SingleCardConfirm;
    public bool RequireFieldCardForConfirm { get; private set; }

    // For pick-one modes.
    public List<CardSO> CandidateCards { get; private set; } = new List<CardSO>();
    public int SelectedIndex { get; private set; } = -1;

    // When arcana is used from inventory, we need to consume it on Confirm/Skip only.
    private int _pendingInventoryIndex = -1;
    private string _pendingItemId;

    private string _transformFromStableId;
    private List<string> _transformFromCandidates = new List<string>();
    private List<string> _transformToCandidates = new List<string>();

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public void SetPendingInventoryIndex(int index, string itemId)
    {
        _pendingInventoryIndex = index;
        _pendingItemId = itemId;
    }

    public void Begin(ConsumableItemSO item)
    {
        BeginSingleCard(item);
    }

    public void BeginSingleCard(ConsumableItemSO item)
    {
        PendingItem = item;
        IsActive = true;
        ModeType = ArcanaModeType.SingleCardConfirm;
        RequireFieldCardForConfirm = ItemRequiresFieldCard(item);
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        CandidateCards.Clear();
        SelectedIndex = -1;

        // Return any placed cards back to hand.
        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void BeginCardPackPickOne(ConsumableItemSO item, List<CardSO> candidates)
    {
        PendingItem = item;
        IsActive = true;
        ModeType = ArcanaModeType.CardPackPickOne;
        RequireFieldCardForConfirm = false;
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        CandidateCards = candidates ?? new List<CardSO>();
        SelectedIndex = -1;

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
            GamePlayManager.instance.fieldManager.ShowCandidatesOnField(CandidateCards, OnCandidatePicked);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void BeginHandTypePickOne(ConsumableItemSO item)
    {
        PendingItem = item;
        IsActive = true;
        ModeType = ArcanaModeType.HandTypePickOne;
        RequireFieldCardForConfirm = false;
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        CandidateCards = BuildHandTypeCards();
        SelectedIndex = -1;

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
            GamePlayManager.instance.fieldManager.ShowCandidatesOnField(CandidateCards, OnCandidatePicked);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    private static List<CardSO> BuildHandTypeCards()
    {
        var result = new List<CardSO>(5);
        for (int i = 1; i <= 5; i++)
        {
            var c = ScriptableObject.CreateInstance<CardSO>();
            c.Title = $"{i}형식";
            c.Description = "Choose to upgrade this hand type.";
            c.Cost = "";
            c.Type = CardType.대명사;
            result.Add(c);
        }
        return result;
    }

    private void OnCandidatePicked(int index)
    {
        SelectedIndex = index;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.Stats.SetInt(RunStatKey.ArcanaSelectedIndex, index);
        }
        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void BeginDeckTransformPickFrom(ConsumableItemSO item)
    {
        PendingItem = item;
        IsActive = true;
        ModeType = ArcanaModeType.DeckTransformPickFrom;
        RequireFieldCardForConfirm = false;

        _transformFromStableId = null;
        _transformFromCandidates = BuildDeckTransformFromCandidates();
        _transformToCandidates.Clear();

        CandidateCards = BuildCandidateCardsFromStableIds(_transformFromCandidates);
        SelectedIndex = -1;

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
            GamePlayManager.instance.fieldManager.ShowCandidatesOnField(CandidateCards, OnCandidatePicked);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    private void BeginDeckTransformPickTo()
    {
        ModeType = ArcanaModeType.DeckTransformPickTo;
        RequireFieldCardForConfirm = false;

        _transformToCandidates = BuildDeckTransformToCandidates();
        CandidateCards = BuildCandidateCardsFromStableIds(_transformToCandidates);
        SelectedIndex = -1;

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            GamePlayManager.instance.fieldManager.ClearFieldOnly();
            GamePlayManager.instance.fieldManager.ShowCandidatesOnField(CandidateCards, OnCandidatePicked);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void Cancel()
    {
        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            if (ModeType == ArcanaModeType.CardPackPickOne
                || ModeType == ArcanaModeType.HandTypePickOne
                || ModeType == ArcanaModeType.DeckTransformPickFrom
                || ModeType == ArcanaModeType.DeckTransformPickTo)
                GamePlayManager.instance.fieldManager.ClearFieldOnly();
            else
                GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
        }

        PendingItem = null;
        IsActive = false;
        RequireFieldCardForConfirm = false;
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        _pendingInventoryIndex = -1;
        _pendingItemId = null;
        CandidateCards.Clear();
        SelectedIndex = -1;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.Stats.SetInt(RunStatKey.ArcanaSelectedIndex, -1);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void Confirm()
    {
        if (RunContext.Instance != null)
        {
            if (ModeType == ArcanaModeType.DeckTransformPickFrom)
            {
                if (SelectedIndex >= 0 && SelectedIndex < _transformFromCandidates.Count)
                {
                    _transformFromStableId = _transformFromCandidates[SelectedIndex];
                    BeginDeckTransformPickTo();
                }
                return; // do not consume yet
            }

            if (ModeType == ArcanaModeType.DeckTransformPickTo)
            {
                if (!string.IsNullOrWhiteSpace(_transformFromStableId)
                    && SelectedIndex >= 0 && SelectedIndex < _transformToCandidates.Count)
                {
                    string toId = _transformToCandidates[SelectedIndex];
                    ConsumePendingInventoryItem();
                    RunContext.Instance.TransformOneDeckCard(_transformFromStableId, toId);
                }
            }
            else if (ModeType == ArcanaModeType.CardPackPickOne)
            {
                if (SelectedIndex >= 0 && SelectedIndex < CandidateCards.Count)
                {
                    ConsumePendingInventoryItem();
                    // Add chosen card to deck and also give to hand immediately.
                    string id = RunContext.ToStableCardId(CandidateCards[SelectedIndex]);
                    RunContext.Instance.AddDeckCard(id);

                    var hand = FindAnyObjectByType<HandManager>();
                    if (hand != null)
                    {
                        hand.MakeCardOnHand(CandidateCards[SelectedIndex].CreateClone());
                    }
                }
            }
            else if (ModeType == ArcanaModeType.HandTypePickOne)
            {
                if (SelectedIndex >= 0 && SelectedIndex < 5)
                {
                    ConsumePendingInventoryItem();
                    RunContext.Instance.UpgradeHandType(SelectedIndex);
                }
            }
            else
            {
                // Use item effects for single-card mode.
                if (PendingItem != null)
                {
                    ConsumePendingInventoryItem();
                    RunContext.Instance.UseItem(PendingItem);
                }
            }

            RunContext.Instance.SaveRun();
        }

        PendingItem = null;
        IsActive = false;
        RequireFieldCardForConfirm = false;
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        _pendingInventoryIndex = -1;
        _pendingItemId = null;
        CandidateCards.Clear();
        SelectedIndex = -1;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.Stats.SetInt(RunStatKey.ArcanaSelectedIndex, -1);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            if (ModeType == ArcanaModeType.CardPackPickOne
                || ModeType == ArcanaModeType.HandTypePickOne
                || ModeType == ArcanaModeType.DeckTransformPickFrom
                || ModeType == ArcanaModeType.DeckTransformPickTo)
                GamePlayManager.instance.fieldManager.ClearFieldOnly();
            else
                GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    public void Skip()
    {
        // Consume the inventory item but do nothing.
        if (RunContext.Instance != null && _pendingInventoryIndex >= 0)
        {
            RunContext.Instance.ConsumeConsumableAt(_pendingInventoryIndex);
            RunContext.Instance.SaveRun();
        }

        PendingItem = null;
        IsActive = false;
        RequireFieldCardForConfirm = false;
        _transformFromStableId = null;
        _transformFromCandidates.Clear();
        _transformToCandidates.Clear();
        _pendingInventoryIndex = -1;
        _pendingItemId = null;
        CandidateCards.Clear();
        SelectedIndex = -1;
        if (RunContext.Instance != null)
        {
            RunContext.Instance.Stats.SetInt(RunStatKey.ArcanaSelectedIndex, -1);
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.fieldManager != null)
        {
            if (ModeType == ArcanaModeType.CardPackPickOne
                || ModeType == ArcanaModeType.HandTypePickOne
                || ModeType == ArcanaModeType.DeckTransformPickFrom
                || ModeType == ArcanaModeType.DeckTransformPickTo)
                GamePlayManager.instance.fieldManager.ClearFieldOnly();
            else
                GamePlayManager.instance.fieldManager.ReturnAllFieldCardsToHand();
        }

        if (GamePlayManager.instance != null && GamePlayManager.instance.gameUIManager != null)
        {
            GamePlayManager.instance.gameUIManager.UpdateCurrentUI();
        }
    }

    private static bool ItemRequiresFieldCard(ConsumableItemSO item)
    {
        if (item == null || item.effects == null) return false;
        for (int i = 0; i < item.effects.Count; i++)
        {
            if (item.effects[i].type == RunEffectType.TransformFirstFieldCard)
                return true;
        }
        return false;
    }

    private void ConsumePendingInventoryItem()
    {
        if (RunContext.Instance == null) return;
        if (_pendingInventoryIndex < 0) return;
        RunContext.Instance.ConsumeConsumableAt(_pendingInventoryIndex);
        _pendingInventoryIndex = -1;
    }

    private static List<string> BuildDeckTransformFromCandidates()
    {
        var result = new List<string>();
        if (RunContext.Instance == null || RunContext.Instance.State == null) return result;

        var list = RunContext.Instance.State.deckCards;
        if (list == null || list.Count == 0) return result;

        // Pick up to 5 unique stable ids from deck
        for (int tries = 0; tries < 50 && result.Count < 5; tries++)
        {
            var inst = list[Random.Range(0, list.Count)];
            if (inst == null || string.IsNullOrWhiteSpace(inst.stableId)) continue;
            if (result.Contains(inst.stableId)) continue;
            result.Add(inst.stableId);
        }

        return result;
    }

    private static List<string> BuildDeckTransformToCandidates()
    {
        var result = new List<string>();
        if (CardsDB.Instance == null || CardsDB.Instance.Cards == null) return result;

        // Pick 8 unique stable ids from DB
        var cards = CardsDB.Instance.Cards;
        for (int tries = 0; tries < 200 && result.Count < 8; tries++)
        {
            var c = cards[Random.Range(0, cards.Count)];
            if (c == null) continue;
            string id = RunContext.ToStableCardId(c);
            if (string.IsNullOrWhiteSpace(id)) continue;
            if (result.Contains(id)) continue;
            result.Add(id);
        }

        return result;
    }

    private static List<CardSO> BuildCandidateCardsFromStableIds(List<string> stableIds)
    {
        var result = new List<CardSO>();
        if (stableIds == null) return result;
        for (int i = 0; i < stableIds.Count; i++)
        {
            var c = RunContext.FindCardByStableId(stableIds[i]);
            if (c == null)
            {
                var temp = ScriptableObject.CreateInstance<CardSO>();
                temp.Title = stableIds[i];
                temp.Description = "Missing card def";
                temp.Cost = "";
                temp.Type = CardType.대명사;
                result.Add(temp);
            }
            else
            {
                result.Add(c);
            }
        }
        return result;
    }
}
