using UnityEngine;
using UnityEngine.EventSystems;
using TCG_CardMaker;
using UnityEngine.UI;

public class ReturnArea : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
{
    public HandManager handManager;

    public CanvasGroup board;

    public bool isOnHand = false;

    public void OnPointerEnter(PointerEventData eventData)
    {
        Debug.Log("ReturnArea");
        if (CardManager.instance.holdingCard.isHolding && CardManager.instance.holdingCard.isHandCard == false)
        {
            handManager.ShowIsOn();
            isOnHand = true;
            board.alpha = 1.0f;
        }
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        if (CardManager.instance.holdingCard.isHolding && CardManager.instance.holdingCard.isHandCard == false)
        {
            board.alpha = 0.6f;
            isOnHand = false;
        }
    }
    public void OnPointerMove(PointerEventData eventData)
    {
    }

    public void SetVisible(bool value)
    {
        board.gameObject.SetActive(value);
        board.alpha = value ? 0.6f : 0.0f;

    }
}
