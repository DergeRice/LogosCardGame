using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class AudioSettingsRuntimeUI : MonoBehaviour
{
    public static AudioSettingsRuntimeUI Instance { get; private set; }

    private Canvas _canvas;
    private GameObject _panel;

    private Slider _master;
    private Slider _sfx;
    private Slider _bgm;

    private TextMeshProUGUI _masterLabel;
    private TextMeshProUGUI _sfxLabel;
    private TextMeshProUGUI _bgmLabel;

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

    public void Toggle()
    {
        if (_panel == null) return;
        bool next = !_panel.activeSelf;
        if (next) SyncFromPrefs();
        _panel.SetActive(next);
    }

    private void Build()
    {
        var canvasGo = new GameObject("AudioSettingsCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        _panel = new GameObject("AudioSettingsPanel");
        _panel.transform.SetParent(canvasGo.transform);
        var prt = _panel.AddComponent<RectTransform>();
        prt.anchorMin = new Vector2(0.5f, 0.5f);
        prt.anchorMax = new Vector2(0.5f, 0.5f);
        prt.pivot = new Vector2(0.5f, 0.5f);
        prt.sizeDelta = new Vector2(760f, 420f);
        prt.anchoredPosition = Vector2.zero;

        var bg = _panel.AddComponent<Image>();
        bg.color = new Color(0f, 0f, 0f, 0.85f);

        AddText(_panel.transform, "Title", "Settings (Audio)", new Vector2(0f, 160f), 34, TextAlignmentOptions.Center);

        AddButton(_panel.transform, "Close", new Vector2(290f, 160f), () => _panel.SetActive(false));

        _masterLabel = AddText(_panel.transform, "MasterLabel", "Master", new Vector2(-260f, 70f), 26, TextAlignmentOptions.Left);
        _master = AddSlider(_panel.transform, new Vector2(40f, 70f), OnMasterChanged);

        _sfxLabel = AddText(_panel.transform, "SfxLabel", "SFX", new Vector2(-260f, 10f), 26, TextAlignmentOptions.Left);
        _sfx = AddSlider(_panel.transform, new Vector2(40f, 10f), OnSfxChanged);

        _bgmLabel = AddText(_panel.transform, "BgmLabel", "BGM", new Vector2(-260f, -50f), 26, TextAlignmentOptions.Left);
        _bgm = AddSlider(_panel.transform, new Vector2(40f, -50f), OnBgmChanged);

        _panel.SetActive(false);
        SyncFromPrefs();
    }

    private void SyncFromPrefs()
    {
        if (_master != null) _master.value = AudioSettingsData.Master;
        if (_sfx != null) _sfx.value = AudioSettingsData.Sfx;
        if (_bgm != null) _bgm.value = AudioSettingsData.Bgm;
        RefreshLabels();
    }

    private void RefreshLabels()
    {
        if (_masterLabel != null) _masterLabel.text = $"Master  {AudioSettingsData.Master:0.00}";
        if (_sfxLabel != null) _sfxLabel.text = $"SFX  {AudioSettingsData.Sfx:0.00}";
        if (_bgmLabel != null) _bgmLabel.text = $"BGM  {AudioSettingsData.Bgm:0.00}";
    }

    private void OnMasterChanged(float v)
    {
        AudioSettingsData.Master = v;
        RefreshLabels();
        if (AudioManager.Instance != null) AudioManager.Instance.ApplyVolumes();
    }

    private void OnSfxChanged(float v)
    {
        AudioSettingsData.Sfx = v;
        RefreshLabels();
        if (AudioManager.Instance != null) AudioManager.Instance.ApplyVolumes();
    }

    private void OnBgmChanged(float v)
    {
        AudioSettingsData.Bgm = v;
        RefreshLabels();
        if (AudioManager.Instance != null) AudioManager.Instance.ApplyVolumes();
    }

    private static TextMeshProUGUI AddText(Transform parent, string name, string text, Vector2 anchoredPos, float fontSize, TextAlignmentOptions align)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent);

        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(700f, 44f);
        rt.anchoredPosition = anchoredPos;

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = fontSize;
        tmp.alignment = align;
        tmp.color = Color.white;
        return tmp;
    }

    private static Slider AddSlider(Transform parent, Vector2 anchoredPos, UnityEngine.Events.UnityAction<float> onChanged)
    {
        var go = new GameObject("Slider");
        go.transform.SetParent(parent);
        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(520f, 26f);
        rt.anchoredPosition = anchoredPos;

        var bg = go.AddComponent<Image>();
        bg.color = new Color(0.15f, 0.15f, 0.15f, 0.95f);

        var slider = go.AddComponent<Slider>();
        slider.minValue = 0f;
        slider.maxValue = 1f;
        slider.wholeNumbers = false;

        // Fill
        var fillArea = new GameObject("FillArea");
        fillArea.transform.SetParent(go.transform);
        var fart = fillArea.AddComponent<RectTransform>();
        fart.anchorMin = new Vector2(0f, 0f);
        fart.anchorMax = new Vector2(1f, 1f);
        fart.offsetMin = new Vector2(10f, 6f);
        fart.offsetMax = new Vector2(-10f, -6f);

        var fill = new GameObject("Fill");
        fill.transform.SetParent(fillArea.transform);
        var frt = fill.AddComponent<RectTransform>();
        frt.anchorMin = new Vector2(0f, 0f);
        frt.anchorMax = new Vector2(1f, 1f);
        frt.offsetMin = Vector2.zero;
        frt.offsetMax = Vector2.zero;
        var fimg = fill.AddComponent<Image>();
        fimg.color = new Color(0.35f, 0.9f, 0.55f, 0.95f);

        slider.fillRect = frt;

        // Handle
        var handle = new GameObject("Handle");
        handle.transform.SetParent(go.transform);
        var hrt = handle.AddComponent<RectTransform>();
        hrt.sizeDelta = new Vector2(22f, 34f);
        var himg = handle.AddComponent<Image>();
        himg.color = new Color(0.95f, 0.95f, 0.95f, 0.95f);

        slider.targetGraphic = himg;
        slider.handleRect = hrt;

        slider.onValueChanged.AddListener(onChanged);
        return slider;
    }

    private static void AddButton(Transform parent, string text, Vector2 anchoredPos, UnityEngine.Events.UnityAction onClick)
    {
        var btnGo = new GameObject(text);
        btnGo.transform.SetParent(parent);
        var rt = btnGo.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(160f, 52f);
        rt.anchoredPosition = anchoredPos;

        var img = btnGo.AddComponent<Image>();
        img.color = new Color(0.2f, 0.2f, 0.2f, 0.95f);

        var btn = btnGo.AddComponent<Button>();
        btn.onClick.AddListener(onClick);

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(btnGo.transform);
        var trt = textGo.AddComponent<RectTransform>();
        trt.anchorMin = Vector2.zero;
        trt.anchorMax = Vector2.one;
        trt.offsetMin = Vector2.zero;
        trt.offsetMax = Vector2.zero;

        var txt = textGo.AddComponent<TextMeshProUGUI>();
        txt.text = text;
        txt.alignment = TextAlignmentOptions.Center;
        txt.fontSize = 26;
        txt.color = Color.white;
    }
}

