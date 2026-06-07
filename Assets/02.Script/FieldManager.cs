using System;
using UnityEngine;
using TCG_CardMaker;
using System.Collections.Generic;
// using UnityEditor.Localization.Plugins.XLIFF.V12;
using System.Collections;
using TMPro;
using UnityEngine.Playables;
public class FieldManager : MonoBehaviour
{
    public static FieldManager Instance;

    public List<DeckCardView> deckCards = new List<DeckCardView>();

    public Transform fieldParent;
    public DeckCardView fieldCardView;
    public CardView cardView;
    public FieldCard vacantField;
    public GameObject tempField;

    public bool isOnBoard;
    public int indexOfField;
    [SerializeField] private float thresholdDistance = 50f;

    public bool isTradingTime = false;


    private void Awake()
    {
        Instance = this;
    }

    public void SpawnTempField()
    {
        if (tempField == null)
        {
            tempField = Instantiate(vacantField, fieldParent).gameObject;
            isOnBoard = true;
            //RefreshFieldScale();
        }
    }


    public void CheckHoldEnd()
    {
        if (tempField != null)
        {
            Destroy(tempField);
            tempField = null;
            isOnBoard = false;
        }
    }

    public void MakeCardOnBoard(CardSO card)
    {
        if (tempField == null) return;

        // Arcana selection mode: only one card can exist on the field.
        if (ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive)
        {
            ReturnAllFieldCardsToHand();
        }

        if (card.IsSpecial)
        {
            DoSpecialEvent(card);
            return;
        }

        indexOfField = tempField.transform.GetSiblingIndex();

        DeckCardView newCard = Instantiate(fieldCardView, fieldParent);

        deckCards.Add(newCard);

        CardView view = Instantiate(cardView, newCard.transform);

        newCard.cardView = view;
        newCard.UpdateCardSO(card);
        newCard.cardView.SetData(card);
        newCard.transform.SetSiblingIndex(indexOfField);
        view.isHandCard = false;



        CheckHoldEnd();
        RefreshCardList();
    }

    public void ReturnAllFieldCardsToHand()
    {
        // Move all placed cards back to hand.
        var toReturn = new List<CardSO>();
        foreach (Transform child in fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;
            toReturn.Add(view.card);
        }

        if (toReturn.Count == 0) return;

        HandManager hand = FindAnyObjectByType<HandManager>();
        if (hand == null)
        {
            Debug.LogWarning("HandManager not found. Cannot return cards to hand.");
            return;
        }

        // Destroy board objects first to avoid duplicates in layout.
        foreach (Transform child in fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;
            Destroy(child.gameObject);
        }

        for (int i = 0; i < toReturn.Count; i++)
        {
            hand.MakeCardOnHand(toReturn[i]);
        }

        RefreshCardList();
        CheckHoldEnd();
    }

    public void ClearFieldOnly()
    {
        foreach (Transform child in fieldParent)
        {
            Destroy(child.gameObject);
        }
        RefreshCardList();
        CheckHoldEnd();
    }

    public void ShowCandidatesOnField(List<CardSO> candidates, Action<int> onPicked)
    {
        // Clear any previous candidates/placed cards.
        foreach (Transform child in fieldParent)
        {
            Destroy(child.gameObject);
        }
        RefreshCardList();
        CheckHoldEnd();

        if (candidates == null || candidates.Count == 0) return;

        for (int i = 0; i < candidates.Count; i++)
        {
            CardSO card = candidates[i];
            if (card == null) continue;

            DeckCardView newCard = Instantiate(fieldCardView, fieldParent);
            deckCards.Add(newCard);

            CardView view = Instantiate(cardView, newCard.transform);
            newCard.cardView = view;
            newCard.UpdateCardSO(card);
            newCard.cardView.SetData(card);
            view.isHandCard = false;

            var click = newCard.gameObject.AddComponent<CandidateCardClick>();
            click.Init(i, onPicked);
        }

        RefreshCardList();
    }

    public void RefreshCardList()
    {
        deckCards.RemoveAll(item => item == null);
    }

    public void UpdateGhostCardPosition(Vector2 screenPos)
    {
        if (tempField == null) return;

        Camera uiCamera = Camera.main;

        var parentRT = (RectTransform)fieldParent;
        if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(parentRT, screenPos, uiCamera, out var localMouse))
            return;

        const float dead = 6f; // 경계 히스테리시스(px)

        // 규칙: "센터 + dead" 를 기준으로, 마우스보다 왼쪽인 카드 개수 = 삽입 인덱스
        int insertion = 0;
        int n = fieldParent.childCount;

        for (int i = 0; i < n; i++)
        {
            var t = fieldParent.GetChild(i);
            if (t == tempField.transform) continue;

            var rt = (RectTransform)t;
            var worldCenter = rt.TransformPoint(rt.rect.center);
            var localCenter = parentRT.InverseTransformPoint(worldCenter);

            if (localMouse.x > localCenter.x + dead)
                insertion++;
        }

        insertion = Mathf.Clamp(insertion, 0, fieldParent.childCount);
        if (tempField.transform.GetSiblingIndex() != insertion)
        {
            tempField.transform.SetSiblingIndex(insertion);
            indexOfField = insertion;
        }
    }



    public string MakeJsonToSummit()
    {
        List<string> cardTypes = new List<string>();

        foreach (Transform child in fieldParent)
        {
            DeckCardView view = child.GetComponent<DeckCardView>();
            if (view == null || view.card == null) continue;

            int index = (int)view.card.Type;

            // enum 인덱스를 기반으로 다른 enum에서 string 뽑기
            string typeStr = Enum.GetName(typeof(CardTypeJson), index);

            if (typeStr != null)
                cardTypes.Add($"\"{typeStr}\"");
            else
                Debug.LogWarning($"CardTypeJson에 인덱스 {index} 해당 항목 없음");
        }

        if (fieldParent.childCount == 0) return "";

        return "[" + string.Join(",", cardTypes) + "]";
    }

    public void DoSpecialEvent(CardSO card)
    {
        switch (card.Type)
        {
            case CardType.Ge:
                // // GameManager.instance.ToastText("Get");
                // int count = int.Parse(card.Title.Replace("Get", ""));
                // DeckManager deckManager = FindAnyObjectByType<DeckManager>();
                // if (deckManager == null)
                // {
                //     Debug.LogWarning("DeckManager not found. Cannot give cards.");
                //     break;
                // }
                // deckManager.GiveMeCard(count);
                break;
        }
    }

    public int CalculateScore(out List<ScoreStep> steps)
    {
        steps = new List<ScoreStep>();
        int baseScore = 0;
        float currentScore = 0;

        // 1단계: 카드 하나당 점수 1씩 추가
        foreach (Transform child in fieldParent)
        {
            DeckCardView deckCard = child.GetComponent<DeckCardView>();
            if (deckCard == null || deckCard.card == null) continue;

            baseScore += 1;
            currentScore += 1;
            steps.Add(new ScoreStep(currentScore, $"+1", () => { deckCard.ShowCalulateText(true, $"+1"); }));
        }

        // 2단계: 카드 수식 처리 (순서대로 적용)
        foreach (Transform child in fieldParent)
        {
            DeckCardView deckCard = child.GetComponent<DeckCardView>();
            if (deckCard == null || deckCard.card == null) continue;

            var modifiers = deckCard.card.GetCostModifiers();
            if (modifiers == null || modifiers.Count == 0) continue;

            foreach (var modifier in modifiers)
            {
                currentScore = Calculate.Apply(currentScore, modifier.Modifier, modifier.Value);
                string token = Calculate.ToToken(modifier.Modifier, modifier.Value);
                steps.Add(new ScoreStep(currentScore, token, () => { deckCard.ShowCalulateText(modifier.Modifier, modifier.Value); }));
            }
        }

        int finalScore = Mathf.FloorToInt(currentScore);
        return finalScore;
    }

    public void ClearField()
    {
        StartCoroutine(ClearFieldRoutine());
    }

    private IEnumerator ClearFieldRoutine()
    {
        RefreshCardList();

        foreach (DeckCardView child in deckCards)
        {
            if (child == null || child.cardView == null) continue;

            PlayAndDestroy(child);
            yield return new WaitForSeconds(0.1f);
        }
    }

    private void PlayAndDestroy(DeckCardView child)
    {
        PlayableDirector director = child.cardView.GetComponent<PlayableDirector>();
        if (director == null)
        {
            Destroy(child.gameObject);
            return;
        }

        void OnStopped(PlayableDirector d)
        {
            d.stopped -= OnStopped;
            Destroy(child.gameObject);
        }

        director.stopped += OnStopped;
        director.Play();
    }

    public void FadeField(float value)
    {
        fieldParent.GetComponent<CanvasGroup>().alpha = value;

        isTradingTime = value == 0 ? true : false;
    }


}
