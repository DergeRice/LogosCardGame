using UnityEngine;
using TMPro;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public class LobbyUIManager : MonoBehaviour
{
    public TMP_Text nameText;
    public TMP_InputField nicknameSelect;

    public Button nicknameConfirmButton;

    public GameObject multiplayLobby;

    public Button quickStartButton;
    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        nicknameConfirmButton.onClick.AddListener(() =>
        {
            SinglePlayerSession.LocalPlayerName = nicknameSelect.text;
            nicknameConfirmButton.transform.parent.gameObject.SetActive(false);
        });

        quickStartButton.onClick.AddListener(() =>
        {
            multiplayLobby.SetActive(false);
            SceneManager.LoadScene("04.GameScene");
        });

    }

    public void SetMyNameText(string str)
    {
        nameText.text = str;

    }
}
