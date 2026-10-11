using UnityEngine;

public class LearningScreenRouter : MonoBehaviour
{
    [SerializeField] private GameObject loginScreen;
    [SerializeField] private GameObject lobbyScreen;
    [SerializeField] private GameObject practiceScreen;
    [SerializeField] private GameObject explorationScreen;
    [SerializeField] private GameObject battleScreen;
    [SerializeField] private LearningScreenType startScreen = LearningScreenType.Login;

    public LearningScreenType Current { get; private set; }

    private void Start()
    {
        Show(startScreen);
    }

    public void ShowLogin() => Show(LearningScreenType.Login);
    public void ShowLobby() => Show(LearningScreenType.Lobby);
    public void ShowPractice() => Show(LearningScreenType.Practice);
    public void ShowExploration() => Show(LearningScreenType.Exploration);
    public void ShowBattle() => Show(LearningScreenType.Battle);

    public void Show(LearningScreenType screen)
    {
        Current = screen;
        Set(loginScreen, screen == LearningScreenType.Login);
        Set(lobbyScreen, screen == LearningScreenType.Lobby);
        Set(practiceScreen, screen == LearningScreenType.Practice);
        Set(explorationScreen, screen == LearningScreenType.Exploration);
        Set(battleScreen, screen == LearningScreenType.Battle);
    }

    private static void Set(GameObject go, bool active)
    {
        if (go != null) go.SetActive(active);
    }
}
