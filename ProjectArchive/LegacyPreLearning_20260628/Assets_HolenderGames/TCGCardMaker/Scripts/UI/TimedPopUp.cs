using UnityEngine;
using TMPro;
using UnityEngine.UI;
using TCGStarter.Tweening;

namespace TCG_CardMaker
{
    public class TimedPopUp : MonoBehaviour
    {
        [SerializeField] private Button buttonToPause;
        [SerializeField] private TextMeshProUGUI txt;

        private void Awake()
        {
            txt = gameObject.GetComponentInChildren<TextMeshProUGUI>();
        }
        public void Show(float duration)
        {
            if(buttonToPause != null)
            {
                buttonToPause.interactable = false;
            }
            gameObject.SetActive(true);
            txt.alpha = 1;
            TweenManager.Instance.AddFadeTween(txt, 0f, duration, false);

            Invoke("Hide", duration);
        }

        private void Hide()
        {
            gameObject.SetActive(false);
          
            if (buttonToPause != null)
            {
                buttonToPause.interactable = true;
            }
        }
    }
}
