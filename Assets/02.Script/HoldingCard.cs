using System;
using NUnit.Framework;
using TCG_CardMaker;
using UnityEngine;

public class HoldingCard : MonoBehaviour
{
    public Canvas canvas; // 꼭 연결해줘야 함!
    private RectTransform rectTransform;

    public CardView cardView;
    public CanvasGroup canvasGroup;

    public GameObject orignCard;

    public bool isHolding;

    private void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        cardView = GetComponent<CardView>();
        canvasGroup = GetComponent<CanvasGroup>();
    }

    public void SetVisible(bool enabled, GameObject orign = null)
    {
        canvasGroup.alpha = enabled ? 1 : 0;
        isHolding = enabled;

        if (enabled == false)
        {
            CardManager.cardManager.fieldManager.CheckHoldEnd();
        }
        else
        {
            orignCard = orign;
        }
    }



    void Update()
    {
        Vector2 pos;

        RectTransformUtility.ScreenPointToLocalPointInRectangle(
        canvas.transform as RectTransform,
        Input.mousePosition,
        canvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : canvas.worldCamera,
        out pos
        );
        rectTransform.localPosition = pos; 
    } 

    internal void originCardDestory()
    {
        Destroy(orignCard);
    }
}
