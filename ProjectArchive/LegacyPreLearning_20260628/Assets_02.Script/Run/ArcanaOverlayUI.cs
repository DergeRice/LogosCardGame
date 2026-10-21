using UnityEngine;
using UnityEngine.UI;

public class ArcanaOverlayUI : MonoBehaviour
{
    public static ArcanaOverlayUI Instance { get; private set; }

    private Canvas _canvas;
    private Button _skip;

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

    private void Update()
    {
        bool active = ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive;
        if (_canvas != null) _canvas.enabled = active;
    }

    private void Build()
    {
        var canvasGo = new GameObject("ArcanaOverlayCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        var btnGo = new GameObject("SkipButton");
        btnGo.transform.SetParent(canvasGo.transform);
        var rt = btnGo.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(1f, 0f);
        rt.anchorMax = new Vector2(1f, 0f);
        rt.pivot = new Vector2(1f, 0f);
        rt.anchoredPosition = new Vector2(-40f, 40f);
        rt.sizeDelta = new Vector2(160f, 70f);

        var img = btnGo.AddComponent<Image>();
        img.color = new Color(0.15f, 0.15f, 0.15f, 0.85f);

        _skip = btnGo.AddComponent<Button>();
        _skip.onClick.AddListener(() =>
        {
            if (GamePlayManager.instance != null)
            {
                GamePlayManager.instance.TrySkipArcana();
            }
        });

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(btnGo.transform);
        var trt = textGo.AddComponent<RectTransform>();
        trt.anchorMin = Vector2.zero;
        trt.anchorMax = Vector2.one;
        trt.offsetMin = Vector2.zero;
        trt.offsetMax = Vector2.zero;

        var txt = textGo.AddComponent<TMPro.TextMeshProUGUI>();
        txt.text = "Skip";
        txt.alignment = TMPro.TextAlignmentOptions.Center;
        txt.fontSize = 32;
        txt.color = Color.white;

        _canvas.enabled = false;
    }
}
