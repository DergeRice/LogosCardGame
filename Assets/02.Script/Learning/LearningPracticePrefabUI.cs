using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningPracticePrefabUI : MonoBehaviour
{
    [Header("Round")]
    [SerializeField] private LearningRoundController controller;
    [SerializeField] private LearningModeType modeType = LearningModeType.Practice;
    [SerializeField] private int startStage = 1;
    [SerializeField] private bool startOnAwake = true;

    [Header("Roots")]
    [SerializeField] private Transform sentenceRoot;
    [SerializeField] private Transform cardRoot;

    [Header("Prefabs")]
    [SerializeField] private LearningWordBlockView wordBlockPrefab;
    [SerializeField] private LearningBlankSlotView blankBlockPrefab;
    [SerializeField] private LearningWordCardButton posCardPrefab;

    [Header("Texts")]
    [SerializeField] private TMP_Text titleText;
    [SerializeField] private TMP_Text resultText;

    [Header("Buttons")]
    [SerializeField] private Button submitButton;
    [SerializeField] private Button restartButton;

    private readonly List<LearningBlankSlotView> blankViews = new List<LearningBlankSlotView>();
    private LearningExplorationShopUI explorationShopUI;

    private void Awake()
    {
        ResolvePrefabReferences();
        if (controller == null) controller = FindFirstObjectByType<LearningRoundController>();
        if (controller == null) controller = gameObject.AddComponent<LearningRoundController>();
        explorationShopUI = FindFirstObjectByType<LearningExplorationShopUI>();
        controller.RoundStarted -= OnRoundStarted;
        controller.RoundStarted += OnRoundStarted;

        if (submitButton != null)
        {
            submitButton.onClick.RemoveListener(Submit);
            submitButton.onClick.AddListener(Submit);
        }

        if (restartButton != null)
        {
            restartButton.onClick.RemoveListener(Restart);
            restartButton.onClick.AddListener(Restart);
        }
    }

    private void Start()
    {
        if (startOnAwake)
        {
            StartRound(startStage);
        }
    }

    public void StartPractice(int stage)
    {
        modeType = LearningModeType.Practice;
        StartRound(stage);
    }

    public void Initialize(LearningModeType mode, int stage, bool autoStart)
    {
        modeType = mode;
        startStage = Mathf.Clamp(stage, 1, LearningPlayerProfile.MaxStage);
        startOnAwake = autoStart;
    }

    public void StartRound(int stage)
    {
        if (controller == null) return;
        if (modeType == LearningModeType.Practice)
        {
            controller.cardDisplayMode = GetPracticeDisplayMode();
        }

        bool ok = controller.StartRound(modeType, stage);
        if (!ok)
        {
            SetResult("문장 데이터를 불러오지 못했습니다.");
            return;
        }

        // RoundStarted event renders the newly created session.
    }

    public void Restart()
    {
        StartRound(startStage);
    }

    public void ShowResult(string message)
    {
        SetResult(message);
    }

    public void SetGameplayVisible(bool visible)
    {
        if (sentenceRoot != null) sentenceRoot.gameObject.SetActive(visible);
        if (cardRoot != null) cardRoot.gameObject.SetActive(visible);
        if (submitButton != null) submitButton.gameObject.SetActive(visible);
        if (restartButton != null) restartButton.gameObject.SetActive(visible);
    }

    public void Submit()
    {
        if (controller == null || controller.Session == null) return;

        if (modeType == LearningModeType.Battle)
        {
            LearningBattleSimulator battle = controller.GetComponent<LearningBattleSimulator>();
            if (battle != null && battle.IsRunning)
            {
                battle.SubmitPlayerAnswer();
                SetResult($"내 점수 {LearningNumberFormatter.Format(battle.playerScore)} / AI {LearningNumberFormatter.Format(battle.aiScore)}");
                return;
            }
        }

        LearningAnswerResult answer = controller.Submit();
        if (answer == null) return;

        string failSuffix = modeType == LearningModeType.Practice ? "  EASY MODE ON" : string.Empty;
        SetResult(answer.success
            ? $"정답 {answer.correctCount}/{answer.totalCount}  Score {LearningNumberFormatter.Format(answer.score)}"
            : $"오답 {answer.correctCount}/{answer.totalCount}  Score {LearningNumberFormatter.Format(answer.score)}{failSuffix}");

        if (modeType == LearningModeType.Exploration && answer.success)
        {
            LearningExplorationController exploration = controller.GetComponent<LearningExplorationController>();
            if (exploration != null)
            {
                string next = exploration.CompleteCurrentBlind();
                SetResult($"정답 {answer.correctCount}/{answer.totalCount}  Score {LearningNumberFormatter.Format(answer.score)} / {next}");
                if (LearningExplorationRunState.ShopPending)
                {
                    if (explorationShopUI == null) explorationShopUI = FindFirstObjectByType<LearningExplorationShopUI>();
                    explorationShopUI?.OpenShop();
                }
                return;
            }
        }

        if (!answer.success && controller.EasyMode)
        {
            RenderCards();
        }
    }

    private void OnDestroy()
    {
        if (controller != null) controller.RoundStarted -= OnRoundStarted;
    }

    private void OnRoundStarted(LearningSentenceData sentence)
    {
        if (controller != null && controller.Session != null)
        {
            RenderRound();
        }
    }

    private void RenderRound()
    {
        Clear(sentenceRoot);
        Clear(cardRoot);
        blankViews.Clear();

        LearningSentenceData sentence = controller.Session.Sentence;
        if (titleText != null)
        {
            titleText.text = $"{GetModeLabel(modeType)} Stage {controller.stage} / {sentence.tier} / {(int)sentence.patternType}형식";
            titleText.text += $" / {GetDisplayModeLabel(controller.cardDisplayMode)}";
        }

        SetResult(string.Empty);
        RenderSentence(sentence);
        RenderCards();
        RefreshBlankViews();
    }

    private void RenderSentence(LearningSentenceData sentence)
    {
        if (sentenceRoot == null || sentence == null) return;

        var blankByToken = new Dictionary<int, int>();
        for (int i = 0; i < sentence.blanks.Count; i++)
        {
            blankByToken[sentence.blanks[i].tokenIndex] = i;
        }

        for (int tokenIndex = 0; tokenIndex < sentence.tokens.Count; tokenIndex++)
        {
            if (blankByToken.TryGetValue(tokenIndex, out int blankIndex))
            {
                LearningBlankSlotView view = Instantiate(blankBlockPrefab, sentenceRoot);
                view.Init(controller, blankIndex);
                view.BlankClicked -= OnBlankClicked;
                view.BlankClicked += OnBlankClicked;
                blankViews.Add(view);
            }
            else
            {
                LearningWordBlockView view = Instantiate(wordBlockPrefab, sentenceRoot);
                view.SetText(sentence.tokens[tokenIndex].text);
            }
        }
    }

    private void RenderCards()
    {
        Clear(cardRoot);
        ResolvePrefabReferences();
        if (cardRoot == null || posCardPrefab == null || controller == null) return;

        List<PlacedWordCard> cards = controller.BuildPracticeCards();
        for (int i = 0; i < cards.Count; i++)
        {
            LearningWordCardButton view = Instantiate(posCardPrefab, cardRoot);
            view.Init(controller, cards[i]);
            view.CardClicked -= OnCardClicked;
            view.CardClicked += OnCardClicked;
        }
    }

    private void OnCardClicked()
    {
        RefreshBlankViews();
    }

    private void OnBlankClicked(int blankIndex)
    {
        RefreshBlankViews();
    }

    private void RefreshBlankViews()
    {
        if (controller == null || controller.Session == null) return;

        IReadOnlyList<PlacedWordCard> placed = controller.Session.PlacedCards;
        for (int i = 0; i < blankViews.Count; i++)
        {
            PlacedWordCard card = i < placed.Count ? placed[i] : null;
            blankViews[i].SetText(card != null ? card.DisplayText : string.Empty);
            blankViews[i].SetSelected(i == controller.Session.SelectedBlankIndex);
        }
    }

    private void SetResult(string message)
    {
        if (resultText != null) resultText.text = message;
    }

    private void ResolvePrefabReferences()
    {
        if (posCardPrefab != null) return;

        GameObject prefab = LearningUiSkin.ResolvePosCardPrefab(null);
        if (prefab != null) posCardPrefab = prefab.GetComponent<LearningWordCardButton>();
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

    private static string GetDisplayModeLabel(LearningCardDisplayMode mode)
    {
        switch (mode)
        {
            case LearningCardDisplayMode.Shape:
                return "도형";
            case LearningCardDisplayMode.Number:
                return "숫자";
            default:
                return "품사";
        }
    }

    private static string GetModeLabel(LearningModeType mode)
    {
        switch (mode)
        {
            case LearningModeType.Exploration:
                return "탐험";
            case LearningModeType.Battle:
                return "대전";
            default:
                return "연습";
        }
    }

    private static void Clear(Transform root)
    {
        if (root == null) return;
        for (int i = root.childCount - 1; i >= 0; i--)
        {
            Destroy(root.GetChild(i).gameObject);
        }
    }
}
