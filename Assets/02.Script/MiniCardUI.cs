using TCG_CardMaker;
using UnityEngine;
using UnityEngine.UI;

public class MiniCardUI : MonoBehaviour
{
    public Button selectButton;

    public GameObject myObjectColor;

    public bool isMyObject;

    CardSO cardSO;

    public void SettingAction(SpecialEvent specialEvent)
    {
        if (isMyObject) myObjectColor.SetActive(true);

        cardSO = GetComponent<CardView>().cardData;
        selectButton.onClick.RemoveAllListeners();
        
        switch (specialEvent)
        {
            case SpecialEvent.Exchange:

                if (isMyObject == false)
                    selectButton.onClick.AddListener(() =>
                    {
                        GamePlayManager.instance.gameUIManager.exchangeManager.SelectRequestCard(cardSO);
                        GamePlayManager.instance.gameUIManager.exchangeManager.SelectedOpCard();
                    });
            if (isMyObject == true)
                selectButton.onClick.AddListener(() =>
                    GamePlayManager.instance.gameUIManager.exchangeManager.SelectSendingCard(cardSO));

                break;

            case SpecialEvent.Rob:
                selectButton.onClick.AddListener(() =>
                    GamePlayManager.instance.gameUIManager.robManager.SelectRobCard(cardSO));

                break;

        }       
    }

}
