using System;
using UnityEngine;
using TCG_CardMaker;
using System.Collections.Generic;
// using UnityEditor.Localization.Plugins.XLIFF.V12;
using System.Collections;
using TMPro;
public class FieldManager : MonoBehaviour
{
    public static FieldManager Instance;

    public Transform fieldParent;
    public DeckCardView fieldCardView;
    public CardView cardView;
    public FieldCard vacantField;
    public GameObject tempField;

    public bool isOnBoard;
    public int indexOfField;

    public List<string> fieldCardList;

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


        if (card.IsSpecial)
        {
            DoSpecialEvent(card);
            return;
        }

        indexOfField = tempField.transform.GetSiblingIndex();

        DeckCardView newCard = Instantiate(fieldCardView, fieldParent);
        CardView view = Instantiate(cardView, newCard.transform);

        newCard.cardView = view;
        newCard.UpdateCardSO(card);
        newCard.cardView.SetData(card);
        newCard.transform.SetSiblingIndex(indexOfField);
        view.isHandCard = false;



        CheckHoldEnd();
        RefreshFieldScale();
    }

    public void RefreshFieldScale()
    {
        // int cardCount = fieldParent.childCount;

        // float baseScale = 0.5f;
        // float scaleStep = 0.035f;
        // float minScale = 0.3f;
        // float maxScale = 0.5f;

        // float newScale = baseScale;

        // if (cardCount > 7)
        //     newScale = Mathf.Max(minScale, baseScale - (cardCount - 7) * scaleStep);
        // else
        //     newScale = Mathf.Min(maxScale, baseScale + (7 - cardCount) * scaleStep);

        // fieldParent.localScale = new Vector3(newScale, newScale, 1f);
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
                GameManager.instance.ToastText("Get");
                //                  
                int count = int.Parse(card.Title.Replace("Get", ""));
                FindAnyObjectByType<TurnManager>().deckManager.GiveMeCard(count);
                break;
            case CardType.Ex:
                GameManager.instance.ToastText("Exchange");
                Debug.Log("EX");
                GamePlayManager.instance.gameUIManager.DoExchangePanel();
                break;
            case CardType.Ro:
                GameManager.instance.ToastText("Rob");
                Debug.Log("Rob");
                GamePlayManager.instance.gameUIManager.DoRob();
                break;
            case CardType.Pr:
                GamePlayManager.instance.gameUIManager.turnManager.deckManager.AddCardToHand_Local(2);
                GameManager.instance.ToastText("이 카드는 사용할 수 없습니다.");
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

        // 2단계: 특수 카드 처리
        foreach (Transform child in fieldParent)
        {
            DeckCardView deckCard = child.GetComponent<DeckCardView>();
            if (deckCard == null || deckCard.card == null) continue;

            string cost = deckCard.card.Cost;
            if (string.IsNullOrEmpty(cost))
            {
                // steps.Add(new ScoreStep(currentScore, $"", () => { deckCard.MakeStarDust(); }));
                continue;
            }

            float operand;
            if (!float.TryParse(cost.Substring(1), out operand)) continue;

            if (cost.StartsWith("x"))
            {
                currentScore *= operand;
                steps.Add(new ScoreStep(currentScore, $"x{operand}", () => { deckCard.ShowCalulateText(false); }));
            }
        }

        foreach (Transform child in fieldParent)
        {
            DeckCardView deckCard = child.GetComponent<DeckCardView>();
            if (deckCard == null || deckCard.card == null) continue;

            string cost = deckCard.card.Cost;
            if (string.IsNullOrEmpty(cost))
            {
                // steps.Add(new ScoreStep(currentScore, $"", () => { deckCard.MakeStarDust(); }));
                continue;
            }

            float operand;
            if (!float.TryParse(cost.Substring(1), out operand)) continue;


            if (cost.StartsWith("+"))
            {
                currentScore += operand;
                steps.Add(new ScoreStep(currentScore, $"+{operand}", () => { deckCard.ShowCalulateText(true); }));
            }
        }

        int finalScore = Mathf.FloorToInt(currentScore);
        return finalScore;
    }

    public void ClearField()
    {
        foreach (Transform child in fieldParent)
        {
            Destroy(child.gameObject);
        }
    }

    public void FadeField(float value)
    {
        fieldParent.GetComponent<CanvasGroup>().alpha = value;

        isTradingTime = value == 0 ? true : false;
    }


}