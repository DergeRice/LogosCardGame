using System;
using POpusCodec.Enums;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using DG.Tweening;

namespace TCG_CardMaker
{
    public class DeckCardView : MonoBehaviour
    {
        private CardContextMenu menu;
        public CardView cardView;
        public CardSO card { get; private set; }

        public bool isHandCard;

        // public TMP_Text calculateText, negativeText;

        public Action cardAfterAction;

        public CanvasGroup canvasGroup;

        public TMP_Text multi,add;

        private void Awake()
        {
            menu = GetComponent<CardContextMenu>();
        }

        private void OnEnable()
        {
            // GetComponent<Canvas>().overrideSorting = true;
        }

        public void SetCardView(CardView cardView)
        {
            this.cardView = cardView;
            canvasGroup = cardView.GetComponent<CanvasGroup>();
        }

        public void UpdateCardSO(CardSO card)
        {
            this.card = card;

            cardView.SetData(card);
            cardAfterAction?.Invoke();

            // menu.SetCardSO(card);
        }

        internal void HoldFunction()
        {
            if (isHandCard) { }
            else { GetComponent<LayoutElement>().ignoreLayout = true; }
            ;
        }

        internal void HoldEndFunction()
        {
            if (isHandCard) { }
            else { GetComponent<LayoutElement>().ignoreLayout = false; }
            ;
        }

        public void ShowCalulateText(bool isAdd,string cost = "")
        {
            canvasGroup = cardView.GetComponent<CanvasGroup>();

            var target = isAdd ? add : multi;

            // Canvas floatingCanvas = null;
            if (cost.Contains("+") || cost.Contains("-")) target = add;
            if (cost.Contains("x") || cost.Contains("/") || cost.Contains("*")) target = multi;
            
            canvasGroup.DOFade(0.1f, 0.2f);
            canvasGroup.DOFade(1f, 0.2f).SetDelay(0.2f);

            var  floatingCanvas = target.GetComponent<Canvas>();

            floatingCanvas.sortingOrder = 35;

            target.gameObject.SetActive(true);
            if(cost == "") target.text = card.GetCostText();  
            else{ target.text = cost; }

            MakeStarDust(target.gameObject);
            
        }

        public void ShowCalulateText(Calculate.Multifier modifier, float value)
        {
            string token = Calculate.ToToken(modifier, value);
            bool isAdd = modifier == Calculate.Multifier.Add || modifier == Calculate.Multifier.Subtract;
            ShowCalulateText(isAdd, token);
        }

        public void MakeStarDust(GameObject target = null,bool isMakingDust = true)
        {
            GameObject temp = null;

            var starParticle = GamePlayManager.instance.gameUIManager.starParticle;

            if (isMakingDust == true)
            {
                temp = Instantiate(starParticle, cardView.transform);

                temp.transform.position = cardView.center.position;
                temp.transform.rotation = Utils.RandomZRotation();

                // starParticle.GetComponent<Canvas>().sortingOrder = 35;

                temp.transform.parent = transform;
                temp.transform.localScale = Vector3.one;
            }


            Utils.DelayCall(() =>
            {
                if(target != null) target.SetActive(false);
                if(temp != null) Destroy(temp);
            }, 2f);
        }
    }
}
