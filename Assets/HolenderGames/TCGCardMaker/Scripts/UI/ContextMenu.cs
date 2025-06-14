using UnityEngine;
using UnityEngine.EventSystems;

namespace TCG_CardMaker
{
    public class ContextMenu : MonoBehaviour , IPointerEnterHandler, IPointerExitHandler, IBeginDragHandler, IDragHandler, IEndDragHandler
    {
        [SerializeField] private GameObject contextMenuView;

        public void OnBeginDrag(PointerEventData eventData)
        {
            Debug.Log("Dss");
            CardManager.cardManager.holdingCard.SetVisible(true,gameObject);

            Debug.Log(CardManager.cardManager.holdingCard.cardView == null);
            Debug.Log(contextMenuView.GetComponent<DeckCardView>() == null);
            CardManager.cardManager.holdingCard.cardView.SetData
            (
                GetComponent<DeckCardView>().card
            );
            GetComponent<DeckCardView>().cardView.selectCardFrame.SetActive(true);
            // throw new System.NotImplementedException();
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (CardManager.cardManager.fieldManager.isOnBoard == true)
            {
                CardManager.cardManager.fieldManager.UpdateGhostCardPosition(Input.mousePosition);
            }
            // throw new System.NotImplementedException();
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            // throw new System.NotImplementedException();
            if (CardManager.cardManager.fieldManager.isOnBoard == true)
            {
                CardManager.cardManager.fieldManager.MakeCardOnBoard(GetComponent<DeckCardView>().card);
                CardManager.cardManager.holdingCard.originCardDestory();
            }
            CardManager.cardManager.holdingCard.SetVisible(false);
            GetComponent<DeckCardView>().cardView.selectCardFrame.SetActive(false);
        }

        public void OnPointerEnter(PointerEventData eventData)
        {
            ShowMenu();
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            HideMenu();
        }

        public void SetContextMenu(GameObject contextMenu)
        {
            this.contextMenuView = contextMenu;
        }

        protected void HideMenu()
        {
            if (contextMenuView != null)
            {
                contextMenuView.SetActive(false);
            }
        }

        protected void ShowMenu()
        {
            if (contextMenuView != null)
            {
                contextMenuView.SetActive(true);
            }
        }

    }
}
