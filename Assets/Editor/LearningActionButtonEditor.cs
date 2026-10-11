#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.IMGUI.Controls;
using UnityEngine;

[CustomEditor(typeof(LearningActionButton))]
public class LearningActionButtonEditor : Editor
{
    private SerializedProperty actionType;
    private SerializedProperty popupId;
    private SerializedProperty logOnExecute;
    private SerializedProperty breakOnExecute;
    private ActionDropdown dropdown;

    private void OnEnable()
    {
        actionType = serializedObject.FindProperty("actionType");
        popupId = serializedObject.FindProperty("popupId");
        logOnExecute = serializedObject.FindProperty("logOnExecute");
        breakOnExecute = serializedObject.FindProperty("breakOnExecute");
    }

    public override void OnInspectorGUI()
    {
        serializedObject.Update();

        EditorGUILayout.LabelField("Action", EditorStyles.boldLabel);
        using (new EditorGUILayout.HorizontalScope())
        {
            EditorGUILayout.LabelField("Selected", ObjectNames.NicifyVariableName(((LearningActionType)actionType.enumValueIndex).ToString()));
            if (GUILayout.Button("Search...", GUILayout.Width(100f)))
            {
                dropdown = new ActionDropdown(new AdvancedDropdownState(), selected =>
                {
                    actionType.enumValueIndex = (int)selected;
                    serializedObject.ApplyModifiedProperties();
                    EditorUtility.SetDirty(target);
                });
                dropdown.Show(new Rect(Event.current.mousePosition, Vector2.zero));
            }
        }

        if (NeedsPopupId((LearningActionType)actionType.enumValueIndex))
        {
            EditorGUILayout.PropertyField(popupId);
        }

        EditorGUILayout.Space(8f);
        EditorGUILayout.PropertyField(logOnExecute);
        EditorGUILayout.PropertyField(breakOnExecute);

        EditorGUILayout.Space(8f);
        if (GUILayout.Button("Execute Now"))
        {
            ((LearningActionButton)target).Execute();
        }

        serializedObject.ApplyModifiedProperties();
    }

    private static bool NeedsPopupId(LearningActionType type)
    {
        return type == LearningActionType.OpenPopup ||
               type == LearningActionType.ClosePopup ||
               type == LearningActionType.TogglePopup;
    }

    private sealed class ActionDropdown : AdvancedDropdown
    {
        private readonly Action<LearningActionType> onSelected;

        public ActionDropdown(AdvancedDropdownState state, Action<LearningActionType> onSelected) : base(state)
        {
            this.onSelected = onSelected;
            minimumSize = new Vector2(360f, 420f);
        }

        protected override AdvancedDropdownItem BuildRoot()
        {
            var root = new AdvancedDropdownItem("Learning Actions");
            var folders = new Dictionary<string, AdvancedDropdownItem>();

            foreach (LearningActionType type in Enum.GetValues(typeof(LearningActionType)))
            {
                string path = GetPath(type);
                string[] parts = path.Split('/');
                AdvancedDropdownItem parent = root;
                string folderPath = string.Empty;

                for (int i = 0; i < parts.Length - 1; i++)
                {
                    folderPath = string.IsNullOrEmpty(folderPath) ? parts[i] : $"{folderPath}/{parts[i]}";
                    if (!folders.TryGetValue(folderPath, out AdvancedDropdownItem folder))
                    {
                        folder = new AdvancedDropdownItem(parts[i]);
                        folders.Add(folderPath, folder);
                        parent.AddChild(folder);
                    }
                    parent = folder;
                }

                parent.AddChild(new ActionDropdownItem(parts[parts.Length - 1], type));
            }

            return root;
        }

        protected override void ItemSelected(AdvancedDropdownItem item)
        {
            if (item is ActionDropdownItem actionItem)
            {
                onSelected?.Invoke(actionItem.ActionType);
            }
        }

        private static string GetPath(LearningActionType type)
        {
            switch (type)
            {
                case LearningActionType.None: return "None";
                case LearningActionType.TabLearning: return "Tabs/Learning";
                case LearningActionType.TabExploration: return "Tabs/Exploration";
                case LearningActionType.TabHome: return "Tabs/Home";
                case LearningActionType.TabBattle: return "Tabs/Battle";
                case LearningActionType.TabProfile: return "Tabs/Profile";
                case LearningActionType.StartPractice: return "Scene/Start Practice";
                case LearningActionType.StartExploration: return "Scene/Start Exploration";
                case LearningActionType.StartBattle: return "Scene/Start Battle";
                case LearningActionType.StartStudyFromSettings: return "Study/Start Study From Settings";
                case LearningActionType.OpenPopup: return "Popup/Open By Id";
                case LearningActionType.ClosePopup: return "Popup/Close By Id";
                case LearningActionType.TogglePopup: return "Popup/Toggle By Id";
                case LearningActionType.CloseAllPopups: return "Popup/Close All";
                case LearningActionType.SetStudyShape: return "Study/Set Shape Mode";
                case LearningActionType.SetStudyNumber: return "Study/Set Number Mode";
                case LearningActionType.SetStudyPartOfSpeech: return "Study/Set POS Mode";
                case LearningActionType.ExplorationContinueOrStart: return "Exploration/Continue Or Start";
                case LearningActionType.ExplorationAbandonAndStart: return "Exploration/Abandon And Start";
                case LearningActionType.ExplorationAbandonAndEnter: return "Exploration/Abandon And Enter";
                case LearningActionType.BattleQuickAI: return "Battle/Quick AI";
                case LearningActionType.BattleSetFillBlankMode: return "Battle/Mode/Fill Blank";
                case LearningActionType.BattleSetSentenceBuildMode: return "Battle/Mode/Sentence Build";
                case LearningActionType.BattleCreateRoomUnsupported: return "Battle/Create Room Unsupported";
                case LearningActionType.BattleJoinRoomUnsupported: return "Battle/Join Room Unsupported";
                case LearningActionType.CloudSave: return "Cloud/Save";
                case LearningActionType.CloudLoad: return "Cloud/Load";
                case LearningActionType.LinkGoogle: return "Cloud/Link Google";
                case LearningActionType.CopyPlayerId: return "Clipboard/Copy Player Id";
                case LearningActionType.CopyUuid: return "Clipboard/Copy UUID";
                case LearningActionType.OpenSettings: return "Popup/Open Settings";
                case LearningActionType.CloseSettings: return "Popup/Close Settings";
                case LearningActionType.OpenIapShop: return "Popup/Open IAP Shop";
                case LearningActionType.CloseIapShop: return "Popup/Close IAP Shop";
                case LearningActionType.OpenAttendance: return "Popup/Open Attendance";
                case LearningActionType.CloseAttendance: return "Popup/Close Attendance";
                case LearningActionType.ClaimAttendance: return "Attendance/Claim Today";
                case LearningActionType.ShopReroll: return "Shop/Reroll";
                case LearningActionType.IapBuyStaminaPack: return "IAP/Buy Stamina Pack";
                case LearningActionType.IapBuyAdRemoval: return "IAP/Buy Ad Removal";
                case LearningActionType.IapRestorePurchases: return "IAP/Restore Purchases";
                default: return type.ToString();
            }
        }
    }

    private sealed class ActionDropdownItem : AdvancedDropdownItem
    {
        public LearningActionType ActionType { get; }

        public ActionDropdownItem(string name, LearningActionType actionType) : base(name)
        {
            ActionType = actionType;
        }
    }
}
#endif
