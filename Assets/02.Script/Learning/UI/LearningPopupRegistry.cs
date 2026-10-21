using System;
using System.Collections.Generic;
using UnityEngine;

public class LearningPopupRegistry : MonoBehaviour
{
    [Serializable]
    public class PopupEntry
    {
        public string popupId;
        public LearningPopupPanel popup;
    }

    [SerializeField] private List<PopupEntry> popups = new List<PopupEntry>();

    public void Open(string popupId)
    {
        LearningPopupPanel popup = FindPopup(popupId);
        if (popup != null) popup.Open();
    }

    public void Close(string popupId)
    {
        LearningPopupPanel popup = FindPopup(popupId);
        if (popup != null) popup.Close();
    }

    public void Toggle(string popupId)
    {
        LearningPopupPanel popup = FindPopup(popupId);
        if (popup == null) return;

        if (popup.gameObject.activeSelf) popup.Close();
        else popup.Open();
    }

    public void CloseAll()
    {
        for (int i = 0; i < popups.Count; i++)
        {
            if (popups[i] != null && popups[i].popup != null && popups[i].popup.gameObject.activeSelf)
            {
                popups[i].popup.Close();
            }
        }
    }

    private LearningPopupPanel FindPopup(string popupId)
    {
        if (string.IsNullOrWhiteSpace(popupId)) return null;

        for (int i = 0; i < popups.Count; i++)
        {
            PopupEntry entry = popups[i];
            if (entry == null || entry.popup == null) continue;
            if (entry.popupId == popupId) return entry.popup;
        }

        Debug.LogWarning($"[LearningPopupRegistry] Popup not found: {popupId}", this);
        return null;
    }
}
