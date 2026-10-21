public static class LearningSceneLoader
{
    public static void LoadLogin() => Load(LearningSceneNames.Login);
    public static void LoadLobby() => Load(LearningSceneNames.Lobby);
    public static void LoadPractice() => Load(LearningSceneNames.Practice);
    public static void LoadExploration() => Load(LearningSceneNames.Exploration);
    public static void LoadBattle() => Load(LearningSceneNames.Battle);
    public static void LoadWebBattle() => Load(LearningSceneNames.WebBattle);

    public static void Load(string sceneName)
    {
        LearningSceneLoaderRunner.Instance.Load(sceneName);
    }
}
