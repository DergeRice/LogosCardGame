using System.Collections.Generic;
using UnityEngine;
using TCG_CardMaker;
using UnityEngine.UI;
using Unity.VisualScripting;
using System.Collections;
using DG.Tweening;

public class HandManager : MonoBehaviour
{
    public HorizontalLayoutGroup cardHolder;

    public Transform cardsContainer;
    public DeckCardView deckCardViewPrefab;
    public CardView cardViewPrefab;
    public GameObject isOn;

    [Header("Hand Layout Settings")]
    public float baseSpacing = -55f;        // 카드 간 기본 간격
    public float minSpacing = -150f;        // 최대 카드 수일 때 최소 간격
    public float spacingPerCard = -5f;
    // private int spacingThreshold = 8;        // 간격 줄이기 시작할 카드 수
    public float angleStep = 5f;            // 카드 사이 각도 차이 (절대값)
    public float maxAngle = 30f;            // 양 끝 카드 최대 회전각도
    [SerializeField] private float verticalCurveFactor =   1f;


    void Start()
    {
        if (FusionConnector.Instance != null)
        {
            var runner = FusionConnector.Instance.runner;
            if (runner != null && runner.IsSharedModeMasterClient)
            {
                // 마스터일 때 처리 (필요 시)
            }
        }
    }

    public void CheckHoldEnd() => isOn.SetActive(false);
    public void ShowIsOn() => isOn.SetActive(true);

    public void MakeCardOnHand(CardSO card) // only return fuction
    {
        DeckCardView newCard = Instantiate(deckCardViewPrefab, cardsContainer);
        CardView view = Instantiate(cardViewPrefab, newCard.transform);

        newCard.cardView = view;
        newCard.UpdateCardSO(card);
        newCard.cardView.SetData(card);
        view.isHandCard = true;

        RefreshHandLayout(view);
        CheckHoldEnd();
        GamePlayManager.instance.fieldManager.RefreshCardList();
    }

    public void RefreshHandLayout(CardView targetCardView = null)
    {
        int count = cardsContainer.childCount;
        float spacing = baseSpacing;

        if (count > 6)
        {
            spacing = baseSpacing + (spacingPerCard * (count - 1));
            cardHolder.spacing = spacing;
        }

        float centerIndex = (count - 1) / 2f;

        for (int i = 0; i < count; i++)
        {
            Transform card = cardsContainer.GetChild(i);
            DeckCardView deckCardView = card.GetComponent<DeckCardView>();
            RectTransform rt = deckCardView.cardView.GetComponent<RectTransform>();

            float offsetFromCenter = i - centerIndex;

            // 회전
            float angle = Mathf.Clamp(offsetFromCenter * angleStep, -maxAngle, maxAngle);
            card.localRotation = Quaternion.Euler(0f, 0f, angle);

            // 목표 yOffset 계산
            float yOffset = -Mathf.Pow(offsetFromCenter, 2) * verticalCurveFactor;

            // 만약 이 카드가 targetCardView면, -10에서 천천히 올라오게
            if (targetCardView != null  && deckCardView.cardView == targetCardView)
            {
                rt.anchoredPosition = new Vector2(0, -230f); // 시작점

                // DOTween으로 천천히 올라감
                rt.DOAnchorPosY(yOffset, 1.3f)
                    .SetEase(Ease.OutBack);
                    // .SetDelay(0.05f); // 혹시 약간의 딜레이 주고 싶다면
            }
            else
            {
                // 다른 카드는 그냥 바로 위치 지정
                rt.anchoredPosition = new Vector2(0, yOffset);
            }
        }
    }


}
