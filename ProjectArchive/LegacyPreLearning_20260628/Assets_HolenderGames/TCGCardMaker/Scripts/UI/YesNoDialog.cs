using UnityEngine;
using TMPro;
using UnityEngine.UI;
using System;

namespace TCG_CardMaker
{
    public class YesNoDialog : MonoBehaviour
    {
        [SerializeField] private GameObject dialogObject;
        [SerializeField] private TextMeshProUGUI messageText;
        [SerializeField] private Button yesButton, noButton;
        private Action<bool> responseCallback;

        public static YesNoDialog Instance;
       

        void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }

            yesButton.onClick.AddListener(() => Respond(true));
            noButton.onClick.AddListener(() => Respond(false));
        }

        public void Show(string message, Action<bool> callback)
        {
            messageText.text = message;
            responseCallback = callback;
            dialogObject.SetActive(true);
        }

        private void Respond(bool result)
        {
            dialogObject.SetActive(false);
            responseCallback?.Invoke(result);
        }
    }
}
