using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningBattleSentenceUI : MonoBehaviour
{
    [SerializeField] private LearningBattleSentenceController controller;
    [SerializeField] private Canvas canvas;
    [SerializeField] private TMP_FontAsset fontAsset;
    [SerializeField] private Sprite buttonSprite;
    [SerializeField] private GameObject cardPrefab;

    private TMP_Text titleText;
    private TMP_Text scoreText;
    private TMP_Text messageText;
    private Transform sentenceRoot;
    private Transform handRoot;

    public void Configure(LearningBattleSentenceController targetController, Canvas targetCanvas, TMP_FontAsset targetFontAsset = null)
    {
        controller = targetController;
        canvas = targetCanvas;
        if (targetFontAsset != null) fontAsset = targetFontAsset;
    }

    private void Awake()
    {
        if (fontAsset == null) fontAsset = LearningFontProvider.DefaultFont;
        buttonSprite = LearningUiSkin.ResolveButtonSprite(buttonSprite);
        if (cardPrefab == null) cardPrefab = LearningUiSkin.ResolvePosCardPrefab(cardPrefab);
        if (controller == null) controller = FindFirstObjectByType<LearningBattleSentenceController>();
        if (canvas == null) canvas = FindFirstObjectByType<Canvas>();
        BuildIfNeeded();
        Subscribe();
    }

    private void OnDestroy()
    {
        if (controller == null) return;
        controller.StateChanged -= Refresh;
        controller.MessageRaised -= SetMessage;
    }

    public void PlayHandCard(int index) => controller?.PlayHandCard(index);
    public void ReturnSentenceCard(int index) => controller?.ReturnSentenceCard(index);
    public bool IsScoringSentenceCard(int index) => controller != null && controller.IsScoringSentenceCard(index);

    public void CommitSentenceDrag(int fromIndex, Vector2 screenPosition)
    {
        if (controller == null || sentenceRoot == null) return;
        int target = GetSentenceIndexFromScreenX(screenPosition.x);
        controller.MoveSentenceCard(fromIndex, target);
    }

    public void PreviewSentenceDrag(int fromIndex, Vector2 screenPosition) { }

    private void Subscribe()
    {
        if (controller == null) return;
        controller.StateChanged -= Refresh;
        controller.StateChanged += Refresh;
        controller.MessageRaised -= SetMessage;
        controller.MessageRaised += SetMessage;
    }

    private void Refresh()
    {
        if (controller == null) return;
        Clear(sentenceRoot);
        Clear(handRoot);

        titleText.text = $"대전 문장 제작 / 난이도 {controller.Difficulty}";
        int gap = controller.PlayerScore - controller.AiScore;
        scoreText.text = $"내 점수 {LearningNumberFormatter.Format(controller.PlayerScore)} / AI {LearningNumberFormatter.Format(controller.AiScore)} / 차이 {LearningNumberFormatter.Format(gap)} / 목표 10점";

        for (int i = 0; i < controller.SentenceCards.Count; i++)
        {
            CreateCard(sentenceRoot, i, controller.SentenceCards[i], true);
        }

        if (controller.Deck != null)
        {
            for (int i = 0; i < controller.Deck.hand.Count; i++)
            {
                CreateCard(handRoot, i, controller.Deck.hand[i], false);
            }
        }

        ForceLayoutRebuild(sentenceRoot);
        ForceLayoutRebuild(handRoot);
    }

    private void SetMessage(string message)
    {
        if (messageText != null) messageText.text = message;
    }

    private int GetSentenceIndexFromScreenX(float screenX)
    {
        int count = controller != null ? controller.SentenceCards.Count : 0;
        if (count <= 1) return 0;

        for (int i = 0; i < sentenceRoot.childCount; i++)
        {
            RectTransform child = sentenceRoot.GetChild(i) as RectTransform;
            if (child == null) continue;
            Vector3 world = child.TransformPoint(child.rect.center);
            float childX = RectTransformUtility.WorldToScreenPoint(null, world).x;
            if (screenX < childX) return i;
        }
        return count - 1;
    }

    private void BuildIfNeeded()
    {
        if (canvas == null)
        {
            GameObject canvasGo = new GameObject("LearningBattleSentenceCanvas");
            canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            canvasGo.AddComponent<GraphicRaycaster>();
        }

        GameObject root = new GameObject("BattleSentenceUI");
        root.transform.SetParent(canvas.transform, false);
        RectTransform rootRect = root.AddComponent<RectTransform>();
        rootRect.anchorMin = Vector2.zero;
        rootRect.anchorMax = Vector2.one;
        rootRect.offsetMin = Vector2.zero;
        rootRect.offsetMax = Vector2.zero;
        var backdrop = root.AddComponent<Image>();
        backdrop.color = LearningUiSkin.PaperColor;
        backdrop.raycastTarget = false;
        CreateSurface(root.transform, "SentenceSurface", new Vector2(.035f, .535f), new Vector2(.965f, .75f), Color.white);
        CreateSurface(root.transform, "HandSurface", new Vector2(.035f, .12f), new Vector2(.965f, .46f), LearningUiSkin.MintColor);

        titleText = CreateText(root.transform, "Title", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -210f), new Vector2(920f, 70f), 42);
        scoreText = CreateText(root.transform, "Score", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -295f), new Vector2(920f, 58f), 32);
        messageText = CreateText(root.transform, "Message", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -380f), new Vector2(920f, 72f), 28);
        sentenceRoot = CreateHorizontalRoot(root.transform, "SentenceRoot", new Vector2(0.05f, 0.55f), new Vector2(0.95f, 0.73f), 16f);
        handRoot = CreateGridRoot(root.transform, "HandRoot", new Vector2(0.05f, 0.12f), new Vector2(0.95f, 0.45f));
        CreateButton(root.transform, "로비", new Vector2(0.05f, 0.92f), new Vector2(0.2f, 0.97f), LearningSceneLoader.LoadLobby);
        CreateButton(root.transform, "제출", new Vector2(0.055f, 0.045f), new Vector2(0.485f, 0.10f), () => controller?.SubmitSentence());
        CreateButton(root.transform, "드로우", new Vector2(0.515f, 0.045f), new Vector2(0.945f, 0.10f), () => controller?.DropSentence());
    }

    private static void CreateSurface(Transform parent, string name, Vector2 min, Vector2 max, Color color)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image));
        var rect = (RectTransform)go.transform;
        rect.SetParent(parent, false); rect.anchorMin = min; rect.anchorMax = max;
        rect.offsetMin = rect.offsetMax = Vector2.zero;
        var image = go.GetComponent<Image>(); image.sprite = LearningUiSkin.ResolveSurfaceSprite();
        image.type = Image.Type.Sliced; image.color = color; image.raycastTarget = false;
    }

    private void CreateCard(Transform parent, int index, LearningDeckCard card, bool inSentence)
    {
        if (cardPrefab == null) cardPrefab = LearningUiSkin.ResolvePosCardPrefab(cardPrefab);
        if (cardPrefab == null)
        {
            Debug.LogWarning("[LearningBattleSentenceUI] PosCard prefab is not assigned.");
            return;
        }

        GameObject go = Instantiate(cardPrefab, parent);
        go.name = inSentence ? "SentenceCard" : "HandCard";
        go.transform.SetParent(parent, false);

        LearningWordCardButton wordCardButton = go.GetComponent<LearningWordCardButton>();
        if (wordCardButton != null) wordCardButton.enabled = false;

        bool scoring = inSentence && IsScoringSentenceCard(index);

        LearningDeckCardView cardView = go.GetComponent<LearningDeckCardView>();
        if (cardView != null)
        {
            cardView.Bind(card, inSentence, scoring);
        }
        else
        {
            Debug.LogWarning("[LearningBattleSentenceUI] PosCard is missing LearningDeckCardView.");
        }

        LearningBattleSentenceCardView view = go.GetComponent<LearningBattleSentenceCardView>();
        if (view == null) view = go.AddComponent<LearningBattleSentenceCardView>();
        view.Init(this, index, inSentence);
    }

    private TMP_Text CreateText(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 size, float fontSize)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.pivot = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = pos;
        rect.sizeDelta = size;
        TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) text.font = fontAsset;
        text.alignment = TextAlignmentOptions.Center;
        text.fontSize = fontSize;
        text.color = new Color(0.12f, 0.16f, 0.24f, 1f);
        return text;
    }

    private Transform CreateHorizontalRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, float spacing)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        HorizontalLayoutGroup layout = go.AddComponent<HorizontalLayoutGroup>();
        layout.spacing = spacing;
        layout.childAlignment = TextAnchor.MiddleCenter;
        layout.childControlWidth = false;
        layout.childControlHeight = false;
        return go.transform;
    }

    private Transform CreateGridRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        GridLayoutGroup grid = go.AddComponent<GridLayoutGroup>();
        grid.cellSize = new Vector2(170f, 88f);
        grid.spacing = new Vector2(14f, 14f);
        grid.childAlignment = TextAnchor.UpperCenter;
        return go.transform;
    }

    private Button CreateButton(Transform parent, string label, Vector2 anchorMin, Vector2 anchorMax, UnityEngine.Events.UnityAction action)
    {
        GameObject go = new GameObject(label);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        Image image = go.AddComponent<Image>();
        image.sprite = buttonSprite;
        image.type = buttonSprite != null ? Image.Type.Sliced : Image.Type.Simple;
        image.sprite = LearningUiSkin.ResolveSurfaceSprite();
        image.color = LearningUiSkin.InkColor;
        Button button = go.AddComponent<Button>();
        button.onClick.AddListener(action);

        GameObject labelGo = new GameObject("Label");
        labelGo.transform.SetParent(go.transform, false);
        RectTransform labelRect = labelGo.AddComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.offsetMin = Vector2.zero;
        labelRect.offsetMax = Vector2.zero;
        TextMeshProUGUI text = labelGo.AddComponent<TextMeshProUGUI>();
        if (fontAsset != null) text.font = fontAsset;
        text.text = label;
        text.fontSize = 30f;
        text.color = Color.white;
        text.alignment = TextAlignmentOptions.Center;
        return button;
    }

    private static void Clear(Transform root)
    {
        if (root == null) return;
        for (int i = root.childCount - 1; i >= 0; i--)
        {
            Transform child = root.GetChild(i);
            child.SetParent(null, false);
            Destroy(child.gameObject);
        }
    }

    private static void ForceLayoutRebuild(Transform root)
    {
        RectTransform rect = root as RectTransform;
        if (rect != null) LayoutRebuilder.ForceRebuildLayoutImmediate(rect);
    }
}
