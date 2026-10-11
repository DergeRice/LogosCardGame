using UnityEngine;
using TMPro;
using UnityEngine.UI;
using System;

namespace TCG_CardMaker
{
    public class CardView : MonoBehaviour
    {

        [Header("Card Details")]
        [SerializeField] private TextMeshProUGUI txtTitle;
        [SerializeField] private TextMeshProUGUI txtDescription;
        [SerializeField] private TextMeshProUGUI txtCost;
        [SerializeField] private TextMeshProUGUI txtCardType;
        [SerializeField] private Image imgBorder;
        [SerializeField] private Image imgArt;
        [SerializeField] private Image costImg;
        [SerializeField] private Sprite costAdd, costMulti, costSpecial;

        [SerializeField] public CardSO cardData;

        public GameObject selectCardFrame;
        [SerializeField] private TextMeshProUGUI specialTitle;
        [SerializeField] private Image specialBorder,specialImg;

        public bool isHandCard;

        public Transform center;
        

        public void SetData(CardSO card)
        {
            this.cardData = card;
            UpdateCardUI();
        }

        public void HoldFunction()
        {
            if (isHandCard)
            {
                selectCardFrame.SetActive(true);
            }
            else
            {
                gameObject.SetActive(false);
            }
        }

        public void HoldEndFunction()
        {
            if (isHandCard)
            {
                // selectCardFrame.SetActive(true);
            }
            else
            {
                gameObject.SetActive(true);
            }
        }

        public void UpdateCardUI()
        {
            if (cardData == null)
                return;

            txtTitle.text = cardData.Title;
            specialTitle.text = cardData.Title;

            txtCardType.text = cardData.Type.ToString()[0].ToString();
            txtDescription.text = SpecialWords.Instance.GetSpecialWordsFormat(cardData.Description);
            string costText = cardData.GetCostText();
            txtCost.text = costText;

            // imgBorder.sprite = cardData.Border;
            // specialBorder.sprite = cardData.Border;

            // imgArt.sprite = cardData.Art;
            // specialImg.sprite = cardData.Art;

            if (costText == "")
            {
                costImg.enabled = false;
            }
            else
            {
                costImg.enabled = true;
            }

            if (costText.Contains("+") || costText.Contains("-")) costImg.sprite = costAdd;
            if (costText.Contains("x") || costText.Contains("/") || costText.Contains("*")) costImg.sprite = costMulti;


            if (cardData.Cost == "S")
            {
                specialBorder.gameObject.SetActive(true);
                txtTitle.text = cardData.Title;
            }
            else
            {
                // 특수 카드용 비활성

                specialBorder.gameObject.SetActive(false);            // ✅ 추가

                // 일반 카드용 활성
                txtTitle.gameObject.SetActive(true);
                imgBorder.gameObject.SetActive(true);
                imgArt.transform.parent.gameObject.SetActive(true);
            }


        }

        private void OnValidate()
        {
            UpdateCardUI();
        }
    }
}
