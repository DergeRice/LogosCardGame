using Fusion;
using TCG_CardMaker;
using TMPro;
using UnityEngine;
using UnityEngine.UI;


public class RobReceive : MonoBehaviour
{

    public GameObject Ui;
    public CardView robbedView;

    public Button acceptBtn;

    public PlayerRef sender;

    public GameObject resultObject;

    public TMP_Text senderNameText;

    public int robIndex;

    void Start()
    {
        acceptBtn.onClick.AddListener(() =>
        {
            Ui.SetActive(false);
            FieldManager.Instance.FadeField(1);
        });
    }


    public void ReceivedRob(PlayerRef _sender, string senderName, CardSO robCard)
    {
        Ui.SetActive(true);
        FieldManager.Instance.FadeField(0);
        robbedView.SetData(robCard);
        sender = _sender;

        // senderNameText.text = senderName;/

        ShowAnimation();

        Destroy(CardManager.instance.GetCardObjectBySo(robCard));
    }

    public void ShowAnimation()
    {
        resultObject.SetActive(false);
        resultObject.SetActive(true);
    }
}
