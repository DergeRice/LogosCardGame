using TMPro;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Slider))]
public sealed class LearningRemasterSliderValue : MonoBehaviour
{
    public TMP_Text valueText;
    public bool percentage;
    private Slider slider;
    private void OnEnable()
    {
        slider = GetComponent<Slider>();
        slider.onValueChanged.AddListener(Refresh);
        Refresh(slider.value);
    }
    private void Start() { Refresh(slider.value); }
    private void OnDisable() { if (slider != null) slider.onValueChanged.RemoveListener(Refresh); }
    private void Refresh(float value)
    {
        if (valueText != null) valueText.text = percentage ? $"{Mathf.RoundToInt(value * 100)}%" : Mathf.RoundToInt(value).ToString("00");
    }
}
