public enum LearningActionType
{
    None,

    TabLearning,
    TabExploration,
    TabHome,
    TabBattle,
    TabProfile,

    StartPractice,
    StartExploration,
    StartBattle,
    StartStudyFromSettings,

    OpenPopup,
    ClosePopup,
    TogglePopup,
    CloseAllPopups,

    SetStudyShape,
    SetStudyNumber,
    SetStudyPartOfSpeech,

    ExplorationContinueOrStart,
    ExplorationAbandonAndStart,
    ExplorationAbandonAndEnter,

    BattleQuickAI,
    BattleSetFillBlankMode,
    BattleSetSentenceBuildMode,
    BattleCreateRoomUnsupported,
    BattleJoinRoomUnsupported,

    CloudSave,
    CloudLoad,
    LinkGoogle,
    CopyPlayerId,
    CopyUuid,

    OpenSettings,
    CloseSettings,
    OpenIapShop,
    CloseIapShop,
    OpenAttendance,
    CloseAttendance,

    ClaimAttendance,
    ShopReroll,
    IapBuyStaminaPack,
    IapBuyAdRemoval,
    IapRestorePurchases,
}
