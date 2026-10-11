using UnityEngine;

public enum LearningLobbyQuickStartType
{
    Practice,
    Exploration,
    Battle,
}

public class LearningLobbyQuickStartButton : MonoBehaviour
{
    [SerializeField] private LearningLobbyQuickStartType quickStartType;

    public LearningLobbyQuickStartType QuickStartType => quickStartType;
}
