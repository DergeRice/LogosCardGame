using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

/// <summary>Playable surface for the first automatic public-domain room-number corpus.</summary>
public class LogosLegacyRoomUI : MonoBehaviour
{
    private static readonly string[] RoomOrder = { "1", "2", "3", "4", "4-1", "4-2", "5", "6" };

    private Canvas canvas;
    private TMP_Text chapterText;
    private TMP_Text workText;
    private TMP_Text sentenceText;
    private TMP_Text statusText;
    private Button nextButton;
    private Button hintButton;
    private Button backspaceButton;
    private Button speakButton;
    private LogosSentenceSpeech speaker;
    private GameObject numberPadSurface;
    private GameObject cardPanel;
    private Transform cardContent;
    private GameObject readingPanel;
    private TMP_Text readingText;
    private GameObject successPanel;
    private readonly Dictionary<string, Button> roomButtons = new Dictionary<string, Button>();
    private readonly Dictionary<string, TMP_Text> roomLabels = new Dictionary<string, TMP_Text>();
    private readonly Dictionary<LogosLegacyRoomBlock, Button> cardButtons = new Dictionary<LogosLegacyRoomBlock, Button>();
    private readonly Dictionary<LogosLegacyRoomBlock, TMP_Text> slotLabels = new Dictionary<LogosLegacyRoomBlock, TMP_Text>();
    private readonly List<GameObject> cardCells = new List<GameObject>();
    private readonly Dictionary<LogosLegacyRoomBlock, string> placed = new Dictionary<LogosLegacyRoomBlock, string>();
    private readonly List<LogosLegacyRoomBlock> placementOrder = new List<LogosLegacyRoomBlock>();
    private LogosLegacyRoomSentence current;
    private LogosLegacyRoomSentence renderedSentence;
    private LogosLegacyRoomBlock selectedBlock;
    private string selectedRoom;
    private int stage = 1;
    private bool solvedCurrent;

    private void Awake()
    {
        speaker = gameObject.AddComponent<LogosSentenceSpeech>();
        Build();
        LoadNext();
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Backspace)) Backspace();
    }

    private void Build()
    {
        GameObject canvasGo = new GameObject("LogosLegacyRoomCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        canvas = canvasGo.GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 900;
        CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = .5f;

        GameObject root = new GameObject("LegacyRoomNumber01", typeof(RectTransform), typeof(Image));
        root.transform.SetParent(canvas.transform, false);
        Stretch(root.GetComponent<RectTransform>());
        Image background = root.GetComponent<Image>();
        background.color = LearningUiSkin.PaperColor;

        chapterText = Text(root.transform, "Eyebrow", "", new Vector2(.06f, .94f), new Vector2(.94f, .98f), 22, LearningUiSkin.TealColor, TextAlignmentOptions.Center);
        workText = Text(root.transform, "Work", "", new Vector2(.08f, .885f), new Vector2(.92f, .93f), 26, LearningUiSkin.InkColor, TextAlignmentOptions.Center);
        BuildCardPanel(root.transform);
        numberPadSurface = CreateSurface(root.transform, "NumberPad", new Vector2(.045f, .28f), new Vector2(.955f, .525f), Color.white).gameObject;
        BuildRooms(root.transform);
        BuildReadingPanel(root.transform);

        hintButton = MakeButton(root.transform, "Hint", "힌트", new Vector2(.06f, .155f), new Vector2(.31f, .205f), LearningUiSkin.MintColor, Hint);
        backspaceButton = MakeButton(root.transform, "Backspace", "BACKSPACE", new Vector2(.35f, .155f), new Vector2(.65f, .205f), LearningUiSkin.InkColor, Backspace, Color.white);
        speakButton = MakeButton(root.transform, "ReadAloud", "듣기", new Vector2(.35f, .155f), new Vector2(.65f, .205f), LearningUiSkin.MintColor, SpeakCurrent);
        nextButton = MakeButton(root.transform, "Next", "다음 문장", new Vector2(.69f, .155f), new Vector2(.94f, .205f), new Color(.95f, .73f, .56f, 1f), Advance);
        MakeButton(root.transform, "Lobby", "로비", new Vector2(.06f, .075f), new Vector2(.22f, .115f), Color.white, LearningSceneLoader.LoadLobby, LearningUiSkin.InkColor);
        statusText = Text(root.transform, "Status", "원문 자동 분석 Legacy 01", new Vector2(.25f, .065f), new Vector2(.94f, .12f), 19, new Color(.42f, .49f, .52f, 1f), TextAlignmentOptions.Center);

        Image successSurface = CreateSurface(root.transform, "Success", new Vector2(.16f, .445f), new Vector2(.84f, .555f), new Color(.12f, .47f, .43f, 1f));
        successPanel = successSurface.gameObject;
        Text(successPanel.transform, "Title", "CORRECT!  정답!", new Vector2(.05f, .47f), new Vector2(.95f, .88f), 38, Color.white, TextAlignmentOptions.Center);
        Text(successPanel.transform, "Message", "문장 구조를 완성했어요", new Vector2(.05f, .12f), new Vector2(.95f, .48f), 22, new Color(.9f, 1f, .93f, 1f), TextAlignmentOptions.Center);
        successPanel.SetActive(false);
    }

    private void BuildReadingPanel(Transform parent)
    {
        Image surface = CreateSurface(parent, "ReadingPage", new Vector2(.045f, .28f), new Vector2(.955f, .87f), Color.white);
        readingPanel = surface.gameObject;
        GameObject viewport = new GameObject("ReadingViewport", typeof(RectTransform), typeof(Image), typeof(Mask), typeof(ScrollRect));
        viewport.transform.SetParent(readingPanel.transform, false);
        RectTransform viewportRect = viewport.GetComponent<RectTransform>();
        viewportRect.anchorMin = new Vector2(.06f, .05f); viewportRect.anchorMax = new Vector2(.94f, .95f);
        viewportRect.offsetMin = viewportRect.offsetMax = Vector2.zero;
        Image viewportImage = viewport.GetComponent<Image>(); viewportImage.color = Color.white;
        viewport.GetComponent<Mask>().showMaskGraphic = false;

        GameObject content = new GameObject("ReadingContent", typeof(RectTransform), typeof(TextMeshProUGUI), typeof(ContentSizeFitter));
        content.transform.SetParent(viewport.transform, false);
        RectTransform contentRect = content.GetComponent<RectTransform>();
        contentRect.anchorMin = new Vector2(0f, 1f); contentRect.anchorMax = Vector2.one;
        contentRect.pivot = new Vector2(.5f, 1f);
        contentRect.offsetMin = contentRect.offsetMax = Vector2.zero;
        ContentSizeFitter fitter = content.GetComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        readingText = content.GetComponent<TextMeshProUGUI>();
        readingText.font = LearningFontProvider.DefaultFont;
        readingText.fontSize = 34;
        readingText.color = LearningUiSkin.InkColor;
        readingText.alignment = TextAlignmentOptions.TopLeft;
        readingText.margin = new Vector4(8f, 12f, 8f, 12f);
        readingText.raycastTarget = false;
        readingText.richText = false;
        readingText.enableAutoSizing = false;
        readingText.enableWordWrapping = true;
        readingText.overflowMode = TextOverflowModes.Overflow;
        ScrollRect scroll = viewport.GetComponent<ScrollRect>();
        scroll.content = contentRect; scroll.viewport = viewportRect;
        scroll.horizontal = false; scroll.vertical = true;
        scroll.scrollSensitivity = 35f;
        readingPanel.SetActive(false);
    }

    private void BuildCardPanel(Transform parent)
    {
        Image surface = CreateSurface(parent, "SentenceAssembly", new Vector2(.045f, .535f), new Vector2(.955f, .87f), Color.white);
        cardPanel = surface.gameObject;
        GameObject viewport = new GameObject("CardViewport", typeof(RectTransform), typeof(Image), typeof(Mask), typeof(ScrollRect));
        viewport.transform.SetParent(cardPanel.transform, false);
        RectTransform viewportRect = viewport.GetComponent<RectTransform>();
        viewportRect.anchorMin = new Vector2(.025f, .03f); viewportRect.anchorMax = new Vector2(.975f, .97f);
        viewportRect.offsetMin = viewportRect.offsetMax = Vector2.zero;
        viewport.GetComponent<Image>().color = Color.white;
        viewport.GetComponent<Mask>().showMaskGraphic = false;
        GameObject content = new GameObject("CardGrid", typeof(RectTransform), typeof(GridLayoutGroup), typeof(ContentSizeFitter));
        content.transform.SetParent(viewport.transform, false);
        RectTransform contentRect = content.GetComponent<RectTransform>();
        contentRect.anchorMin = new Vector2(0f, 1f); contentRect.anchorMax = Vector2.one;
        contentRect.pivot = new Vector2(.5f, 1f);
        contentRect.offsetMin = contentRect.offsetMax = Vector2.zero;
        GridLayoutGroup grid = content.GetComponent<GridLayoutGroup>();
        grid.cellSize = new Vector2(284f, 126f); grid.spacing = new Vector2(14f, 16f);
        grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount; grid.constraintCount = 3;
        grid.childAlignment = TextAnchor.UpperCenter;
        grid.padding = new RectOffset(10, 10, 8, 8);
        content.GetComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        ScrollRect scroll = viewport.GetComponent<ScrollRect>();
        scroll.content = contentRect; scroll.viewport = viewportRect;
        scroll.horizontal = false; scroll.vertical = true; scroll.scrollSensitivity = 35f;
        cardContent = content.transform;
    }

    private void BuildRooms(Transform parent)
    {
        for (int i = 0; i < RoomOrder.Length; i++)
        {
            int index = i;
            int column = index % 3;
            int row = index / 3;
            float xMin = .08f + column * .28f;
            float xMax = xMin + .25f;
            float yMax = .46f - row * .062f;
            float yMin = yMax - .05f;
            string room = RoomOrder[i];
            Button button = MakeButton(parent, "Room_" + room, room, new Vector2(xMin, yMin), new Vector2(xMax, yMax), new Color(.92f, .94f, .91f, 1f), () => SelectRoom(room), LearningUiSkin.InkColor, 30);
            roomButtons[room] = button;
            roomLabels[room] = button.GetComponentInChildren<TMP_Text>();
        }
        MakeButton(parent, "BackspacePad", "BACK", new Vector2(.64f, .286f), new Vector2(.89f, .336f), new Color(.95f, .73f, .56f, 1f), Backspace, LearningUiSkin.InkColor, 22);
    }

    private void LoadNext()
    {
        if (speaker != null) speaker.Stop();
        stage = LearningPlayerProfile.PracticeStage;
        current = LogosLegacyRoomRepository.NextForStage(stage);
        placed.Clear(); placementOrder.Clear(); selectedRoom = null; solvedCurrent = false;
        if (current == null)
        {
            statusText.text = "Legacy 문장 데이터를 불러오지 못했습니다.";
            return;
        }
        workText.text = current.sourceTitle;
        LogosLegacyRoomRepository.GetProgressCounts(current.sourceWorkId, out int completed, out int total);
        int displayPosition = Mathf.Min(completed, Mathf.Max(0, total - 1));
        int chapter = displayPosition / 20 + 1;
        int chapterStart = (chapter - 1) * 20;
        int chapterLength = Mathf.Min(20, Mathf.Max(1, total - chapterStart));
        chapterText.text = $"CHAPTER {chapter:00}  ·  {displayPosition - chapterStart + 1:00}/{chapterLength:00}";
        selectedBlock = current.roomBlocks.FirstOrDefault();
        bool readingOnly = !current.eligible || current.roomBlocks == null || current.roomBlocks.Count == 0;
        bool completedBook = LogosLegacyRoomRepository.IsCourseComplete(current.sourceWorkId);
        statusText.text = completedBook ? "이 책을 모두 읽었습니다. 로비에서 다음 책을 골라보세요." : readingOnly ? "원문 읽기" : "";
        if (nextButton != null) nextButton.interactable = readingOnly && !completedBook;
        if (hintButton != null) hintButton.gameObject.SetActive(!readingOnly);
        if (backspaceButton != null) backspaceButton.gameObject.SetActive(!readingOnly);
        if (speakButton != null) speakButton.gameObject.SetActive(readingOnly);
        if (numberPadSurface != null) numberPadSurface.SetActive(!readingOnly);
        if (readingPanel != null) readingPanel.SetActive(readingOnly);
        if (cardPanel != null) cardPanel.SetActive(!readingOnly);
        if (readingText != null) readingText.text = readingOnly ? current.sourceSentence : "";
        if (readingPanel != null && readingOnly)
        {
            Canvas.ForceUpdateCanvases();
            ScrollRect scroll = readingPanel.GetComponentInChildren<ScrollRect>();
            if (scroll != null) scroll.verticalNormalizedPosition = 1f;
        }
        HideSuccess();
        RenderRooms();
        RenderCards();
        if (readingOnly && !completedBook) SpeakCurrent();
    }

    private void SpeakCurrent()
    {
        if (current != null && speaker != null) speaker.Speak(current.sourceSentence);
    }

    private void Advance()
    {
        if (current == null || LogosLegacyRoomRepository.IsCourseComplete(current.sourceWorkId)) return;
        if (!current.eligible || current.roomBlocks == null || current.roomBlocks.Count == 0)
            LogosLegacyRoomRepository.RecordCompletion(current);
        else if (!solvedCurrent)
            return;
        LoadNext();
    }

    private void RenderRooms()
    {
        foreach (string room in RoomOrder)
        {
            Button button = roomButtons[room];
            TMP_Text label = roomLabels[room];
            button.gameObject.SetActive(current != null && current.eligible && current.roomBlocks != null && current.roomBlocks.Count > 0);
            bool isSelected = selectedRoom == room;
            Color color = isSelected ? new Color(.95f, .73f, .56f, 1f) : LearningUiSkin.MintColor;
            button.GetComponent<Image>().color = color;
            label.text = room;
        }
    }

    private void RenderCards()
    {
        if (current == null || !current.eligible || cardContent == null)
        {
            ClearCards();
            return;
        }
        if (renderedSentence != current)
        {
            ClearCards();
            renderedSentence = current;
            for (int i = 0; i < current.roomBlocks.Count; i++)
            {
                LogosLegacyRoomBlock block = current.roomBlocks[i];
                GameObject cell = new GameObject("CardCell_" + i, typeof(RectTransform));
                cell.transform.SetParent(cardContent, false);
                cardCells.Add(cell);
                Button button = MakeButton(cell.transform, "Card_" + i, block.text, new Vector2(.02f, .34f), new Vector2(.98f, .98f), Color.white, () => SelectCard(block), LearningUiSkin.InkColor, 27);
                button.GetComponentInChildren<TMP_Text>().enableWordWrapping = true;
                ConfigureCardDrag(button, block);
                cardButtons[block] = button;
                CreateUnderline(cell.transform, "Underline_" + i, new Vector2(.05f, .25f), new Vector2(.95f, .29f));
                slotLabels[block] = Text(cell.transform, "Number_" + i, "", new Vector2(.05f, .01f), new Vector2(.95f, .25f), 25,
                    LearningUiSkin.TealColor, TextAlignmentOptions.Center);
            }
            Canvas.ForceUpdateCanvases();
            ScrollRect scroll = cardPanel.GetComponentInChildren<ScrollRect>();
            if (scroll != null) scroll.verticalNormalizedPosition = 1f;
        }
        foreach (LogosLegacyRoomBlock block in current.roomBlocks)
        {
            string room = FindPlacedRoom(block);
            if (slotLabels.TryGetValue(block, out TMP_Text label)) label.text = room ?? "";
            if (cardButtons.TryGetValue(block, out Button button))
                button.GetComponent<Image>().color = selectedBlock == block ? new Color(.95f, .73f, .56f, 1f) : Color.white;
        }
    }

    private void ClearCards()
    {
        foreach (GameObject cell in cardCells) if (cell != null) Destroy(cell);
        cardCells.Clear();
        cardButtons.Clear();
        slotLabels.Clear();
        renderedSentence = null;
    }

    private string FindPlacedRoom(LogosLegacyRoomBlock block)
    {
        return block != null && placed.TryGetValue(block, out string room) ? room : null;
    }

    private void ConfigureCardDrag(Button button, LogosLegacyRoomBlock block)
    {
        CanvasGroup group = button.gameObject.AddComponent<CanvasGroup>();
        EventTrigger trigger = button.gameObject.AddComponent<EventTrigger>();

        AddTrigger(trigger, EventTriggerType.BeginDrag, data =>
        {
            selectedBlock = block;
            group.alpha = .72f;
            group.blocksRaycasts = false;
            statusText.text = $"‘{block.text}’ 블록을 번호 키패드 위에 놓으세요.";
            RenderRooms();
        });
        AddTrigger(trigger, EventTriggerType.Drag, data =>
        {
            button.GetComponent<RectTransform>().position = ((PointerEventData)data).position;
        });
        AddTrigger(trigger, EventTriggerType.EndDrag, data =>
        {
            group.blocksRaycasts = true;
            PointerEventData pointer = (PointerEventData)data;
            foreach (string room in RoomOrder)
            {
                if (roomButtons.TryGetValue(room, out Button roomButton) && roomButton.gameObject.activeInHierarchy &&
                    RectTransformUtility.RectangleContainsScreenPoint(roomButton.GetComponent<RectTransform>(), pointer.position, canvas.worldCamera))
                {
                    SelectRoom(room);
                    return;
                }
            }
            statusText.text = "블록을 다시 선택한 뒤 번호 키패드를 눌러보세요.";
            RenderCards();
        });
    }

    private static void AddTrigger(EventTrigger trigger, EventTriggerType type, UnityEngine.Events.UnityAction<BaseEventData> action)
    {
        EventTrigger.Entry entry = new EventTrigger.Entry { eventID = type };
        entry.callback.AddListener(action);
        trigger.triggers.Add(entry);
    }

    private static int StableCardOrder(LogosLegacyRoomBlock block)
    {
        string order = "6|4-2|5|3|4-1|1|4|2";
        return order.IndexOf(block.room, StringComparison.Ordinal) * 1000 + block.text.Length;
    }

    private void SelectCard(LogosLegacyRoomBlock block)
    {
        LearningFeedback.BlockSelect();
        if (cardButtons.TryGetValue(block, out Button button)) LearningFeedback.Pulse(button.transform, 1.06f);
        selectedBlock = block;
        if (!string.IsNullOrEmpty(selectedRoom)) PlaceSelected();
        else
        {
            statusText.text = $"‘{block.text}’ 블록을 골랐습니다. 아래 번호 키패드를 누르세요.";
            RenderCards();
        }
    }

    private void SelectRoom(string room)
    {
        selectedRoom = room;
        if (selectedBlock != null) PlaceSelected();
        else
        {
            statusText.text = $"{room}번을 골랐습니다. 문장 블록을 선택하세요.";
            RenderRooms();
        }
    }

    private void PlaceSelected()
    {
        if (selectedBlock == null || string.IsNullOrEmpty(selectedRoom)) return;
        if (cardButtons.TryGetValue(selectedBlock, out Button button)) LearningFeedback.Pop(button.transform, false, new Color(1f, .75f, .3f, 1f));
        LearningFeedback.NumberPlace();
        placementOrder.Remove(selectedBlock);
        placed[selectedBlock] = selectedRoom;
        placementOrder.Add(selectedBlock);
        selectedBlock = current.roomBlocks.FirstOrDefault(block => !placed.ContainsKey(block));
        selectedRoom = null;
        RenderRooms(); RenderCards();
        if (placed.Count == current.roomBlocks.Count) Submit();
    }

    private void Hint()
    {
        if (current == null || !current.eligible || current.roomBlocks == null) return;
        LogosLegacyRoomBlock missing = current.roomBlocks.FirstOrDefault(block => !placed.ContainsKey(block));
        if (missing == null)
        {
            statusText.text = "모든 블록이 배치되었습니다. 마지막 입력 때 자동으로 채점됩니다.";
            return;
        }
        selectedRoom = missing.room;
        statusText.text = $"힌트: ‘{missing.text}’은 {missing.room}번에 들어갑니다.";
        RenderRooms();
    }

    private void Submit()
    {
        if (current == null) return;
        int correct = 0;
        for (int i = 0; i < current.roomBlocks.Count; i++)
        {
            LogosLegacyRoomBlock expected = current.roomBlocks[i];
            if (placed.TryGetValue(expected, out string actual) && actual == expected.room) correct++;
        }
        if (correct == current.roomBlocks.Count)
        {
            if (!solvedCurrent)
            {
                solvedCurrent = true;
                LearningPlayerProfile.RecordPracticeResult(stage, new LearningAnswerResult { success = true });
                LogosLegacyRoomRepository.RecordCompletion(current);
            }
            bool completedBook = LogosLegacyRoomRepository.IsCourseComplete(current.sourceWorkId);
            if (nextButton != null) nextButton.interactable = !completedBook;
            statusText.text = completedBook
                ? "이 책의 문장을 모두 완성했습니다. 로비에서 다음 책을 골라보세요."
                : "정답! 다음 문장으로 넘어가세요.";
            if (speakButton != null) speakButton.gameObject.SetActive(true);
            if (backspaceButton != null) backspaceButton.gameObject.SetActive(false);
            ShowSuccess();
            SpeakCurrent();
        }
        else
        {
            LearningFeedback.Wrong();
            HideSuccess();
            statusText.text = "아직 아니에요. 지우기 버튼으로 마지막 번호를 지우고 다시 입력해 보세요.";
        }
    }

    private void Backspace()
    {
        if (current == null || !current.eligible || placed.Count == 0) return;
        LogosLegacyRoomBlock last = placementOrder.LastOrDefault();
        if (last == null) return;
        placementOrder.RemoveAt(placementOrder.Count - 1);
        placed.Remove(last);
        selectedBlock = last;
        selectedRoom = null;
        solvedCurrent = false;
        if (nextButton != null) nextButton.interactable = false;
        if (speakButton != null) speakButton.gameObject.SetActive(false);
        if (backspaceButton != null) backspaceButton.gameObject.SetActive(true);
        HideSuccess();
        statusText.text = "마지막 번호를 지웠습니다.";
        LearningFeedback.Backspace();
        RenderRooms();
        RenderCards();
    }

    private void ShowSuccess()
    {
        if (successPanel == null) return;
        successPanel.SetActive(true);
        successPanel.transform.localScale = Vector3.one * 1.06f;
        successPanel.transform.localScale = Vector3.one;
        LearningFeedback.Correct();
        LearningFeedback.Pop(successPanel.transform, true, new Color(.4f, 1f, .8f, 1f));
    }

    private void HideSuccess()
    {
        if (successPanel != null) successPanel.SetActive(false);
    }

    private static Image CreateSurface(Transform parent, string name, Vector2 min, Vector2 max, Color color)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        Image image = go.GetComponent<Image>(); image.sprite = LearningUiSkin.ResolveSurfaceSprite(); image.type = Image.Type.Sliced; image.color = color; image.raycastTarget = false;
        return image;
    }

    private static Image CreateUnderline(Transform parent, string name, Vector2 min, Vector2 max)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        Image image = go.GetComponent<Image>(); image.color = new Color(.45f, .55f, .57f, 1f); image.raycastTarget = false;
        return image;
    }

    private static TMP_Text Text(Transform parent, string name, string value, Vector2 min, Vector2 max, float size, Color color, TextAlignmentOptions alignment)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        TextMeshProUGUI text = go.GetComponent<TextMeshProUGUI>(); text.font = LearningFontProvider.DefaultFont; text.text = value; text.fontSize = size; text.color = color; text.alignment = alignment; text.enableAutoSizing = true; text.fontSizeMin = Mathf.Max(16, size - 10); text.fontSizeMax = size; text.raycastTarget = false;
        return text;
    }

    private static Button MakeButton(Transform parent, string name, string label, Vector2 min, Vector2 max, Color color, UnityEngine.Events.UnityAction action, Color? labelColor = null, float fontSize = 27)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        Image image = go.GetComponent<Image>(); image.sprite = LearningUiSkin.ResolveSurfaceSprite(); image.type = Image.Type.Sliced; image.color = color;
        Button button = go.GetComponent<Button>(); button.targetGraphic = image; button.onClick.AddListener(action);
        Text(go.transform, "Label", label, Vector2.zero, Vector2.one, fontSize, labelColor ?? LearningUiSkin.InkColor, TextAlignmentOptions.Center);
        return button;
    }

    private static void Stretch(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = rect.offsetMax = Vector2.zero;
    }
}
