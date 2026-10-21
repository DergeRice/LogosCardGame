using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningLoadingOverlay : MonoBehaviour
{
    [SerializeField] private CanvasGroup canvasGroup;
    [SerializeField] private Slider progressSlider;
    [SerializeField] private TMP_Text progressText;

    public static LearningLoadingOverlay CreateDefault()
    {
        var root = new GameObject("LearningLoadingOverlay");
        DontDestroyOnLoad(root);

        var canvas = root.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 5000;
        var scaler = root.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = .5f;
        root.AddComponent<GraphicRaycaster>();

        var group = root.AddComponent<CanvasGroup>();
        var image = root.AddComponent<Image>();
        image.color = new Color(.965f, .953f, .922f, 1f);

        var labelGo = new GameObject("ProgressText");
        labelGo.transform.SetParent(root.transform, false);
        var labelRt = labelGo.AddComponent<RectTransform>();
        labelRt.anchorMin = new Vector2(0.15f, 0.48f);
        labelRt.anchorMax = new Vector2(0.85f, 0.58f);
        labelRt.offsetMin = Vector2.zero;
        labelRt.offsetMax = Vector2.zero;
        var label = labelGo.AddComponent<TextMeshProUGUI>();
        label.alignment = TextAlignmentOptions.Center;
        label.font = LearningFontProvider.DefaultFont;
        label.fontSize = 40;
        label.color = new Color(.137f, .235f, .298f);
        label.text = "다음 장을 펼치는 중";

        var sliderGo = new GameObject("ProgressSlider");
        sliderGo.transform.SetParent(root.transform, false);
        var sliderRt = sliderGo.AddComponent<RectTransform>();
        sliderRt.anchorMin = new Vector2(0.18f, 0.42f);
        sliderRt.anchorMax = new Vector2(0.82f, 0.45f);
        sliderRt.offsetMin = Vector2.zero;
        sliderRt.offsetMax = Vector2.zero;
        var slider = sliderGo.AddComponent<Slider>();
        slider.minValue = 0;
        slider.maxValue = 1;
        slider.interactable = false;
        sliderGo.AddComponent<Image>().color = new Color(.86f, .91f, .87f);
        var fill = new GameObject("Fill", typeof(RectTransform), typeof(Image));
        fill.transform.SetParent(sliderRt, false);
        var fillRt = (RectTransform)fill.transform;
        fillRt.anchorMin = Vector2.zero; fillRt.anchorMax = Vector2.one;
        fillRt.offsetMin = fillRt.offsetMax = Vector2.zero;
        fill.GetComponent<Image>().color = new Color(.21f, .49f, .45f);
        slider.fillRect = fillRt;

        var overlay = root.AddComponent<LearningLoadingOverlay>();
        overlay.canvasGroup = group;
        overlay.progressSlider = slider;
        overlay.progressText = label;
        overlay.SetProgress(0f);
        return overlay;
    }

    public void SetProgress(float progress)
    {
        progress = Mathf.Clamp01(progress);
        if (progressSlider != null) progressSlider.value = progress;
        if (progressText != null) progressText.text = $"다음 장을 펼치는 중\n<size=26>{Mathf.RoundToInt(progress * 100f)}%</size>";
    }
}
