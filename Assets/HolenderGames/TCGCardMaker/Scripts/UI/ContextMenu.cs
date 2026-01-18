using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

namespace TCG_CardMaker
{
    public class ContextMenu : MonoBehaviour , IPointerEnterHandler, IPointerExitHandler, IBeginDragHandler, IDragHandler, IEndDragHandler
    {
        // [SerializeField] private GameObject contextMenuView;
        // public CardSO cardDB;
        public DeckCardView deckCardView;

        private void OnEnable()
        {
            deckCardView = GetComponent<DeckCardView>();
        }

        public void StartHoldingCard()
        {
            // 마우스가 DragArea 위에 있는지 확인
            PointerEventData eventData = new PointerEventData(EventSystem.current)
            {
                position = Input.mousePosition
            };

            List<RaycastResult> results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(eventData, results);

            foreach (var result in results)
            {
                DragArea dragArea = result.gameObject.GetComponent<DragArea>();
                if (dragArea != null)
                {
                    FieldManager.Instance.SpawnTempField();
                    break;
                }
            }
        }

        public void OnBeginDrag(PointerEventData eventData)
        {

            if (FieldManager.Instance.isTradingTime == true) return;
            // Debug.Log("Dssㅁㄴㅇㅁㄴㅇ");
            CardManager.instance.holdingCard.isHandCard = deckCardView.cardView.isHandCard;
            
            StartHoldingCard();
            CardManager.instance.holdingCard.SetVisible(true, gameObject);

            CardManager.instance.holdingCard.cardView.SetData
            (
                deckCardView.cardView.cardData
            );
            deckCardView.HoldFunction();
            deckCardView.cardView.HoldFunction();

            

            CardManager.instance.returnArea.SetVisible(!deckCardView.cardView.isHandCard);
            // throw new System.NotImplementedException();
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (CardManager.instance.fieldManager.isOnBoard == true)
            {
                // Debug.Log("Dss");
                FieldManager.Instance.UpdateGhostCardPosition(Input.mousePosition);
            }
            // throw new System.NotImplementedException();
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            // throw new System.NotImplementedException();
            if (CardManager.instance.fieldManager.isOnBoard == true)
            {
                // if (deckCardView.cardView.cardData.Cost == "S")
                // {
                //     // CardManager.cardManager.fieldManager.DoSpecial(deckCardView.cardView.cardData);
                //     CardManager.cardManager.fieldManager.MakeCardOnBoard(deckCardView.cardView.cardData);
                //     CardManager.cardManager.holdingCard.originCardDestory();
                //     return;
                // }
                CardManager.instance.fieldManager.MakeCardOnBoard(deckCardView.cardView.cardData);
                CardManager.instance.holdingCard.originCardDestory();
            }
            else if (CardManager.instance.returnArea.isOnHand == true)
            {
                CardManager.instance.handManager.MakeCardOnHand(deckCardView.cardView.cardData);
                CardManager.instance.holdingCard.originCardDestory();
            }
            CardManager.instance.returnArea.SetVisible(false);     
            CardManager.instance.holdingCard.SetVisible(false);
            deckCardView.cardView.selectCardFrame.SetActive(false);
            deckCardView.HoldEndFunction();
            deckCardView.cardView.HoldEndFunction(); 
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
            // this.contextMenuView = contextMenu;
        }

        protected void HideMenu()
        {
            // if (contextMenuView != null)
            // {
            //     contextMenuView.SetActive(false);
            // }
        }

        protected void ShowMenu()
        {
            // if (contextMenuView != null)
            // {
            //     contextMenuView.SetActive(true);
            // }
        }

    }
}
