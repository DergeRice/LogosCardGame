using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager instance;

    public Transform toastRoot;
    public GameObject toastUIPrefeb;

    private void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(this);
        }
        else Destroy(gameObject);
    }


    public void ToastText(string text)
    {
        var toastText = Instantiate(toastUIPrefeb, toastRoot).GetComponent<ToastUI>();

        toastText.toastText.text = text;
        Destroy(toastText.gameObject, 2f);
    }
}
