using UnityEngine;
using TMPro;
using UnityEngine.UI;
using System;

namespace TCG_CardMaker
{
    public class AlternateColorButton : MonoBehaviour
    {
        public event Action<bool> OnStateChange;
        [SerializeField] public Color imgEnabled = Color.white;
        [SerializeField] public Color imgDisabled = new Color(0, 0, 0, 0.5f);
        [SerializeField] public Color txtEnabled = Color.white;
        [SerializeField] public Color txtDisabled = new Color(0, 0, 0, 0.5f);
        [SerializeField] public bool IsStartEnabled = true;
        private bool isEnabled = false;
        private TextMeshProUGUI txt;
        private Image img;
        private void Awake()
        {
            txt = gameObject.GetComponentInChildren<TextMeshProUGUI>();
            img = gameObject.GetComponentInChildren<Image>();

        }

        private void Start()
        {
            Set(IsStartEnabled);
        }

        public void Set(bool isEnabled)
        {
           Set(isEnabled, true);
        }
        public void Set(bool isEnabled, bool IsNotify)
        {
            this.isEnabled = isEnabled;
            if (txt != null)
                txt.color = isEnabled ? txtEnabled : txtDisabled;

            if (img != null)
                img.color = isEnabled ? imgEnabled : imgDisabled;

            if(IsNotify)
                OnStateChange?.Invoke(isEnabled);
        }
        public void ChangeMode()
        {
            Set(!isEnabled);
        }
    }
}
