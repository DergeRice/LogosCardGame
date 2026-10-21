using UnityEngine;

public class LearningActionDispatcher : MonoBehaviour
{
    private static LearningActionDispatcher instance;

    public static LearningActionDispatcher Instance
    {
        get
        {
            if (instance != null) return instance;
            instance = FindFirstObjectByType<LearningActionDispatcher>();
            if (instance != null) return instance;

            GameObject go = new GameObject("LearningActionDispatcher_Auto");
            instance = go.AddComponent<LearningActionDispatcher>();
            return instance;
        }
    }

    private void Awake()
    {
        if (instance != null && instance != this) return;
        instance = this;
    }

    public void Execute(LearningActionButton source)
    {
        if (source == null) return;
        Execute(source.ActionType, source);
    }

    public void Execute(LearningActionType actionType, LearningActionButton source)
    {
        switch (actionType)
        {
            case LearningActionType.TabLearning:
                FindFirstObjectByType<LearningLobbyTabController>()?.SelectLearning();
                break;
            case LearningActionType.TabExploration:
                FindFirstObjectByType<LearningLobbyTabController>()?.SelectExploration();
                break;
            case LearningActionType.TabHome:
                FindFirstObjectByType<LearningLobbyTabController>()?.SelectHome();
                break;
            case LearningActionType.TabBattle:
                FindFirstObjectByType<LearningLobbyTabController>()?.SelectBattle();
                break;
            case LearningActionType.TabProfile:
                FindFirstObjectByType<LearningLobbyTabController>()?.SelectProfile();
                break;

            case LearningActionType.StartPractice:
                LearningSceneLoader.LoadPractice();
                break;
            case LearningActionType.StartExploration:
            case LearningActionType.ExplorationContinueOrStart:
                StartExploration();
                break;
            case LearningActionType.StartBattle:
            case LearningActionType.BattleQuickAI:
                StartBattle();
                break;
            case LearningActionType.BattleSetFillBlankMode:
                FindFirstObjectByType<LearningBattleTabBridge>()?.SetFillBlankMode();
                break;
            case LearningActionType.BattleSetSentenceBuildMode:
                FindFirstObjectByType<LearningBattleTabBridge>()?.SetSentenceBuildMode();
                break;
            case LearningActionType.StartStudyFromSettings:
                StartStudy();
                break;

            case LearningActionType.OpenPopup:
                FindFirstObjectByType<LearningPopupRegistry>()?.Open(source.PopupId);
                break;
            case LearningActionType.ClosePopup:
                FindFirstObjectByType<LearningPopupRegistry>()?.Close(source.PopupId);
                break;
            case LearningActionType.TogglePopup:
                FindFirstObjectByType<LearningPopupRegistry>()?.Toggle(source.PopupId);
                break;
            case LearningActionType.CloseAllPopups:
                FindFirstObjectByType<LearningPopupRegistry>()?.CloseAll();
                break;

            case LearningActionType.SetStudyShape:
                FindFirstObjectByType<LearningStudyTabSettings>()?.SetShapeProblems();
                break;
            case LearningActionType.SetStudyNumber:
                FindFirstObjectByType<LearningStudyTabSettings>()?.SetNumberProblems();
                break;
            case LearningActionType.SetStudyPartOfSpeech:
                FindFirstObjectByType<LearningStudyTabSettings>()?.SetPartOfSpeechProblems();
                break;

            case LearningActionType.ExplorationAbandonAndStart:
                AbandonAndStartExploration(enter: false);
                break;
            case LearningActionType.ExplorationAbandonAndEnter:
                AbandonAndStartExploration(enter: true);
                break;

            case LearningActionType.BattleCreateRoomUnsupported:
                LearningBattleTabBridge battleCreate = FindFirstObjectByType<LearningBattleTabBridge>();
                if (battleCreate != null) battleCreate.CreateRoomUnsupported();
                else Debug.Log("[LearningActionDispatcher] 방 만들기는 아직 지원하지 않습니다.");
                break;
            case LearningActionType.BattleJoinRoomUnsupported:
                LearningBattleTabBridge battleJoin = FindFirstObjectByType<LearningBattleTabBridge>();
                if (battleJoin != null) battleJoin.JoinRoomUnsupported();
                else Debug.Log("[LearningActionDispatcher] 참가하기는 아직 지원하지 않습니다.");
                break;

            case LearningActionType.CloudSave:
                FindFirstObjectByType<LearningProfileTabBridge>()?.SaveCloud();
                break;
            case LearningActionType.CloudLoad:
                FindFirstObjectByType<LearningProfileTabBridge>()?.LoadCloud();
                break;
            case LearningActionType.LinkGoogle:
                FindFirstObjectByType<LearningProfileTabBridge>()?.LinkGoogle();
                break;
            case LearningActionType.CopyPlayerId:
                FindFirstObjectByType<LearningProfileTabBridge>()?.CopyPlayerId();
                break;
            case LearningActionType.CopyUuid:
                FindFirstObjectByType<LearningSettingsView>()?.CopyUuid();
                break;

            case LearningActionType.OpenSettings:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.OpenSettings();
                break;
            case LearningActionType.CloseSettings:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.CloseSettings();
                break;
            case LearningActionType.OpenIapShop:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.OpenIapShop();
                break;
            case LearningActionType.CloseIapShop:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.CloseIapShop();
                break;
            case LearningActionType.OpenAttendance:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.OpenAttendance();
                break;
            case LearningActionType.CloseAttendance:
                FindFirstObjectByType<LearningLobbyPopupBridge>()?.CloseAttendance();
                break;

            case LearningActionType.ClaimAttendance:
                FindFirstObjectByType<LearningAttendanceView>()?.ClaimToday();
                break;
            case LearningActionType.ShopReroll:
                FindFirstObjectByType<LearningItemShopBridge>()?.RollShop();
                break;
            case LearningActionType.IapBuyStaminaPack:
                FindFirstObjectByType<LearningIapShopBridge>()?.BuyStaminaPack();
                break;
            case LearningActionType.IapBuyAdRemoval:
                FindFirstObjectByType<LearningIapShopBridge>()?.BuyAdRemoval();
                break;
            case LearningActionType.IapRestorePurchases:
                FindFirstObjectByType<LearningIapShopBridge>()?.RestorePurchases();
                break;
        }
    }

    private void StartStudy()
    {
        LearningStudyTabSettings study = FindFirstObjectByType<LearningStudyTabSettings>();
        if (study != null) study.StartStudy();
        else LearningSceneLoader.LoadPractice();
    }

    private void StartExploration()
    {
        LearningExplorationTabBridge exploration = FindFirstObjectByType<LearningExplorationTabBridge>();
        if (exploration != null)
        {
            exploration.ContinueOrStartRun();
            return;
        }

        if (!LearningExplorationRunState.HasActiveRun) LearningExplorationRunState.StartNewRun();
        LearningSceneLoader.LoadExploration();
    }

    private void AbandonAndStartExploration(bool enter)
    {
        LearningExplorationTabBridge exploration = FindFirstObjectByType<LearningExplorationTabBridge>();
        if (exploration != null)
        {
            if (enter) exploration.AbandonAndStartNewRunThenEnter();
            else exploration.AbandonAndStartNewRun();
            return;
        }

        LearningExplorationRunState.Clear();
        LearningExplorationRunState.StartNewRun();
        if (enter) LearningSceneLoader.LoadExploration();
    }

    private void StartBattle()
    {
        LearningBattleTabBridge battle = FindFirstObjectByType<LearningBattleTabBridge>();
        if (battle != null) battle.QuickBattleAI();
        else LearningSceneLoader.LoadBattle();
    }
}
