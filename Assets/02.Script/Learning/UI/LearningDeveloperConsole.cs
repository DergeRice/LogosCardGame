using System.Collections.Generic;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class LearningDeveloperConsole : MonoBehaviour
{
    private LearningExplorationSentenceController explorationController;
    private LearningItemInventory inventory;
    private Canvas canvas;
    private TMP_FontAsset fontAsset;
    private GameObject panel;
    private TMP_InputField inputField;
    private TMP_Text outputText;

    public void Configure(Canvas targetCanvas, LearningExplorationSentenceController targetController, LearningItemInventory targetInventory, TMP_FontAsset targetFontAsset = null)
    {
        canvas = targetCanvas;
        explorationController = targetController;
        inventory = targetInventory;
        if (targetFontAsset != null) fontAsset = targetFontAsset;
        BuildIfNeeded();
    }

    private void Awake()
    {
        if (fontAsset == null) fontAsset = LearningFontProvider.DefaultFont;
    }

    private void Start()
    {
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationSentenceController>();
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        BuildIfNeeded();
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.BackQuote))
        {
            Toggle();
        }
    }

    public void Toggle()
    {
        BuildIfNeeded();
        if (panel == null) return;
        bool next = !panel.activeSelf;
        panel.SetActive(next);
        if (next && inputField != null)
        {
            inputField.ActivateInputField();
            inputField.Select();
        }
    }

    public void ExecuteCommand(string rawCommand)
    {
        string command = (rawCommand ?? string.Empty).Trim();
        if (inputField != null) inputField.text = string.Empty;
        if (string.IsNullOrWhiteSpace(command)) return;

        string result;
        try
        {
            result = Execute(command);
        }
        catch (System.Exception ex)
        {
            result = "ERROR: " + ex.Message;
        }

        Log("> " + command + "\n" + result);
        if (inputField != null)
        {
            inputField.ActivateInputField();
            inputField.Select();
        }
    }

    private string Execute(string command)
    {
        string[] args = command.Split(new[] { ' ' }, System.StringSplitOptions.RemoveEmptyEntries);
        if (args.Length == 0) return string.Empty;

        string op = args[0].ToLowerInvariant();
        switch (op)
        {
            case "help":
            case "?":
                return BuildHelp();
            case "close":
            case "hide":
                if (panel != null) panel.SetActive(false);
                return "콘솔 닫기";
            case "kill":
            case "cheatkill":
                return CheatKill();
            case "coin":
            case "gold":
                return CheatCoin(args);
            case "item":
            case "giveitem":
                return CheatItem(args);
            case "items":
            case "listitems":
                return ListItems(args);
            case "clearitems":
                return ClearItems();
            case "slots":
            case "itemslots":
                return SetSlots(args);
            default:
                return $"알 수 없는 명령어: {args[0]}\nhelp 입력하면 목록 나옴.";
        }
    }

    private string CheatKill()
    {
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationSentenceController>();
        if (explorationController == null) return "탐험 컨트롤러 없음.";
        explorationController.DefeatBlindCheat();
        return "현재 블라인드 치트킬 실행.";
    }

    private string CheatCoin(string[] args)
    {
        if (args.Length < 2) return $"현재 코인: {LearningExplorationRunState.Coin}\n사용: coin 100 / coin set 100";

        if (args[1].Equals("set", System.StringComparison.OrdinalIgnoreCase))
        {
            if (args.Length < 3 || !int.TryParse(args[2], out int setAmount)) return "사용: coin set 100";
            LearningExplorationRunState.SetCoin(setAmount);
            NotifyStateChanged("치트: 코인 설정 " + setAmount);
            return "코인 = " + LearningExplorationRunState.Coin;
        }

        if (!int.TryParse(args[1], out int amount)) return "사용: coin 100 / coin set 100";
        LearningExplorationRunState.AddCoin(amount);
        NotifyStateChanged("치트: 코인 +" + amount);
        return "코인 = " + LearningExplorationRunState.Coin;
    }

    private string CheatItem(string[] args)
    {
        if (args.Length < 2) return "사용: item item_id";
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (inventory == null) return "아이템 인벤토리 없음.";

        string itemId = args[1];
        LearningItemRecord record = FindItemRecord(itemId, out string findMessage);
        if (record == null) return findMessage;

        LearningItemDefinition item = LearningItemFactory.CreateRuntimeDefinition(record);
        if (!inventory.TryAdd(item)) return "아이템 지급 실패. 슬롯이 꽉 찼을 수 있음.";

        NotifyStateChanged("치트: 아이템 획득 " + item.displayName);
        return $"아이템 지급: [{item.rarity}] {item.displayName} ({item.itemId})";
    }

    private LearningItemRecord FindItemRecord(string query, out string message)
    {
        message = string.Empty;
        LearningItemRecord exact = LearningItemDatabase.GetItemById(LearningModeType.Exploration, query);
        if (exact != null) return exact;

        string lowerQuery = (query ?? string.Empty).ToLowerInvariant();
        IReadOnlyList<LearningItemRecord> items = LearningItemDatabase.GetItems(LearningModeType.Exploration);
        var matches = new List<LearningItemRecord>();
        for (int i = 0; i < items.Count; i++)
        {
            LearningItemRecord item = items[i];
            if (item == null) continue;
            string id = item.itemId ?? string.Empty;
            string name = item.displayName ?? string.Empty;
            if (id.ToLowerInvariant().Contains(lowerQuery) || name.ToLowerInvariant().Contains(lowerQuery))
            {
                matches.Add(item);
            }
        }

        if (matches.Count == 1) return matches[0];
        if (matches.Count <= 0)
        {
            message = "아이템 없음: " + query;
            return null;
        }

        var builder = new StringBuilder();
        builder.AppendLine("여러 개 매칭됨. 더 정확히 입력:");
        for (int i = 0; i < Mathf.Min(12, matches.Count); i++)
        {
            builder.Append(matches[i].itemId).Append(" - ").AppendLine(matches[i].displayName);
        }
        message = builder.ToString();
        return null;
    }

    private string ListItems(string[] args)
    {
        string filter = args.Length >= 2 ? args[1].ToLowerInvariant() : string.Empty;
        IReadOnlyList<LearningItemRecord> items = LearningItemDatabase.GetItems(LearningModeType.Exploration);
        var builder = new StringBuilder();
        int shown = 0;
        for (int i = 0; i < items.Count; i++)
        {
            LearningItemRecord item = items[i];
            if (item == null) continue;
            string id = item.itemId ?? string.Empty;
            string name = item.displayName ?? string.Empty;
            if (!string.IsNullOrEmpty(filter) &&
                !id.ToLowerInvariant().Contains(filter) &&
                !name.ToLowerInvariant().Contains(filter))
            {
                continue;
            }

            builder.Append('[').Append(item.rarity).Append("] ").Append(id).Append(" - ").AppendLine(name);
            shown++;
            if (shown >= 40)
            {
                builder.AppendLine("... 너무 많음. items 검색어 로 좁혀라.");
                break;
            }
        }

        return shown > 0 ? builder.ToString() : "검색된 아이템 없음.";
    }

    private string ClearItems()
    {
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (inventory == null) return "아이템 인벤토리 없음.";
        inventory.Clear();
        NotifyStateChanged("치트: 아이템 비우기");
        return "아이템 인벤토리 비움.";
    }

    private string SetSlots(string[] args)
    {
        if (args.Length < 2 || !int.TryParse(args[1], out int slots)) return $"현재 슬롯: {LearningExplorationRunState.ItemSlots}\n사용: slots 5";
        LearningExplorationRunState.SetItemSlots(slots);
        if (inventory == null) inventory = FindFirstObjectByType<LearningItemInventory>();
        if (inventory != null) inventory.SetMaxSlots(LearningExplorationRunState.ItemSlots);
        NotifyStateChanged("치트: 아이템 슬롯 " + LearningExplorationRunState.ItemSlots);
        return "아이템 슬롯 = " + LearningExplorationRunState.ItemSlots;
    }

    private void NotifyStateChanged(string message)
    {
        if (explorationController == null) explorationController = FindFirstObjectByType<LearningExplorationSentenceController>();
        explorationController?.RefreshFromCheat(message);
    }

    private string BuildHelp()
    {
        return "명령어\n" +
               "kill : 현재 블라인드 즉시 처치\n" +
               "coin 100 / gold 100 : 코인 추가\n" +
               "coin set 100 : 코인 설정\n" +
               "items [검색어] : 아이템 id 목록\n" +
               "item item_id : 아이템 지급\n" +
               "clearitems : 아이템 비우기\n" +
               "slots 2~5 : 아이템 슬롯 변경\n" +
               "close : 콘솔 닫기";
    }

    private void Log(string message)
    {
        if (outputText == null) return;
        outputText.text = message + "\n\n" + outputText.text;
    }

    private void BuildIfNeeded()
    {
        if (panel != null || canvas == null) return;
        EnsureEventSystem();

        panel = new GameObject("DeveloperConsolePanel");
        panel.transform.SetParent(canvas.transform, false);
        RectTransform panelRect = panel.AddComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.04f, 0.62f);
        panelRect.anchorMax = new Vector2(0.96f, 0.96f);
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;
        Image panelImage = panel.AddComponent<Image>();
        panelImage.color = new Color(0.025f, 0.03f, 0.045f, 0.92f);

        GameObject inputGo = new GameObject("CommandInput");
        inputGo.transform.SetParent(panel.transform, false);
        RectTransform inputRect = inputGo.AddComponent<RectTransform>();
        inputRect.anchorMin = new Vector2(0.03f, 0.78f);
        inputRect.anchorMax = new Vector2(0.97f, 0.94f);
        inputRect.offsetMin = Vector2.zero;
        inputRect.offsetMax = Vector2.zero;
        Image inputImage = inputGo.AddComponent<Image>();
        inputImage.color = new Color(1f, 1f, 1f, 0.12f);
        inputField = inputGo.AddComponent<TMP_InputField>();
        inputField.textViewport = inputRect;
        inputField.lineType = TMP_InputField.LineType.SingleLine;
        inputField.onSubmit.AddListener(ExecuteCommand);

        TextMeshProUGUI inputText = CreateText(inputGo.transform, "Text", string.Empty, 26f, TextAlignmentOptions.Left);
        inputText.rectTransform.anchorMin = Vector2.zero;
        inputText.rectTransform.anchorMax = Vector2.one;
        inputText.rectTransform.offsetMin = new Vector2(18f, 2f);
        inputText.rectTransform.offsetMax = new Vector2(-18f, -2f);
        inputField.textComponent = inputText;

        TextMeshProUGUI placeholder = CreateText(inputGo.transform, "Placeholder", "help / kill / coin 100 / item item_id", 24f, TextAlignmentOptions.Left);
        placeholder.color = new Color(1f, 1f, 1f, 0.38f);
        placeholder.rectTransform.anchorMin = Vector2.zero;
        placeholder.rectTransform.anchorMax = Vector2.one;
        placeholder.rectTransform.offsetMin = new Vector2(18f, 2f);
        placeholder.rectTransform.offsetMax = new Vector2(-18f, -2f);
        inputField.placeholder = placeholder;

        outputText = CreateText(panel.transform, "Output", BuildHelp(), 22f, TextAlignmentOptions.TopLeft);
        outputText.rectTransform.anchorMin = new Vector2(0.03f, 0.05f);
        outputText.rectTransform.anchorMax = new Vector2(0.97f, 0.74f);
        outputText.rectTransform.offsetMin = Vector2.zero;
        outputText.rectTransform.offsetMax = Vector2.zero;
        outputText.enableWordWrapping = true;

        panel.SetActive(false);
    }

    private TextMeshProUGUI CreateText(Transform parent, string name, string text, float size, TextAlignmentOptions alignment)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        TextMeshProUGUI label = go.AddComponent<TextMeshProUGUI>();
        label.font = fontAsset;
        label.text = text;
        label.fontSize = size;
        label.color = Color.white;
        label.alignment = alignment;
        return label;
    }

    private static void EnsureEventSystem()
    {
        if (FindFirstObjectByType<EventSystem>() != null) return;
        GameObject go = new GameObject("EventSystem");
        go.AddComponent<EventSystem>();
        go.AddComponent<StandaloneInputModule>();
    }
}
