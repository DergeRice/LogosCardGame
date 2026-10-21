using UnityEngine;

public class LobbySceneManager : MonoBehaviour
{
    public static LobbySceneManager instance;

    public LobbyUIManager lobbyUIManager;
    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            // DontDestroyOnLoad(this);
        }
        else Destroy(gameObject);
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
