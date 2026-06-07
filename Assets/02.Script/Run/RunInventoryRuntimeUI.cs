using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class RunInventoryRuntimeUI : MonoBehaviour
{
    public static RunInventoryRuntimeUI Instance { get; private set; }

    private Canvas _canvas;
    private GameObject _panel;
    private TextMeshProUGUI _header;
    private RectTransform _listRoot;

    private readonly List<GameObject> _rows = new List<GameObject>();

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
        if (next) Refresh();
        _panel.SetActive(next);
    }

    public void Open()
    {
        if (_panel == null) return;
        Refresh();
        _panel.SetActive(true);
    }

    public void Close()
    {
        if (_panel == null) return;
        _panel.SetActive(false);
    }

    private void Build()
    {
        var canvasGo = new GameObject("RunInventoryCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        _panel = new GameObject("RunInventoryPanel");
        _panel.transform.SetParent(canvasGo.transform);
        var prt = _panel.AddComponent<RectTransform>();
        prt.anchorMin = new Vector2(0.5f, 0.5f);
        prt.anchorMax = new Vector2(0.5f, 0.5f);
        prt.pivot = new Vector2(0.5f, 0.5f);
        prt.sizeDelta = new Vector2(920f, 560f);
        prt.anchoredPosition = Vector2.zero;

        var bg = _panel.AddComponent<Image>();
        bg.color = new Color(0f, 0f, 0f, 0.85f);

        _header = AddText("Header", new Vector2(0f, 240f), 30, TextAlignmentOptions.Center);
        _header.text = "Inventory";

        AddButton("Close", new Vector2(370f, 240f), () => Close(), out _);
        AddButton("Reset Run", new Vector2(170f, 240f), () =>
        {
            if (RunContext.Instance != null)
            {
                RunContext.Instance.ResetRun();
            }
            Refresh();
        }, out _);

        var listGo = new GameObject("List");
        listGo.transform.SetParent(_panel.transform);
        _listRoot = listGo.AddComponent<RectTransform>();
        _listRoot.anchorMin = new Vector2(0.5f, 0.5f);
        _listRoot.anchorMax = new Vector2(0.5f, 0.5f);
        _listRoot.pivot = new Vector2(0.5f, 0.5f);
        _listRoot.sizeDelta = new Vector2(880f, 440f);
        _listRoot.anchoredPosition = new Vector2(0f, -20f);

        _panel.SetActive(false);
    }

    private void Refresh()
    {
        if (RunContext.Instance == null) return;

        for (int i = 0; i < _rows.Count; i++)
        {
            if (_rows[i] != null) Destroy(_rows[i]);
        }
        _rows.Clear();

        int coins = RunContext.Instance.State.coins;
        _header.text = $"Inventory  |  Coins: {coins}";

        // Consumables
        AddSectionLabel("Arcana (Consumables)", 0);
        var ids = RunContext.Instance.GetConsumableIds();
        int row = 1;
        for (int i = 0; i < ids.Count; i++)
        {
            int capturedIndex = i;
            string id = ids[i];
            var def = ConsumableRegistry.GetById(id);
            string title = def != null && !string.IsNullOrWhiteSpace(def.title) ? def.title : id;
            string desc = def != null ? def.description : string.Empty;

            AddRow(row++, $"{title}  [{id}]", desc, "Use", () =>
            {
                if (RunContext.Instance == null) return;
                if (ArcanaSelectionMode.Instance != null && ArcanaSelectionMode.Instance.IsActive) return;
                RunContext.Instance.TryUseConsumableAt(capturedIndex);
                Close();
            });
        }

        // Equipments
        row += 1;
        AddSectionLabel("Equipments (Jokers)", row++);
        foreach (var (inst, def) in RunContext.Instance.EnumerateEquipments())
        {
            string title = def != null && !string.IsNullOrWhiteSpace(def.title) ? def.title : inst.equipmentId;
            string suffix = def != null && def.kind == EquipmentKind.StackMultiplierOnSubmit ? $" (stacks {inst.stacks})"
                : def != null && def.kind == EquipmentKind.ShopFreeRerollsConsumable ? $" (free {inst.stacks})"
                : string.Empty;
            AddRow(row++, $"{title}{suffix}", def != null ? def.description : string.Empty, null, null);
        }
    }

    private void AddSectionLabel(string text, int rowIndex)
    {
        var go = new GameObject($"Section_{text}");
        go.transform.SetParent(_listRoot);
        _rows.Add(go);

        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0f, 1f);
        rt.anchorMax = new Vector2(1f, 1f);
        rt.pivot = new Vector2(0.5f, 1f);
        rt.sizeDelta = new Vector2(0f, 36f);
        rt.anchoredPosition = new Vector2(0f, -rowIndex * 44f);

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = 26;
        tmp.alignment = TextAlignmentOptions.Left;
        tmp.color = new Color(1f, 1f, 1f, 0.95f);
    }

    private void AddRow(int rowIndex, string title, string desc, string buttonText, UnityEngine.Events.UnityAction onClick)
    {
        var go = new GameObject($"Row_{rowIndex}");
        go.transform.SetParent(_listRoot);
        _rows.Add(go);

        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0f, 1f);
        rt.anchorMax = new Vector2(1f, 1f);
        rt.pivot = new Vector2(0.5f, 1f);
        rt.sizeDelta = new Vector2(0f, 40f);
        rt.anchoredPosition = new Vector2(0f, -rowIndex * 44f);

        var bg = go.AddComponent<Image>();
        bg.color = new Color(0.12f, 0.12f, 0.12f, 0.85f);

        var label = AddTextChild(go.transform, "Title", new Vector2(10f, 0f), new Vector2(0.7f, 1f));
        label.text = title;
        label.fontSize = 22;
        label.alignment = TextAlignmentOptions.Left;

        if (!string.IsNullOrWhiteSpace(buttonText) && onClick != null)
        {
            AddButton(buttonText, new Vector2(360f, 0f), onClick, out _).transform.SetParent(go.transform, worldPositionStays: false);
        }
    }

    private TextMeshProUGUI AddText(string name, Vector2 anchoredPos, float fontSize, TextAlignmentOptions align)
    {
        var go = new GameObject(name);
        go.transform.SetParent(_panel.transform);

        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(860f, 60f);
        rt.anchoredPosition = anchoredPos;

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = string.Empty;
        tmp.fontSize = fontSize;
        tmp.alignment = align;
        tmp.color = Color.white;
        return tmp;
    }

    private TextMeshProUGUI AddTextChild(Transform parent, string name, Vector2 padLeft, Vector2 anchorMax)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent);
        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = anchorMax;
        rt.offsetMin = new Vector2(padLeft.x, 0f);
        rt.offsetMax = Vector2.zero;

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = string.Empty;
        tmp.color = Color.white;
        return tmp;
    }

    private Button AddButton(string text, Vector2 anchoredPos, UnityEngine.Events.UnityAction onClick, out TextMeshProUGUI label)
    {
        var btnGo = new GameObject(text);

        var rt = btnGo.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(170f, 44f);
        rt.anchoredPosition = anchoredPos;

        var img = btnGo.AddComponent<Image>();
        img.color = new Color(0.2f, 0.2f, 0.2f, 0.95f);

        var btn = btnGo.AddComponent<Button>();
        btn.onClick.AddListener(onClick);

        var labelGo = new GameObject("Label");
        labelGo.transform.SetParent(btnGo.transform);
        var lrt = labelGo.AddComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero;
        lrt.anchorMax = Vector2.one;
        lrt.offsetMin = Vector2.zero;
        lrt.offsetMax = Vector2.zero;

        label = labelGo.AddComponent<TextMeshProUGUI>();
        label.text = text;
        label.fontSize = 22;
        label.alignment = TextAlignmentOptions.Center;
        label.color = Color.white;

        return btn;
    }
}
