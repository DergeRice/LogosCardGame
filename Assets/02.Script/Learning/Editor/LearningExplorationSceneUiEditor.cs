#if UNITY_EDITOR
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class LearningExplorationSceneUiEditor
{
    [MenuItem("Learning/Create Exploration Scene UI")]
    public static void CreateExplorationSceneUI()
    {
        LearningExplorationSentenceUI existing = Object.FindFirstObjectByType<LearningExplorationSentenceUI>();
        if (existing != null)
        {
            Selection.activeGameObject = existing.gameObject;
            EditorGUIUtility.PingObject(existing.gameObject);
            return;
        }

        Canvas canvas = Object.FindFirstObjectByType<Canvas>();
        if (canvas == null)
        {
            GameObject canvasGo = new GameObject("ExplorationSceneCanvas");
            Undo.RegisterCreatedObjectUndo(canvasGo, "Create Exploration Canvas");
            canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();
        }

        GameObject root = new GameObject("ExplorationSceneUI");
        Undo.RegisterCreatedObjectUndo(root, "Create Exploration Scene UI");
        root.transform.SetParent(canvas.transform, false);
        RectTransform rootRect = root.AddComponent<RectTransform>();
        Stretch(rootRect);
        LearningExplorationSentenceUI ui = root.AddComponent<LearningExplorationSentenceUI>();

        Image monsterImage = CreateImage(root.transform, "BackgroundMonster", Vector2.zero, Vector2.one, new Color(1f, 1f, 1f, 0.82f));
        monsterImage.raycastTarget = false;
        monsterImage.preserveAspect = true;

        Image hpBg = CreateImage(root.transform, "MonsterHpBg", new Vector2(0.12f, 0.78f), new Vector2(0.88f, 0.805f), new Color(0.09f, 0.08f, 0.08f, 0.82f));
        Image hpDelay = CreateFillImage(hpBg.transform, "MonsterHpDelayFill", new Color(1f, 0.82f, 0.12f, 0.95f));
        Image hpFill = CreateFillImage(hpBg.transform, "MonsterHpFill", new Color(0.9f, 0.16f, 0.16f, 0.95f));

        TMP_Text monsterHpText = CreateText(root.transform, "MonsterHpText", new Vector2(0.5f, 0.81f), new Vector2(0.5f, 0.81f), Vector2.zero, new Vector2(720f, 52f), 28f);
        TMP_Text clearText = CreateText(root.transform, "ClearText", new Vector2(0.5f, 0.58f), new Vector2(0.5f, 0.58f), Vector2.zero, new Vector2(760f, 110f), 64f);
        clearText.text = "Clear!";
        clearText.color = new Color(1f, 0.82f, 0.12f, 1f);
        clearText.gameObject.SetActive(false);

        TMP_Text titleText = CreateText(root.transform, "Title", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -120f), new Vector2(920f, 70f), 42f);
        TMP_Text hpText = CreateText(root.transform, "Hp", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -190f), new Vector2(920f, 58f), 34f);
        TMP_Text countText = CreateText(root.transform, "Counts", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -250f), new Vector2(920f, 52f), 28f);
        TMP_Text messageText = CreateText(root.transform, "Message", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -315f), new Vector2(920f, 70f), 28f);

        Transform itemRoot = CreateHorizontalRoot(root.transform, "ItemRoot", new Vector2(0.05f, 0.49f), new Vector2(0.95f, 0.54f), 10f);
        Transform sentenceRoot = CreateHorizontalRoot(root.transform, "SentenceRoot", new Vector2(0.05f, 0.57f), new Vector2(0.95f, 0.73f), 16f);
        Transform handRoot = CreateGridRoot(root.transform, "HandRoot", new Vector2(0.05f, 0.12f), new Vector2(0.95f, 0.45f));

        Button lobbyButton = CreateButton(root.transform, "LobbyButton", "로비", new Vector2(0.05f, 0.92f), new Vector2(0.2f, 0.97f));
        Button deckButton = CreateButton(root.transform, "DeckButton", "덱보기", new Vector2(0.78f, 0.92f), new Vector2(0.93f, 0.97f));
        Button submitButton = CreateButton(root.transform, "SubmitButton", "제출", new Vector2(0.32f, 0.04f), new Vector2(0.48f, 0.09f));
        Button dropButton = CreateButton(root.transform, "DropButton", "드로우", new Vector2(0.52f, 0.04f), new Vector2(0.68f, 0.09f));

        SerializedObject serialized = new SerializedObject(ui);
        SetObject(serialized, "uiRootRect", rootRect);
        SetObject(serialized, "titleText", titleText);
        SetObject(serialized, "hpText", hpText);
        SetObject(serialized, "countText", countText);
        SetObject(serialized, "messageText", messageText);
        SetObject(serialized, "monsterImage", monsterImage);
        SetObject(serialized, "monsterHpFill", hpFill);
        SetObject(serialized, "monsterHpDelayFill", hpDelay);
        SetObject(serialized, "monsterHpText", monsterHpText);
        SetObject(serialized, "clearText", clearText);
        SetObject(serialized, "sentenceRoot", sentenceRoot);
        SetObject(serialized, "handRoot", handRoot);
        SetObject(serialized, "itemRoot", itemRoot);
        SetObject(serialized, "submitButton", submitButton);
        SetObject(serialized, "dropButton", dropButton);
        SetObject(serialized, "lobbyButton", lobbyButton);
        SetObject(serialized, "deckButton", deckButton);
        serialized.ApplyModifiedPropertiesWithoutUndo();

        Selection.activeGameObject = root;
        EditorGUIUtility.PingObject(root);
        EditorSceneManagerBridge.MarkActiveSceneDirty();
    }

    private static Image CreateImage(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Color color)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        RectTransform rect = go.AddComponent<RectTransform>();
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
        Image image = go.AddComponent<Image>();
        image.color = color;
        return image;
    }

    private static Image CreateFillImage(Transform parent, string name, Color color)
    {
        Image image = CreateImage(parent, name, Vector2.zero, Vector2.one, color);
        image.type = Image.Type.Filled;
        image.fillMethod = Image.FillMethod.Horizontal;
        image.fillOrigin = (int)Image.OriginHorizontal.Left;
        image.fillAmount = 1f;
        return image;
    }

    private static TMP_Text CreateText(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 size, float fontSize)
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
        text.font = LearningFontProvider.DefaultFont;
        text.text = name;
        text.fontSize = fontSize;
        text.color = new Color(0.12f, 0.16f, 0.24f, 1f);
        text.alignment = TextAlignmentOptions.Center;
        return text;
    }

    private static Transform CreateHorizontalRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, float spacing)
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

    private static Transform CreateGridRoot(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax)
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

    private static Button CreateButton(Transform parent, string objectName, string label, Vector2 anchorMin, Vector2 anchorMax)
    {
        Image image = CreateImage(parent, objectName, anchorMin, anchorMax, Color.white);
        Button button = image.gameObject.AddComponent<Button>();
        TMP_Text text = CreateText(image.transform, "Label", Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero, 30f);
        text.text = label;
        text.color = new Color(0.16f, 0.2f, 0.28f, 1f);
        return button;
    }

    private static void Stretch(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
    }

    private static void SetObject(SerializedObject serialized, string propertyName, Object value)
    {
        SerializedProperty property = serialized.FindProperty(propertyName);
        if (property != null) property.objectReferenceValue = value;
    }
}

internal static class EditorSceneManagerBridge
{
    public static void MarkActiveSceneDirty()
    {
        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
    }
}
#endif
