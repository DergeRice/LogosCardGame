using UnityEngine;
using System.IO;
using TMPro;
using UnityEngine.UI;
using System;
using System.Linq;
using System.Collections.Generic;
using TCGStarter.Tweening;

namespace TCG_CardMaker
{
    public class CardEditorPanel : MonoBehaviour
    {
        [Header("Card Details")]
        [SerializeField] private TMP_InputField txtTitle;
        [SerializeField] private TMP_InputField txtDescription;
        [SerializeField] private TMP_InputField txtCost;
        [SerializeField] private ImageScroller imgBorderPicker;
        [SerializeField] private ImageScroller imgArtPicker;
        [SerializeField] private TMP_Dropdown cardTypeDropdown;
        [SerializeField] private Toggle targeting;
        [SerializeField] private Transform traitsContainer;

        [Header("References")]
        [SerializeField] private Transform cardPreviewContainer;
        [SerializeField] private TraitButton traitButtonPrefab;

        private CardSO draftCard;
        private CardView cardView;
        private List<TraitButton> traitButtons = new List<TraitButton>();

        private void Awake()
        {
            draftCard = ScriptableObject.CreateInstance<CardSO>();
            txtTitle.onValueChanged.AddListener(UpdateTitle);
            txtDescription.onValueChanged.AddListener(UpdateDescription);
            txtCost.onValueChanged.AddListener(UpdateCost);

            imgBorderPicker.OnImageSelect += ImgBorder_OnImageSelect;
            imgArtPicker.OnImageSelect += ImgArt_OnImageSelect;
            targeting.onValueChanged.AddListener(UpdateTargeting);
            cardTypeDropdown.onValueChanged.AddListener(UpdateCardType);
        }
        private void Start()
        {
            cardView = Instantiate(Settings.Instance.CardViewPrefab, cardPreviewContainer);
            cardView.SetData(draftCard);

            PopulateCardTypes();
            PopulateTraitTypes();

            imgBorderPicker.SetImagesDB(Settings.Instance.CardBordersDB);
            imgArtPicker.SetImagesDB(Settings.Instance.CardArtDB);

           
            UpdateEditFields();

            foreach (TraitButton traitBtn in traitsContainer.GetComponentsInChildren<TraitButton>())
            {
                traitBtn.OnTraitStateChange += OnTraitStateChange;
            }

            TweenExtentions.TweenMoveY(cardView.transform, 8f, 1.5f, true);
        }

        private void OnEnable()
        {
            if(cardView != null)
                cardView.SetData(draftCard);
        }

        public void SetCardToEdit(CardSO card)
        {
            draftCard = card.CreateClone();
            cardView.SetData(draftCard);
            UpdateEditFields();
        }

        private void UpdateEditFields()
        {
            txtTitle.text = draftCard.Title;
            txtDescription.text = draftCard.Description;
            txtCost.text = draftCard.Cost.ToString();
            imgBorderPicker.SetSelection(draftCard.Border);
            imgArtPicker.SetSelection(draftCard.Art);
            cardTypeDropdown.SetValueWithoutNotify((int)draftCard.Type);
            targeting.SetIsOnWithoutNotify(draftCard.IsTargeting);

            foreach (var btn in traitButtons)
            {
                btn.SetState(draftCard.Traits.Contains(btn.trait));
            }
        }

        private void PopulateTraitTypes()
        {
            foreach (var trait in TraitsDB.Instance.Traits)
            {
                TraitButton btn = Instantiate(traitButtonPrefab, traitsContainer);
                btn.SetTraitData(trait);
                traitButtons.Add(btn);
            }
        }

        private void PopulateCardTypes()
        {
            cardTypeDropdown.options.Clear();
            cardTypeDropdown.AddOptions(Enum.GetNames(typeof(CardType)).ToList());
        }

        private void OnTraitStateChange(CardAddition trait, bool isEnabled)
        {
            if (isEnabled)
            {
                if (!draftCard.Traits.Contains(trait))
                {
                    draftCard.Traits.Add(trait);
                }
            }
            else
            {
                if (draftCard.Traits.Contains(trait))
                {
                    draftCard.Traits.Remove(trait);
                }
            }
        }

        private void ImgArt_OnImageSelect(Sprite sprite)
        {
            draftCard.Art = sprite;
            cardView.SetData(draftCard);
        }

        private void ImgBorder_OnImageSelect(Sprite sprite)
        {
            draftCard.Border = sprite;
            cardView.SetData(draftCard);
        }

        private void UpdateCardType(int cardTypeIdx)
        {
            draftCard.Type = (CardType)cardTypeIdx;
            cardView.SetData(draftCard);
        }

        private void UpdateTargeting(bool arg0)
        {
            draftCard.IsTargeting = targeting.isOn;
            cardView.SetData(draftCard);
        }

        public void UpdateTitle(String title)
        {
            draftCard.Title = title;
            cardView.SetData(draftCard);
        }
        public void UpdateDescription(String desc)
        {
            draftCard.Description = desc;
            cardView.SetData(draftCard);
        }
        public void UpdateCost(String cost)
        {
            draftCard.Cost = cost; ;
            cardView.SetData(draftCard);
        }

        public void SaveCardSO()
        {
            // Ensure directory exists
            if (!Directory.Exists(Settings.Instance.saveFolderPath))
            {
                Directory.CreateDirectory(Settings.Instance.saveFolderPath);
            }

            // Define the full path
            string filename = "card_" + draftCard.Title.ToLower().Replace(" ", "_");
            string fullPath = Settings.Instance.saveFolderPath + filename + ".asset";


            // Save the asset
#if UNITY_EDITOR
            // check if card file already exist
            if (UnityEditor.AssetDatabase.FindAssets(filename).Length > 0)
            {
                // filename = filename + 
                YesNoDialog.Instance.Show("+1 gogogo?", SaveCardToFile);
            }
            else
            {
                SaveCardToFile(true);
            }
#endif

        }

        private void SaveCardToFile(bool isSaveApproved)
        {
            if(!isSaveApproved) { return; }

#if UNITY_EDITOR
            // Define the full path
            string filename = "card_" + draftCard.Title.ToLower().Replace(" ", "_");
            string fullPath = Settings.Instance.saveFolderPath + filename + ".asset";

            // string uniquePath = UnityEditor.AssetDatabase.GenerateUniqueAssetPath(fullPath);

            UnityEditor.AssetDatabase.CreateAsset(draftCard, fullPath);
            UnityEditor.AssetDatabase.SaveAssets();
            UnityEditor.AssetDatabase.Refresh();
            Debug.Log("ScriptableObject saved: " + fullPath);

            CardSO card = CardsDB.Instance.Cards.FirstOrDefault(card => card != null && card.Title == draftCard.Title);
            int idx = 0;
            if (card != null)
            {
                idx = CardsDB.Instance.Cards.IndexOf(card);
                CardsDB.Instance.Cards.Remove(card);
            }
            CardsDB.Instance.Cards.Insert(idx, draftCard);

            draftCard = draftCard.CreateClone();
#endif

        }

    }
}
