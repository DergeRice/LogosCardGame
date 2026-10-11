using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningPracticeRuntimeUI : MonoBehaviour
{
    [SerializeField] private LearningModeType modeType = LearningModeType.Practice;
    [SerializeField] private int startStage = 1;
    [SerializeField] private bool startOnStart = true;

    private LearningRoundController _controller;
    private Canvas _canvas;
    private TMP_Text _title;
    private TMP_Text _sentence;
    private TMP_Text _result;
    private Transform _blankRoot;
    private Transform _cardRoot;
    private readonly List<TMP_Text> _blankLabels = new List<TMP_Text>();

    private void Awake()
    {
        _controller = GetComponent<LearningRoundController>();
        if (_controller == null) _controller = gameObject.AddComponent<LearningRoundController>();
        _controller.RoundStarted -= OnRoundStarted;
        _controller.RoundStarted += OnRoundStarted;
        BuildUi();
    }

    private void Start()
    {
        if (startOnStart)
        {
            StartRound(startStage);
        }
        else if (_controller.Session != null)
        {
            RenderRound();
        }
    }

    public void Initialize(LearningModeType mode, int stage, bool autoStart)
    {
        modeType = mode;
        startStage = Mathf.Clamp(stage, 1, LearningPlayerProfile.MaxStage);
        startOnStart = autoStart;
    }

    public void StartPractice(int stage)
    {
        modeType = LearningModeType.Practice;
        StartRound(stage);
    }

    public void StartRound(int stage)
    {
        if (modeType == LearningModeType.Practice)
        {
            _controller.cardDisplayMode = GetPracticeDisplayMode();
        }

        bool ok = _controller.StartRound(modeType, stage);
        if (!ok)
        {
            if (_result != null) _result.text = "문장 데이터가 없습니다. Learning/Generate Sentence Data 메뉴를 먼저 실행하세요.";
            return;
        }

        RenderRound();
    }

    private void OnDestroy()
    {
        if (_controller != null) _controller.RoundStarted -= OnRoundStarted;
    }

    private void OnRoundStarted(LearningSentenceData sentence)
    {
        if (_canvas != null && _controller != null && _controller.Session != null)
        {
            RenderRound();
        }
    }

    private void RenderRound()
    {
        Clear(_blankRoot);
        Clear(_cardRoot);
        _blankLabels.Clear();

        LearningSentenceData sentence = _controller.Session.Sentence;
        _title.text = $"{modeType} Stage {_controller.stage} / {sentence.tier} / {(int)sentence.patternType}형식";
        _sentence.text = "Select a blank block, then choose a POS card.";
        _result.text = string.Empty;

        RenderSentenceBlocks(sentence);
        RenderCards();
        HighlightSelectedBlank();
    }

    private void RenderSentenceBlocks(LearningSentenceData sentence)
    {
        var blankByToken = new Dictionary<int, int>();
        for (int i = 0; i < sentence.blanks.Count; i++)
        {
            blankByToken[sentence.blanks[i].tokenIndex] = i;
        }

        for (int tokenIndex = 0; tokenIndex < sentence.tokens.Count; tokenIndex++)
        {
            if (blankByToken.TryGetValue(tokenIndex, out int blankIndex))
            {
                int captured = blankIndex;
                var button = CreateButton(_blankRoot, "____", () =>
                {
                    _controller.SelectBlank(captured);
                    HighlightSelectedBlank();
                });
                var label = button.GetComponentInChildren<TMP_Text>();
                label.text = "____";
                _blankLabels.Add(label);
            }
            else
            {
                CreateStaticBlock(_blankRoot, sentence.tokens[tokenIndex].text);
            }
        }
    }

    private void RenderCards()
    {
        Clear(_cardRoot);

        List<PlacedWordCard> cards = _controller.BuildPracticeCards();
        for (int i = 0; i < cards.Count; i++)
        {
            PlacedWordCard card = cards[i];
            Button button = null;
            TMP_Text label = null;
            button = CreateButton(_cardRoot, card.DisplayText, () =>
            {
                PlacedWordCard swapped = _controller.PlaceCard(card);
                UpdateBlankLabels();
                HighlightSelectedBlank();

                if (swapped == null)
                {
                    button.gameObject.SetActive(false);
                }
                else
                {
                    card = swapped;
                    if (label != null) label.text = swapped.DisplayText;
                }
            });
            label = button.GetComponentInChildren<TMP_Text>();
            button.GetComponent<LayoutElement>().preferredHeight = 96f;
        }
    }

    private void UpdateBlankLabels()
    {
        var placed = _controller.Session.PlacedCards;
        for (int i = 0; i < _blankLabels.Count && i < placed.Count; i++)
        {
            _blankLabels[i].text = placed[i] != null ? placed[i].DisplayText : "____";
        }
    }

    private void HighlightSelectedBlank()
    {
        int blankCursor = 0;
        for (int i = 0; i < _blankRoot.childCount; i++)
        {
            if (_blankRoot.GetChild(i).GetComponent<Button>() == null) continue;
            var img = _blankRoot.GetChild(i).GetComponent<Image>();
            if (img != null) img.color = blankCursor == _controller.Session.SelectedBlankIndex
                ? new Color(0.25f, 0.45f, 0.95f, 1f)
                : new Color(0.18f, 0.18f, 0.18f, 1f);
            blankCursor++;
        }
    }

    private void Submit()
    {
        if (modeType == LearningModeType.Battle)
        {
            LearningBattleSimulator battle = GetComponent<LearningBattleSimulator>();
            if (battle != null && battle.IsRunning)
            {
                battle.SubmitPlayerAnswer();
                _result.text = $"내 점수 {LearningNumberFormatter.Format(battle.playerScore)} / AI {LearningNumberFormatter.Format(battle.aiScore)} / 차이 {LearningNumberFormatter.Format(battle.playerScore - battle.aiScore)}";
                return;
            }
        }

        LearningAnswerResult answer = _controller.Submit();
        if (answer == null) return;
        _result.text = answer.success
            ? $"{answer.correctCount}/{answer.totalCount}  Score {LearningNumberFormatter.Format(answer.score)}"
            : $"{answer.correctCount}/{answer.totalCount}  Score {LearningNumberFormatter.Format(answer.score)}  EASY MODE ON";

        if (!answer.success && _controller.EasyMode)
        {
            RenderCards();
        }
    }

    private static LearningCardDisplayMode GetPracticeDisplayMode()
    {
        switch (LearningPlayerProfile.PracticeProblemType)
        {
            case LearningStudyProblemType.Shape:
                return LearningCardDisplayMode.Shape;
            case LearningStudyProblemType.Number:
                return LearningCardDisplayMode.Number;
            default:
                return LearningCardDisplayMode.Pos;
        }
    }

    private void BuildUi()
    {
        var canvasGo = new GameObject("LearningPracticeCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGo.AddComponent<GraphicRaycaster>();

        var root = new GameObject("Root");
        root.transform.SetParent(canvasGo.transform);
        var rootRt = root.AddComponent<RectTransform>();
        rootRt.anchorMin = Vector2.zero;
        rootRt.anchorMax = Vector2.one;
        rootRt.offsetMin = Vector2.zero;
        rootRt.offsetMax = Vector2.zero;
        var rootLayout = root.AddComponent<VerticalLayoutGroup>();
        rootLayout.padding = new RectOffset(28, 28, 36, 36);
        rootLayout.spacing = 18;
        rootLayout.childControlHeight = true;
        rootLayout.childControlWidth = true;

        _title = CreateText(root.transform, "Title", 32, 56);
        _sentence = CreateText(root.transform, "Instruction", 26, 70);
        _blankRoot = CreatePanel(root.transform, "SentenceBlocks", 250, true);
        _cardRoot = CreatePanel(root.transform, "Cards", 360, true);

        var actionRoot = CreatePanel(root.transform, "Actions", 90, false);
        CreateButton(actionRoot, "Submit", Submit);
        CreateButton(actionRoot, "Restart", () => StartPractice(startStage));
        _result = CreateText(root.transform, "Result", 28, 70);
    }

    private static Transform CreatePanel(Transform parent, string name, float height, bool grid)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent);
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = height;
        le.flexibleWidth = 1;

        if (grid)
        {
            var layout = go.AddComponent<GridLayoutGroup>();
            layout.cellSize = new Vector2(170f, 74f);
            layout.spacing = new Vector2(12f, 12f);
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 3;
        }
        else
        {
            var layout = go.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 16;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
        }

        return go.transform;
    }

    private static TMP_Text CreateText(Transform parent, string name, int fontSize, float height)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent);
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = height;
        le.flexibleWidth = 1;
        var text = go.AddComponent<TextMeshProUGUI>();
        text.fontSize = fontSize;
        text.color = Color.white;
        text.alignment = TextAlignmentOptions.Center;
        return text;
    }

    private static Button CreateButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
    {
        var go = new GameObject(label);
        go.transform.SetParent(parent);
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 72f;
        le.flexibleWidth = 1;
        var img = go.AddComponent<Image>();
        img.color = new Color(0.18f, 0.18f, 0.18f, 1f);
        var button = go.AddComponent<Button>();
        button.onClick.AddListener(onClick);

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(go.transform);
        var rt = textGo.AddComponent<RectTransform>();
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = Vector2.one;
        rt.offsetMin = Vector2.zero;
        rt.offsetMax = Vector2.zero;
        var text = textGo.AddComponent<TextMeshProUGUI>();
        text.text = label;
        text.fontSize = 24;
        text.color = Color.white;
        text.alignment = TextAlignmentOptions.Center;
        return button;
    }

    private static void CreateStaticBlock(Transform parent, string label)
    {
        var go = new GameObject(label);
        go.transform.SetParent(parent);
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 72f;
        le.flexibleWidth = 1;
        var img = go.AddComponent<Image>();
        img.color = new Color(0.10f, 0.10f, 0.10f, 1f);

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(go.transform);
        var rt = textGo.AddComponent<RectTransform>();
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = Vector2.one;
        rt.offsetMin = Vector2.zero;
        rt.offsetMax = Vector2.zero;
        var text = textGo.AddComponent<TextMeshProUGUI>();
        text.text = label;
        text.fontSize = 24;
        text.color = Color.white;
        text.alignment = TextAlignmentOptions.Center;
    }

    private static void Clear(Transform root)
    {
        for (int i = root.childCount - 1; i >= 0; i--)
        {
            Destroy(root.GetChild(i).gameObject);
        }
    }
}
