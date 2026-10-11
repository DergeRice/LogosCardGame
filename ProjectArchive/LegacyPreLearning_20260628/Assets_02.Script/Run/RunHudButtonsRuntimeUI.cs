using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class RunHudButtonsRuntimeUI : MonoBehaviour
{
    public static RunHudButtonsRuntimeUI Instance { get; private set; }

    private Canvas _canvas;
    private Button _items;
    private Button _settings;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
        Build();
    }

    private void Build()
    {
        var canvasGo = new GameObject("RunHudButtonsCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        var btnGo = new GameObject("ItemsButton");
        btnGo.transform.SetParent(canvasGo.transform);
        var rt = btnGo.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0f, 0f);
        rt.anchorMax = new Vector2(0f, 0f);
        rt.pivot = new Vector2(0f, 0f);
        rt.anchoredPosition = new Vector2(30f, 30f);
        rt.sizeDelta = new Vector2(180f, 64f);

        var img = btnGo.AddComponent<Image>();
        img.color = new Color(0.15f, 0.15f, 0.15f, 0.85f);

        _items = btnGo.AddComponent<Button>();
        _items.onClick.AddListener(() =>
        {
            if (RunInventoryRuntimeUI.Instance == null)
            {
                var go = new GameObject("RunInventoryRuntimeUI");
                go.AddComponent<RunInventoryRuntimeUI>();
            }
            RunInventoryRuntimeUI.Instance.Toggle();
        });

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(btnGo.transform);
        var trt = textGo.AddComponent<RectTransform>();
        trt.anchorMin = Vector2.zero;
        trt.anchorMax = Vector2.one;
        trt.offsetMin = Vector2.zero;
        trt.offsetMax = Vector2.zero;

        var txt = textGo.AddComponent<TextMeshProUGUI>();
        txt.text = "Items";
        txt.alignment = TMPro.TextAlignmentOptions.Center;
        txt.fontSize = 30;
        txt.color = Color.white;

        // Settings button above Items
        var sbtnGo = new GameObject("SettingsButton");
        sbtnGo.transform.SetParent(canvasGo.transform);
        var srt = sbtnGo.AddComponent<RectTransform>();
        srt.anchorMin = new Vector2(0f, 0f);
        srt.anchorMax = new Vector2(0f, 0f);
        srt.pivot = new Vector2(0f, 0f);
        srt.anchoredPosition = new Vector2(30f, 104f);
        srt.sizeDelta = new Vector2(180f, 64f);

        var simg = sbtnGo.AddComponent<Image>();
        simg.color = new Color(0.15f, 0.15f, 0.15f, 0.85f);

        _settings = sbtnGo.AddComponent<Button>();
        _settings.onClick.AddListener(() =>
        {
            if (AudioSettingsRuntimeUI.Instance == null)
            {
                var go = new GameObject("AudioSettingsRuntimeUI");
                go.AddComponent<AudioSettingsRuntimeUI>();
            }
            AudioSettingsRuntimeUI.Instance.Toggle();
        });

        var stextGo = new GameObject("Text");
        stextGo.transform.SetParent(sbtnGo.transform);
        var strt = stextGo.AddComponent<RectTransform>();
        strt.anchorMin = Vector2.zero;
        strt.anchorMax = Vector2.one;
        strt.offsetMin = Vector2.zero;
        strt.offsetMax = Vector2.zero;

        var stxt = stextGo.AddComponent<TextMeshProUGUI>();
        stxt.text = "Settings";
        stxt.alignment = TMPro.TextAlignmentOptions.Center;
        stxt.fontSize = 28;
        stxt.color = Color.white;
    }
}
