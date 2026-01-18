using UnityEngine;

public class UserData
{
   public string gameNickName;
}

public class UserDataManager : MonoBehaviour
{

    public static UserDataManager instance;

    UserData ownData;

    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(this);
        }
        else Destroy(gameObject);
    }

    void Start()
    {
        ownData = new UserData();

        ownData.gameNickName = Random.Range(0, 9999).ToString();
        LobbySceneManager.instance.lobbyUIManager.SetMyNameText(ownData.gameNickName);
        SinglePlayerSession.LocalPlayerName = ownData.gameNickName;
    }
}
