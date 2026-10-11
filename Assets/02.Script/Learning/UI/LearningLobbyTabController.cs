using DG.Tweening;
using UnityEngine;

public class LearningLobbyTabController : MonoBehaviour
{
    [Header("Tabs")]
    [SerializeField] private LearningLobbyTabType startTab = LearningLobbyTabType.Home;
    [SerializeField] private LearningLobbyTabButton[] tabButtons;
    [SerializeField] private RectTransform tabFocus;

    [Header("Panels")]
    [SerializeField] private RectTransform learningPanel;
    [SerializeField] private RectTransform explorationPanel;
    [SerializeField] private RectTransform homePanel;
    [SerializeField] private RectTransform battlePanel;
    [SerializeField] private RectTransform profilePanel;

    [Header("Animation")]
    [SerializeField] private float tabDuration = 0.09f;
    [SerializeField] private float panelExitDuration = 0.05f;
    [SerializeField] private float panelEnterDelay = 0.02f;
    [SerializeField] private float panelEnterDuration = 0.05f;
    [SerializeField] private float panelSlideDistance = 720f;
    [SerializeField] private float tabFocusXOffset;
    [SerializeField] private bool logTabFocusMove;

    public LearningLobbyTabType Current { get; private set; }
    public RectTransform LearningPanel => learningPanel;
    private bool hasSelectedTab;

    private void Awake()
    {
        if (tabButtons == null || tabButtons.Length == 0)
        {
            tabButtons = GetComponentsInChildren<LearningLobbyTabButton>(true);
        }

        for (int i = 0; i < tabButtons.Length; i++)
        {
            if (tabButtons[i] != null) tabButtons[i].Init(this);
        }
    }

    private void Start()
    {
        Select(startTab, true);
    }

    public void SelectLearning() => Select(LearningLobbyTabType.Learning);
    public void SelectExploration() => Select(LearningLobbyTabType.Exploration);
    public void SelectHome() => Select(LearningLobbyTabType.Home);
    public void SelectBattle() => Select(LearningLobbyTabType.Battle);
    public void SelectProfile() => Select(LearningLobbyTabType.Profile);

    public void Select(LearningLobbyTabType tab)
    {
        Select(tab, false);
    }

    public void Select(LearningLobbyTabType tab, bool instant)
    {
        if (hasSelectedTab && !instant && Current == tab)
        {
            LearningLobbyTabButton currentButton = FindButton(tab);
            currentButton?.PlayReselectFeedback(tabDuration);
            return;
        }

        LearningLobbyTabType previous = Current;
        Current = tab;
        hasSelectedTab = true;
        float duration = instant ? 0f : Mathf.Min(0.1f, tabDuration);

        for (int i = 0; i < tabButtons.Length; i++)
        {
            if (tabButtons[i] == null) continue;
            bool selected = tabButtons[i].TabType == tab;
            tabButtons[i].SetSelected(selected, duration);
            if (selected)
            {
                MoveFocus(tabButtons[i], duration);
            }
        }

        ShowPanels(previous, tab, instant);
    }

    private LearningLobbyTabButton FindButton(LearningLobbyTabType tab)
    {
        if (tabButtons == null) return null;
        for (int i = 0; i < tabButtons.Length; i++)
        {
            if (tabButtons[i] != null && tabButtons[i].TabType == tab) return tabButtons[i];
        }
        return null;
    }

    private void MoveFocus(LearningLobbyTabButton selected, float duration)
    {
        if (tabFocus == null || selected == null || selected.IconRoot == null) return;
        RectTransform selectedRect = selected.transform as RectTransform;
        RectTransform targetRect = selectedRect != null ? selectedRect : selected.IconRoot;
        MoveFocusRect(tabFocus, targetRect, duration);

        // Scene iterations created duplicate TabFocus objects; move all visible focus bars defensively.
        RectTransform[] allRects = FindObjectsByType<RectTransform>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
        for (int i = 0; i < allRects.Length; i++)
        {
            RectTransform rect = allRects[i];
            if (rect == null || rect == tabFocus || rect.name != "TabFocus") continue;
            MoveFocusRect(rect, targetRect, duration);
        }
    }

    private void MoveFocusRect(RectTransform focus, RectTransform targetRect, float duration)
    {
        if (focus == null || targetRect == null) return;
        RectTransform focusParent = focus.parent as RectTransform;
        float targetX;
        if (focusParent != null && targetRect.parent == focusParent)
        {
            targetX = targetRect.anchoredPosition.x + tabFocusXOffset;
        }
        else
        {
            Vector3 world = targetRect.TransformPoint(targetRect.rect.center);
            Vector3 target = focusParent != null ? focusParent.InverseTransformPoint(world) : world;
            targetX = target.x + tabFocusXOffset;
        }

        focus.DOKill();
        Vector2 anchored = focus.anchoredPosition;
        anchored.x = targetX;
        if (logTabFocusMove)
        {
            Debug.Log($"[LearningLobbyTabController] MoveFocus {targetRect.name} -> {focus.name} x={targetX}", this);
        }
        if (duration <= 0f) focus.anchoredPosition = anchored;
        else focus.DOAnchorPosX(targetX, duration).SetEase(Ease.OutQuad);
    }

    private void ShowPanels(LearningLobbyTabType previous, LearningLobbyTabType next, bool instant)
    {
        RectTransform previousPanel = GetPanel(previous);
        RectTransform nextPanel = GetPanel(next);
        CanvasGroup previousGroup = GetCanvasGroup(previousPanel);
        CanvasGroup nextGroup = GetCanvasGroup(nextPanel);

        KillAllPanels();

        if (instant || previousPanel == null || previousPanel == nextPanel)
        {
            SetOnlyActive(nextPanel);
            return;
        }

        int moveDirection = GetTabOrder(next) < GetTabOrder(previous) ? 1 : -1;
        Vector2 incomingStart = new Vector2(-moveDirection * panelSlideDistance, 0f);
        Vector2 outgoingEnd = new Vector2(moveDirection * panelSlideDistance, 0f);
        float exitDuration = Mathf.Min(0.05f, panelExitDuration);
        float enterDelay = Mathf.Min(0.02f, panelEnterDelay);
        float enterDuration = Mathf.Min(0.05f, panelEnterDuration);

        previousPanel.gameObject.SetActive(true);
        previousPanel.anchoredPosition = Vector2.zero;
        if (previousGroup != null) previousGroup.alpha = 1f;
        previousPanel.DOAnchorPos(outgoingEnd, exitDuration)
            .SetEase(Ease.InCubic)
            .OnComplete(() =>
            {
                previousPanel.gameObject.SetActive(false);
                previousPanel.anchoredPosition = Vector2.zero;
            });
        if (previousGroup != null)
        {
            previousGroup.DOKill();
            previousGroup.DOFade(0f, exitDuration).SetEase(Ease.InCubic);
        }

        if (nextPanel != null)
        {
            nextPanel.gameObject.SetActive(true);
            nextPanel.SetAsLastSibling();
            nextPanel.anchoredPosition = incomingStart;
            if (nextGroup != null) nextGroup.alpha = 0f;
            nextPanel.DOAnchorPos(Vector2.zero, enterDuration)
                .SetDelay(exitDuration + enterDelay)
                .SetEase(Ease.OutCubic);
            if (nextGroup != null)
            {
                nextGroup.DOKill();
                nextGroup.DOFade(1f, enterDuration)
                    .SetDelay(exitDuration + enterDelay)
                    .SetEase(Ease.OutCubic);
            }
        }
    }

    private void KillAllPanels()
    {
        RectTransform[] panels = { learningPanel, explorationPanel, homePanel, battlePanel, profilePanel };
        for (int i = 0; i < panels.Length; i++)
        {
            if (panels[i] == null) continue;
            panels[i].DOKill();
            CanvasGroup group = GetCanvasGroup(panels[i]);
            if (group != null) group.DOKill();
        }
    }

    private void SetOnlyActive(RectTransform selected)
    {
        RectTransform[] panels = { learningPanel, explorationPanel, homePanel, battlePanel, profilePanel };
        for (int i = 0; i < panels.Length; i++)
        {
            if (panels[i] == null) continue;
            bool active = panels[i] == selected;
            panels[i].gameObject.SetActive(active);
            panels[i].anchoredPosition = Vector2.zero;
            CanvasGroup group = GetCanvasGroup(panels[i]);
            if (group != null) group.alpha = active ? 1f : 0f;
        }
    }

    private CanvasGroup GetCanvasGroup(RectTransform panel)
    {
        if (panel == null) return null;
        CanvasGroup group = panel.GetComponent<CanvasGroup>();
        if (group == null) group = panel.gameObject.AddComponent<CanvasGroup>();
        return group;
    }

    private RectTransform GetPanel(LearningLobbyTabType tab)
    {
        switch (tab)
        {
            case LearningLobbyTabType.Learning:
                return learningPanel;
            case LearningLobbyTabType.Exploration:
                return explorationPanel;
            case LearningLobbyTabType.Home:
                return homePanel;
            case LearningLobbyTabType.Battle:
                return battlePanel;
            case LearningLobbyTabType.Profile:
                return profilePanel;
            default:
                return homePanel;
        }
    }

    private int GetTabOrder(LearningLobbyTabType tab)
    {
        switch (tab)
        {
            case LearningLobbyTabType.Learning:
                return 0;
            case LearningLobbyTabType.Exploration:
                return 1;
            case LearningLobbyTabType.Home:
                return 2;
            case LearningLobbyTabType.Battle:
                return 3;
            case LearningLobbyTabType.Profile:
                return 4;
            default:
                return 2;
        }
    }
}
