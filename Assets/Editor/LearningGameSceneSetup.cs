#if UNITY_EDITOR
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public static class LearningGameSceneSetup
{
    private const string WordBlockPath = "Assets/05.Prefabs/WordBlock.prefab";
    private const string BlankBlockPath = "Assets/05.Prefabs/BlankBlock.prefab";
    private const string PosCardPath = "Assets/05.Prefabs/PosCard.prefab";
    private const string DefaultFontPath = "Assets/06.Font/NanumSquareRoundOTFEB SDF.asset";

    [MenuItem("Tools/Learning/Setup All Game Scenes")]
    public static void SetupAllGameScenes()
    {
        SetupScene("Assets/01.Scene/3.PracticeScreen.unity", LearningModeType.Practice);
        SetupScene("Assets/01.Scene/4.ExplorationScreen.unity", LearningModeType.Exploration);
        SetupScene("Assets/01.Scene/5.BattleScreen.unity", LearningModeType.Battle);
        Debug.Log("[LearningGameSceneSetup] Practice/Exploration/Battle scene setup complete.");
    }

    [MenuItem("Tools/Learning/Setup Current Game Scene")]
    public static void SetupCurrentGameScene()
    {
        string sceneName = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;
        if (sceneName == LearningSceneNames.Practice)
        {
            SetupOpenScene(LearningModeType.Practice);
        }
        else if (sceneName == LearningSceneNames.Exploration)
        {
            SetupOpenScene(LearningModeType.Exploration);
        }
        else if (sceneName == LearningSceneNames.Battle)
        {
            SetupOpenScene(LearningModeType.Battle);
        }
        else
        {
            Debug.LogWarning("[LearningGameSceneSetup] Open Practice, Exploration, or Battle scene first.");
        }
    }

    private static void SetupScene(string path, LearningModeType mode)
    {
        EditorSceneManager.OpenScene(path);
        SetupOpenScene(mode);
        EditorSceneManager.SaveOpenScenes();
    }

    private static void SetupOpenScene(LearningModeType mode)
    {
        LearningWordBlockView wordPrefab = AssetDatabase.LoadAssetAtPath<LearningWordBlockView>(WordBlockPath);
        LearningBlankSlotView blankPrefab = AssetDatabase.LoadAssetAtPath<LearningBlankSlotView>(BlankBlockPath);
        LearningWordCardButton cardPrefab = AssetDatabase.LoadAssetAtPath<LearningWordCardButton>(PosCardPath);
        if (wordPrefab == null || blankPrefab == null || cardPrefab == null)
        {
            Debug.LogError("[LearningGameSceneSetup] Missing one of WordBlock/BlankBlock/PosCard prefabs.");
            return;
        }

        RemoveGeneratedRoot();
        EnsureEventSystem();

        GameObject root = new GameObject("LearningGameRoot");
        LearningRoundController controller = root.AddComponent<LearningRoundController>();
        controller.modeType = mode;
        root.AddComponent<LearningItemEffectExecutor>();

        Canvas canvas = CreateCanvas(mode);
        Button backButton = CreateButton(canvas.transform, "BackLobbyButton", "로비", AnchorTop(-390f, -34f, 180f, 72f));
        backButton.gameObject.AddComponent<LearningBackToLobbyButton>();

        if (mode == LearningModeType.Exploration)
        {
            LearningItemInventory inventory = root.AddComponent<LearningItemInventory>();
            LearningExplorationSentenceController sentenceController = root.AddComponent<LearningExplorationSentenceController>();
            LearningExplorationShopUI shopUI = root.AddComponent<LearningExplorationShopUI>();
            LearningExplorationSentenceUI sentenceUI = root.AddComponent<LearningExplorationSentenceUI>();

            SerializedObject shopSo = new SerializedObject(shopUI);
            SetObject(shopSo, "canvas", canvas);
            SetObject(shopSo, "inventory", inventory);
            SetObject(shopSo, "sentenceController", sentenceController);
            SetObject(shopSo, "sentenceUI", sentenceUI);
            SetObject(shopSo, "fontAsset", LoadDefaultFont());
            shopSo.ApplyModifiedPropertiesWithoutUndo();

            SerializedObject explorationUiSo = new SerializedObject(sentenceUI);
            SetObject(explorationUiSo, "controller", sentenceController);
            SetObject(explorationUiSo, "shopUI", shopUI);
            SetObject(explorationUiSo, "canvas", canvas);
            SetObject(explorationUiSo, "fontAsset", LoadDefaultFont());
            explorationUiSo.ApplyModifiedPropertiesWithoutUndo();

            EditorUtility.SetDirty(root);
            EditorUtility.SetDirty(canvas);
            EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
            Debug.Log("[LearningGameSceneSetup] Installed exploration sentence-building UI.");
            return;
        }
        else if (mode == LearningModeType.Battle)
        {
            root.AddComponent<LearningItemInventory>();
            root.AddComponent<LearningBattleSimulator>();
            root.AddComponent<LearningBattleModeController>();
        }

        LearningPracticePrefabUI ui = root.AddComponent<LearningPracticePrefabUI>();

        RectTransform sentenceRoot = CreateSentenceRoot(canvas.transform);
        RectTransform cardRoot = CreateCardRoot(canvas.transform);
        TMP_Text titleText = CreateText(canvas.transform, "TitleText", AnchorTop(0f, -80f, 0f, 120f), 46, TextAlignmentOptions.Center);
        TMP_Text resultText = CreateText(canvas.transform, "ResultText", AnchorTop(0f, -150f, 0f, 80f), 34, TextAlignmentOptions.Center);
        Button submitButton = CreateButton(canvas.transform, "SubmitButton", "제출", AnchorBottom(-170f, 95f, 300f, 92f));
        Button restartButton = CreateButton(canvas.transform, "RestartButton", "다시", AnchorBottom(170f, 95f, 300f, 92f));

        SerializedObject so = new SerializedObject(ui);
        SetObject(so, "controller", controller);
        SetEnum(so, "modeType", mode);
        SetInt(so, "startStage", GetDefaultStage(mode));
        SetBool(so, "startOnAwake", mode == LearningModeType.Practice);
        SetObject(so, "sentenceRoot", sentenceRoot);
        SetObject(so, "cardRoot", cardRoot);
        SetObject(so, "wordBlockPrefab", wordPrefab);
        SetObject(so, "blankBlockPrefab", blankPrefab);
        SetObject(so, "posCardPrefab", cardPrefab);
        SetObject(so, "titleText", titleText);
        SetObject(so, "resultText", resultText);
        SetObject(so, "submitButton", submitButton);
        SetObject(so, "restartButton", restartButton);
        so.ApplyModifiedPropertiesWithoutUndo();

        EditorUtility.SetDirty(root);
        EditorUtility.SetDirty(canvas);
        EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
        Debug.Log($"[LearningGameSceneSetup] Installed prefab game UI for {mode}.");
    }

    private static Canvas CreateCanvas(LearningModeType mode)
    {
        GameObject go = new GameObject($"Learning{mode}Canvas");
        Canvas canvas = go.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        CanvasScaler scaler = go.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080f, 1920f);
        scaler.matchWidthOrHeight = 0.5f;
        go.AddComponent<GraphicRaycaster>();

        GameObject background = new GameObject("Background");
        background.transform.SetParent(go.transform, false);
        Image image = background.AddComponent<Image>();
        image.color = new Color(0.94f, 0.96f, 1f, 1f);
        RectTransform rect = background.GetComponent<RectTransform>();
        Stretch(rect);
        return canvas;
    }

    private static RectTransform CreateSentenceRoot(Transform parent)
    {
        GameObject go = new GameObject("SentenceRoot");
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.06f, 0.52f);
        rect.anchorMax = new Vector2(0.94f, 0.78f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        HorizontalLayoutGroup layout = go.AddComponent<HorizontalLayoutGroup>();
        layout.childAlignment = TextAnchor.MiddleCenter;
        layout.spacing = 12f;
        layout.childControlWidth = false;
        layout.childControlHeight = false;
        layout.childForceExpandWidth = false;
        layout.childForceExpandHeight = false;
        ContentSizeFitter fitter = go.AddComponent<ContentSizeFitter>();
        fitter.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;
        fitter.verticalFit = ContentSizeFitter.FitMode.Unconstrained;
        return rect;
    }

    private static RectTransform CreateCardRoot(Transform parent)
    {
        GameObject go = new GameObject("CardRoot");
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.05f, 0.08f);
        rect.anchorMax = new Vector2(0.95f, 0.42f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        GridLayoutGroup grid = go.AddComponent<GridLayoutGroup>();
        grid.cellSize = new Vector2(190f, 96f);
        grid.spacing = new Vector2(16f, 16f);
        grid.childAlignment = TextAnchor.UpperCenter;
        return rect;
    }

    private static TMP_Text CreateText(Transform parent, string name, RectSpec spec, float size, TextAlignmentOptions alignment)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
        text.font = LoadDefaultFont();
        text.fontSize = size;
        text.color = new Color(0.12f, 0.16f, 0.24f, 1f);
        text.alignment = alignment;
        text.text = name;
        ApplyRect(go.GetComponent<RectTransform>(), spec);
        return text;
    }

    private static Button CreateButton(Transform parent, string name, string label, RectSpec spec)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        Image image = go.AddComponent<Image>();
        image.color = new Color(0.2f, 0.38f, 0.78f, 1f);
        Button button = go.AddComponent<Button>();
        ApplyRect(go.GetComponent<RectTransform>(), spec);

        TMP_Text text = CreateText(go.transform, "Label", StretchSpec(), 34, TextAlignmentOptions.Center);
        text.text = label;
        text.color = Color.white;
        return button;
    }

    private static void EnsureEventSystem()
    {
        if (Object.FindFirstObjectByType<EventSystem>() != null) return;
        GameObject go = new GameObject("EventSystem");
        go.AddComponent<EventSystem>();
        go.AddComponent<StandaloneInputModule>();
    }

    private static TMP_FontAsset LoadDefaultFont()
    {
        return AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(DefaultFontPath);
    }

    private static void RemoveGeneratedRoot()
    {
        GameObject existing = GameObject.Find("LearningGameRoot");
        if (existing != null) Object.DestroyImmediate(existing);

        Canvas[] canvases = Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None);
        for (int i = canvases.Length - 1; i >= 0; i--)
        {
            if (canvases[i] != null && canvases[i].name.StartsWith("Learning") && canvases[i].name.EndsWith("Canvas"))
            {
                Object.DestroyImmediate(canvases[i].gameObject);
            }
        }
    }

    private static int GetDefaultStage(LearningModeType mode)
    {
        switch (mode)
        {
            case LearningModeType.Exploration:
                return LearningPlayerProfile.ExplorationStage;
            case LearningModeType.Battle:
                return LearningPlayerProfile.BattleDifficulty;
            default:
                return LearningPlayerProfile.PracticeStage;
        }
    }

    private static void SetObject(SerializedObject so, string property, Object value)
    {
        SerializedProperty prop = so.FindProperty(property);
        if (prop != null) prop.objectReferenceValue = value;
    }

    private static void SetEnum(SerializedObject so, string property, LearningModeType value)
    {
        SerializedProperty prop = so.FindProperty(property);
        if (prop != null) prop.enumValueIndex = (int)value;
    }

    private static void SetInt(SerializedObject so, string property, int value)
    {
        SerializedProperty prop = so.FindProperty(property);
        if (prop != null) prop.intValue = value;
    }

    private static void SetBool(SerializedObject so, string property, bool value)
    {
        SerializedProperty prop = so.FindProperty(property);
        if (prop != null) prop.boolValue = value;
    }

    private static void Stretch(RectTransform rect)
    {
        ApplyRect(rect, StretchSpec());
    }

    private static RectSpec StretchSpec()
    {
        return new RectSpec
        {
            anchorMin = Vector2.zero,
            anchorMax = Vector2.one,
            offsetMin = Vector2.zero,
            offsetMax = Vector2.zero,
            useOffsets = true,
        };
    }

    private static RectSpec AnchorTop(float x, float y, float width, float height)
    {
        return new RectSpec
        {
            anchorMin = new Vector2(0.5f, 1f),
            anchorMax = new Vector2(0.5f, 1f),
            pivot = new Vector2(0.5f, 1f),
            anchoredPosition = new Vector2(x, y),
            sizeDelta = new Vector2(width <= 0f ? 920f : width, height),
        };
    }

    private static RectSpec AnchorBottom(float x, float y, float width, float height)
    {
        return new RectSpec
        {
            anchorMin = new Vector2(0.5f, 0f),
            anchorMax = new Vector2(0.5f, 0f),
            pivot = new Vector2(0.5f, 0f),
            anchoredPosition = new Vector2(x, y),
            sizeDelta = new Vector2(width, height),
        };
    }

    private static void ApplyRect(RectTransform rect, RectSpec spec)
    {
        rect.anchorMin = spec.anchorMin;
        rect.anchorMax = spec.anchorMax;
        rect.pivot = spec.pivot;
        if (spec.useOffsets)
        {
            rect.offsetMin = spec.offsetMin;
            rect.offsetMax = spec.offsetMax;
        }
        else
        {
            rect.anchoredPosition = spec.anchoredPosition;
            rect.sizeDelta = spec.sizeDelta;
        }
    }

    private struct RectSpec
    {
        public Vector2 anchorMin;
        public Vector2 anchorMax;
        public Vector2 pivot;
        public Vector2 anchoredPosition;
        public Vector2 sizeDelta;
        public Vector2 offsetMin;
        public Vector2 offsetMax;
        public bool useOffsets;
    }
}
#endif
