using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

[DisallowMultipleComponent]
[RequireComponent(typeof(Button))]
public class LearningActionButton : MonoBehaviour
{
    [SerializeField] private LearningActionType actionType;
    [SerializeField] private string popupId;
    [SerializeField] private bool logOnExecute = true;
    [SerializeField] private bool breakOnExecute;

    private Button button;

    public LearningActionType ActionType => actionType;
    public string PopupId => popupId;

    public void Configure(LearningActionType action, string popup = "")
    {
        actionType = action;
        popupId = popup;
    }

    private void Awake()
    {
        button = GetComponent<Button>();
        DisableInspectorOnClickListeners();
        button.onClick.RemoveListener(Execute);
        button.onClick.AddListener(Execute);
    }

    private void OnDestroy()
    {
        if (button != null) button.onClick.RemoveListener(Execute);
    }

    [ContextMenu("Execute Action")]
    public void Execute()
    {
        if (button == null) button = GetComponent<Button>();
        if (button != null && !button.interactable) return;
        if (actionType == LearningActionType.None) return;

        if (logOnExecute)
        {
            Debug.Log($"[LearningActionButton] {GetHierarchyPath(transform)} -> {actionType} popupId={popupId}", this);
        }

        if (breakOnExecute)
        {
            Debug.Break();
        }

        LearningActionDispatcher.Instance.Execute(this);
    }

    private void DisableInspectorOnClickListeners()
    {
        if (button == null) return;

        int listenerCount = button.onClick.GetPersistentEventCount();
        for (int i = 0; i < listenerCount; i++)
        {
            button.onClick.SetPersistentListenerState(i, UnityEventCallState.Off);
        }
    }

    private static string GetHierarchyPath(Transform target)
    {
        if (target == null) return string.Empty;

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
