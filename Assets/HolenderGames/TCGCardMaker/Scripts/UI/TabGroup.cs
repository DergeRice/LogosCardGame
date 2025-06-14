using UnityEngine;

namespace TCG_CardMaker
{
    public class TabGroup : MonoBehaviour
    {
        [SerializeField] private Color colorIdle;
        [SerializeField] private Color colorHover;
        [SerializeField] private Color colorActive;

        [SerializeField] private Sprite spriteIdle;
        [SerializeField] private Sprite spriteHover;
        [SerializeField] private Sprite spriteActive;
        
        [SerializeField] TabButton selectedTab;

        private TabButton[] tabButtons;

        private void Awake()
        {
            tabButtons = GetComponentsInChildren<TabButton>();
            foreach (TabButton button in tabButtons) {
                button.SetTabGroup(this);
            }
        }

        private void Start()
        {
            if(selectedTab != null)
            {
                OnTabSelected(selectedTab);
            }
        }

        public void OnTabButtonEnter(TabButton tabButton)
        {
            if (selectedTab != null && selectedTab == tabButton)
                return;

            tabButton.SetColors(colorHover, spriteHover);
        }

        public void OnTabButtonExit(TabButton tabButton)
        {
            if (selectedTab != null && selectedTab == tabButton)
                return;

            tabButton.SetColors(colorIdle,spriteIdle);
        }

        public void OnTabSelected(TabButton tabButton)
        {
            if(selectedTab != null)
            {
                selectedTab.Deselect();
                selectedTab.SetPanelVisibility(false);
            }

            selectedTab = tabButton;
            selectedTab.Select();
            ResetTabButtons();
            selectedTab.SetPanelVisibility(true);
            tabButton.SetColors(colorActive,spriteActive);
        }

        public void ResetTabButtons()
        {
            foreach (TabButton button in tabButtons)
            {
                button.SetColors(colorIdle,spriteIdle);
            }
        }


    }
}
