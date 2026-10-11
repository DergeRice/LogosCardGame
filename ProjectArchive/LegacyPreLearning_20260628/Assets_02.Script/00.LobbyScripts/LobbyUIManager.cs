using UnityEngine;
using TMPro;
using UnityEngine.UI;

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
        nicknameConfirmButton.onClick.AddListener(()=>
        {
            nicknameConfirmButton.transform.parent.gameObject.SetActive(false);
        });    
        
        quickStartButton.onClick.AddListener(()=>
        {
            multiplayLobby.SetActive(true);
        });
    
    }

    public void SetMyNameText(string str)
    {
        nameText.text = str;
        
    }
}
