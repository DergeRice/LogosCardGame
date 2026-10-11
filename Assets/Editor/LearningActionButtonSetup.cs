#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Events;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public static class LearningActionButtonSetup
{
    [MenuItem("Tools/Learning/Add Action Buttons To Current Scene")]
    public static void AddActionButtonsToCurrentScene()
    {
        Button[] buttons = Resources.FindObjectsOfTypeAll<Button>();
        int added = 0;
        int skippedTabs = 0;
        int persistentOnClickWarnings = 0;
        int mapped = 0;
        int clearedOnClicks = 0;

        for (int i = 0; i < buttons.Length; i++)
        {
            Button button = buttons[i];
            if (button == null || !button.gameObject.scene.IsValid()) continue;
            if (button.GetComponent<LearningLobbyTabButton>() != null)
            {
                skippedTabs++;
                continue;
            }

            LearningActionType inferredAction = InferAction(button);
            if (button.onClick.GetPersistentEventCount() > 0)
            {
                persistentOnClickWarnings++;
            }

            LearningActionButton actionButton = button.GetComponent<LearningActionButton>();
            if (actionButton == null)
            {
                actionButton = Undo.AddComponent<LearningActionButton>(button.gameObject);
                added++;
            }

            if (inferredAction != LearningActionType.None)
            {
                SetAction(actionButton, inferredAction);
                mapped++;
            }

            int persistentCount = button.onClick.GetPersistentEventCount();
            if (persistentCount > 0)
            {
                for (int index = persistentCount - 1; index >= 0; index--)
                {
                    UnityEventTools.RemovePersistentListener(button.onClick, index);
                    clearedOnClicks++;
                }
                EditorUtility.SetDirty(button);
            }

            EditorUtility.SetDirty(button.gameObject);
        }

        EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
        Debug.Log($"[LearningActionButtonSetup] Added={added}, Mapped={mapped}, SkippedTabs={skippedTabs}, OnClickWarnings={persistentOnClickWarnings}, ClearedOnClicks={clearedOnClicks}");
    }

    private static void SetAction(LearningActionButton actionButton, LearningActionType actionType)
    {
        SerializedObject so = new SerializedObject(actionButton);
        SerializedProperty action = so.FindProperty("actionType");
        if (action != null) action.enumValueIndex = (int)actionType;
        SerializedProperty log = so.FindProperty("logOnExecute");
        if (log != null) log.boolValue = true;
        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(actionButton);
    }

    private static LearningActionType InferAction(Button button)
    {
        string path = GetPath(button.transform);
        string method = GetFirstPersistentMethod(button);
        switch (method)
        {
            case "SelectLearning":
                return LearningActionType.TabLearning;
            case "SelectExploration":
                return LearningActionType.TabExploration;
            case "SelectHome":
                return LearningActionType.TabHome;
            case "SelectBattle":
                return LearningActionType.TabBattle;
            case "SelectProfile":
                return LearningActionType.TabProfile;
            case "StartStudy":
                return LearningActionType.StartStudyFromSettings;
            case "SetShapeProblems":
                return LearningActionType.SetStudyShape;
            case "SetNumberProblems":
                return LearningActionType.SetStudyNumber;
            case "SetPartOfSpeechProblems":
                return LearningActionType.SetStudyPartOfSpeech;
            case "ContinueOrStartRun":
                return LearningActionType.ExplorationContinueOrStart;
            case "QuickBattleAI":
                return LearningActionType.BattleQuickAI;
            case "SetFillBlankMode":
                return LearningActionType.BattleSetFillBlankMode;
            case "SetSentenceBuildMode":
                return LearningActionType.BattleSetSentenceBuildMode;
        }

        if (path.Contains("/Panels/Home/Pratice") && !path.EndsWith("/Plus")) return LearningActionType.StartStudyFromSettings;
        if (path.Contains("/Panels/Home/Explore") && !path.EndsWith("/Plus")) return LearningActionType.ExplorationContinueOrStart;
        if (path.Contains("/Panels/Home/Battle") && !path.EndsWith("/Plus")) return LearningActionType.BattleQuickAI;
        if (path.Contains("/Panels/LearningPanel/Pratice") && !path.Contains("/Tab/")) return LearningActionType.StartStudyFromSettings;
        if (path.Contains("/Panels/ExplorePanel/Pratice (3)")) return LearningActionType.ExplorationContinueOrStart;
        if (path.Contains("/Panels/LearningPanel/Battle")) return LearningActionType.BattleQuickAI;

        return LearningActionType.None;
    }

    private static string GetFirstPersistentMethod(Button button)
    {
        int count = button.onClick.GetPersistentEventCount();
        for (int i = 0; i < count; i++)
        {
            string method = button.onClick.GetPersistentMethodName(i);
            if (!string.IsNullOrWhiteSpace(method)) return method;
        }
        return string.Empty;
    }

    private static string GetPath(Transform target)
    {
        string path = target.name;
        Transform parent = target.parent;
        while (parent != null)
        {
            path = $"{parent.name}/{path}";
            parent = parent.parent;
        }
        return path;
    }
}
#endif
