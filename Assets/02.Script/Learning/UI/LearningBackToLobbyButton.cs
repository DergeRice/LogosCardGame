using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Button))]
public class LearningBackToLobbyButton : MonoBehaviour
{
    private Button button;

    private void Awake()
    {
        button = GetComponent<Button>();
        button.onClick.RemoveListener(GoLobby);
        button.onClick.AddListener(GoLobby);
    }

    private void OnDestroy()
    {
        if (button != null) button.onClick.RemoveListener(GoLobby);
    }

    public void GoLobby()
    {
        Debug.Log("[LearningBackToLobbyButton] Load lobby.");
        LearningSceneLoader.LoadLobby();
    }
}
