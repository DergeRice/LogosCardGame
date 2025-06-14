using System;
using TCG_CardMaker;
using UnityEngine;
using UnityEngine.EventSystems;

public class FieldManager : MonoBehaviour, IEndDragHandler, IPointerEnterHandler, IPointerExitHandler
{

    public Transform fieldParent;
    public FieldCard fieldCard, vacantField;

    public GameObject tempField;

    public bool isOnBoard;

    public int indexOfField;
    [SerializeField] private float thresholdDistance = 50f; // 원하는 간격 설정

    // public RectTransform leftSpacer;
    // public RectTransform rightSpacer;


    public void OnEndDrag(PointerEventData eventData)
    {
        if (tempField != null) Destroy(tempField);
        // throw new System.NotImplementedException();
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        if (CardManager.cardManager.holdingCard.isHolding)
        {
            tempField = Instantiate(vacantField, fieldParent).gameObject;
            isOnBoard = true;
        }
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        CheckHoldEnd();
    }

    public void CheckHoldEnd()
    {
        if (tempField != null)
        {
            Destroy(tempField);
            isOnBoard = false;
        }
    }

    public void MakeCardOnBoard(CardSO card)
    {
        indexOfField = tempField.transform.GetSiblingIndex();

        var temp = Instantiate(fieldCard, fieldParent);

        temp.cardView.SetData(card);
        temp.transform.SetSiblingIndex(indexOfField);

        // UpdateSpacers();
        RefreshFieldScale();
    }

    public void RefreshFieldScale()
    {
        int cardCount = fieldParent.childCount;

        float baseScale = 0.5f;     // 시작 스케일
        float scaleStep = 0.028f;    // 줄어들거나 늘어나는 양
        float minScale = 0.2f;      // 최소 스케일
        float maxScale = 0.5f;      // 최대 스케일

        float newScale = baseScale;

        if (cardCount > 11)
        {
            newScale = Mathf.Max(minScale, baseScale - (cardCount - 11) * scaleStep);
        }
        else if (cardCount < 11)
        {
            newScale = Mathf.Min(maxScale, baseScale + (11 - cardCount) * scaleStep);
        }

        fieldParent.localScale = new Vector3(newScale, newScale, 1f);
    }


    // public void UpdateSpacers()
    // {
    //     int cardCount = fieldParent.childCount - 2; // 카드 개수 (스페이서 제외)
    //     float cardWidth = 100f; // 카드 기본 너비
    //     float spacing = 10f; // 카드 간격
    //     float totalCardWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
    //     float availableWidth = ((RectTransform)fieldParent).rect.width;

    //     float leftRightPadding = Mathf.Max((availableWidth - totalCardWidth) / 2f, 0f);

    //     leftSpacer.sizeDelta = new Vector2(leftRightPadding, 0f);
    //     rightSpacer.sizeDelta = new Vector2(leftRightPadding, 0f);
    // }


    public void UpdateGhostCardPosition(Vector2 holdingPosition)
    {
        int closestIndex = fieldParent.childCount;
        float closestDistance = float.MaxValue;
        Vector2 localMousePos;

        // 마우스 위치 → fieldParent 로컬 좌표계
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            fieldParent as RectTransform,
            holdingPosition,
            null,
            out localMousePos
        );

        for (int i = 0; i < fieldParent.childCount; i++)
        {
            Transform child = fieldParent.GetChild(i);
            if (child == tempField.transform) continue;

            float distance = Mathf.Abs(localMousePos.x - ((RectTransform)child).localPosition.x);

            if (distance < closestDistance)
            {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        indexOfField = closestIndex;

        // 설정한 거리(thresholdDistance) 이내일 때만 시블링 변경
        if (closestDistance <= thresholdDistance)
        {
            if (tempField.transform.GetSiblingIndex() != closestIndex)
            {
                tempField.transform.SetSiblingIndex(closestIndex);
                indexOfField = closestIndex;
            }
        }
    }


}
