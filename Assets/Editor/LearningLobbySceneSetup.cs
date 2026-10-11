#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class LearningLobbySceneSetup
{
    [MenuItem("Tools/Learning/Setup Lobby Scene Wiring")]
    public static void SetupLobbySceneWiring()
    {
        if (UnityEngine.SceneManagement.SceneManager.GetActiveScene().name != LearningSceneNames.Lobby)
        {
            EditorSceneManager.OpenScene("Assets/01.Scene/2.LobbyScreen.unity");
        }

        GameObject tabControllerObject = FindByName("LobbyTabController");
        LearningLobbyTabController tabController = EnsureComponent<LearningLobbyTabController>(tabControllerObject);
        if (tabController != null)
        {
            SerializedObject so = new SerializedObject(tabController);
            SetObject(so, "tabFocus", FindTabFocusNearTabs());
            SetObject(so, "learningPanel", FindRect("LearningPanel"));
            SetObject(so, "explorationPanel", FindRect("ExplorePanel"));
            SetObject(so, "homePanel", FindRect("Home"));
            SetObject(so, "battlePanel", FindRect("BattlePanel"));
            SetObject(so, "profilePanel", FindRect("ProfilePanel"));
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(tabController);
        }

        EnsureComponent<LearningStudyTabSettings>(FindByName("LearningPanel"));
        EnsureComponent<LearningExplorationTabBridge>(FindByName("ExplorePanel"));
        EnsureComponent<LearningBattleTabBridge>(FindByName("BattlePanel"));
        EnsureComponent<LearningProfileTabBridge>(FindByName("ProfilePanel"));

        GameObject popupRoot = FindByName("Popups") ?? FindByName("Popup") ?? FindByName("Panels");
        EnsureComponent<LearningLobbyPopupBridge>(popupRoot);

        RemoveInvalidTabComponents();
        LearningButtonFeedbackSetup.AddPressFeedbackToCurrentSceneButtons();
        LearningActionButtonSetup.AddActionButtonsToCurrentScene();

        EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
        EditorSceneManager.SaveOpenScenes();
        Debug.Log("[LearningLobbySceneSetup] Lobby scene wiring complete.");
    }

    private static void RemoveInvalidTabComponents()
    {
        LearningLobbyTabButton[] tabs = Resources.FindObjectsOfTypeAll<LearningLobbyTabButton>();
        for (int i = 0; i < tabs.Length; i++)
        {
            LearningLobbyTabButton tab = tabs[i];
            if (tab == null || !tab.gameObject.scene.IsValid()) continue;

            LearningLobbyQuickStartButton quickStart = tab.GetComponent<LearningLobbyQuickStartButton>();
            if (quickStart != null) Object.DestroyImmediate(quickStart, true);

            LearningPressableButtonFeedback feedback = tab.GetComponent<LearningPressableButtonFeedback>();
            if (feedback != null) Object.DestroyImmediate(feedback, true);

            RectTransform rect = tab.transform as RectTransform;
            if (rect != null)
            {
                rect.localScale = Vector3.one;
                rect.anchoredPosition = Vector2.zero;
            }

            SerializedObject so = new SerializedObject(tab);
            SerializedProperty iconRoot = so.FindProperty("iconRoot");
            if (iconRoot != null) iconRoot.objectReferenceValue = null;
            so.ApplyModifiedPropertiesWithoutUndo();

            EditorUtility.SetDirty(tab.gameObject);
        }
    }

    private static RectTransform FindRect(string name)
    {
        GameObject go = FindByName(name);
        return go != null ? go.GetComponent<RectTransform>() : null;
    }

    private static RectTransform FindTabFocusNearTabs()
    {
        LearningLobbyTabButton firstTab = Object.FindFirstObjectByType<LearningLobbyTabButton>();
        RectTransform tabParent = firstTab != null ? firstTab.transform.parent as RectTransform : null;
        if (tabParent != null)
        {
            RectTransform[] children = tabParent.GetComponentsInChildren<RectTransform>(true);
            for (int i = 0; i < children.Length; i++)
            {
                if (children[i] != null && children[i].name == "TabFocus") return children[i];
            }
        }

        return FindRect("TabFocus");
    }

    private static void SetObject(SerializedObject so, string propertyName, Object value)
    {
        SerializedProperty prop = so.FindProperty(propertyName);
        if (prop != null) prop.objectReferenceValue = value;
    }

    private static T EnsureComponent<T>(GameObject go) where T : Component
    {
        if (go == null) return null;
        T component = go.GetComponent<T>();
        if (component != null) return component;
        component = go.AddComponent<T>();
        EditorUtility.SetDirty(go);
        return component;
    }

    private static GameObject FindByName(string name)
    {
        GameObject[] all = Resources.FindObjectsOfTypeAll<GameObject>();
        for (int i = 0; i < all.Length; i++)
        {
            GameObject go = all[i];
            if (go == null || go.name != name) continue;
            if (!go.scene.IsValid()) continue;
            return go;
        }
        return null;
    }
}
#endif
