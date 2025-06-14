using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Events;
using UnityEngine.EventSystems;

namespace TCG_CardMaker
{
    public class TabButton : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler, IPointerClickHandler
    {
        [SerializeField] public GameObject tabPanel;
        [SerializeField] private UnityEvent OnSelect;
        [SerializeField] private UnityEvent OnDeselect;

        private Image tabImage;
        private TabGroup tabGroup;

        private void Awake()
        {
            tabImage = GetComponentInChildren<Image>();
        }

        public void SetColors(Color color, Sprite sprite)
        {
            if (color != null)
                tabImage.color = color;

            if (sprite != null)
                tabImage.sprite = sprite;

        }

        public void SetPanelVisibility(bool isVisible)
        {
            if (tabPanel != null)
            {
                tabPanel.SetActive(isVisible);
            }
        }
        public void Select()
        {
            OnSelect?.Invoke();
        }
        public void Deselect()
        {
            OnDeselect?.Invoke();
        }
        internal void SetTabGroup(TabGroup tabGroup)
        {
            this.tabGroup = tabGroup;
        }

        public void OnPointerEnter(PointerEventData eventData)
        {
            tabGroup.OnTabButtonEnter(this);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            tabGroup.OnTabButtonExit(this);
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            tabGroup.OnTabSelected(this);
        }

        public void SimulateClick()
        {
            tabGroup.OnTabSelected(this);
        }
    }
}
