using TMPro;
using System;
using UnityEngine;
using UnityEngine.UI;

public class LearningBlankSlotView : MonoBehaviour
{
    [SerializeField] private Button button;
    [SerializeField] private TMP_Text label;
    [SerializeField] private Image background;
    [SerializeField] private Color normalColor = new Color(0.18f, 0.18f, 0.18f, 1f);
    [SerializeField] private Color selectedColor = new Color(0.25f, 0.45f, 0.95f, 1f);

    private LearningRoundController _controller;
    private int _blankIndex;

    public event Action<int> BlankClicked;

    public void Init(LearningRoundController controller, int blankIndex)
    {
        _controller = controller;
        _blankIndex = blankIndex;

        if (button == null) button = GetComponent<Button>();
        if (button != null)
        {
            button.transition = Selectable.Transition.None;
            button.onClick.RemoveListener(OnClick);
            button.onClick.AddListener(OnClick);
        }

        SetText("____");
        SetSelected(false);
    }

    public void SetText(string text)
    {
        if (label == null) label = GetComponentInChildren<TMP_Text>();
        if (label != null) label.text = string.IsNullOrWhiteSpace(text) ? "____" : text;
    }

    public void SetSelected(bool selected)
    {
        if (background == null) background = GetComponent<Image>();
        if (background != null) background.color = selected ? selectedColor : normalColor;
    }

    private void OnClick()
    {
        if (_controller == null) return;
        _controller.SelectBlank(_blankIndex);
        BlankClicked?.Invoke(_blankIndex);
    }
}
