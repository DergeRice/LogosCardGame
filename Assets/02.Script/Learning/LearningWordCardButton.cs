using TMPro;
using System;
using UnityEngine;
using UnityEngine.UI;

public class LearningWordCardButton : MonoBehaviour
{
    [SerializeField] private Button button;
    [SerializeField] private TMP_Text wordLabel;
    [SerializeField] private TMP_Text posLabel;
    [SerializeField] private Image characterImage;
    [SerializeField] private Image symbolIcon;

    private LearningRoundController _controller;
    private PlacedWordCard _card;

    public event Action CardClicked;

    public void Init(LearningRoundController controller, PlacedWordCard card, Sprite characterSprite = null, Sprite symbolSprite = null)
    {
        _controller = controller;
        _card = card;

        if (button == null) button = GetComponent<Button>();
        if (button != null)
        {
            button.onClick.RemoveListener(OnClick);
            button.onClick.AddListener(OnClick);
        }

        if (wordLabel != null) wordLabel.text = card != null ? card.DisplayText : string.Empty;
        if (posLabel != null) posLabel.text = card != null ? card.PosLabel : string.Empty;
        if (characterImage != null) characterImage.sprite = characterSprite;
        if (symbolIcon != null) symbolIcon.sprite = symbolSprite;
    }

    private void OnClick()
    {
        if (_controller == null || _card == null) return;
        PlacedWordCard swapped = _controller.PlaceCard(_card);
        if (swapped != null)
        {
            _card = swapped;
            if (wordLabel != null) wordLabel.text = swapped.DisplayText;
            if (posLabel != null) posLabel.text = swapped.PosLabel;
        }
        else
        {
            gameObject.SetActive(false);
        }

        CardClicked?.Invoke();
    }
}
