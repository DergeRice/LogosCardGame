#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public static class LearningButtonFeedbackSetup
{
    [MenuItem("Tools/Learning/Add Press Feedback To Current Scene Buttons")]
    public static void AddPressFeedbackToCurrentSceneButtons()
    {
        Button[] buttons = Resources.FindObjectsOfTypeAll<Button>();
        int added = 0;

        for (int i = 0; i < buttons.Length; i++)
        {
            Button button = buttons[i];
            if (button == null || !button.gameObject.scene.IsValid()) continue;
            if (button.GetComponent<LearningLobbyTabButton>() != null) continue;
            if (button.GetComponent<LearningPressableButtonFeedback>() != null) continue;

            Undo.AddComponent<LearningPressableButtonFeedback>(button.gameObject);
            EditorUtility.SetDirty(button.gameObject);
            added++;
        }

        EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());
        Debug.Log($"[LearningButtonFeedbackSetup] Added press feedback to {added} buttons.");
    }
}
#endif
