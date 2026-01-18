using UnityEngine;
using UnityEngine.SceneManagement;

public class LoadingSceneManager : MonoBehaviour
{
    void Start()
    {
        SceneManager.LoadScene("02.LobbyScene");
    }
}
