using UnityEngine;

public class LearningLobbyPopupBridge : MonoBehaviour
{
    [SerializeField] private LearningPopupPanel iapShopPopup;
    [SerializeField] private LearningPopupPanel settingsPopup;
    [SerializeField] private LearningPopupPanel attendancePopup;

    public void OpenIapShop() => iapShopPopup?.Open();
    public void OpenSettings() => settingsPopup?.Open();
    public void OpenAttendance() => attendancePopup?.Open();
    public void CloseIapShop() => iapShopPopup?.Close();
    public void CloseSettings() => settingsPopup?.Close();
    public void CloseAttendance() => attendancePopup?.Close();
}
