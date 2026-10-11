using UnityEngine;

namespace TCG_CardMaker
{
    public class MainPanel : MonoBehaviour
    {
        [SerializeField] TabButton CreateCardTabButton;
        [SerializeField] CardEditorPanel cardEditorPanel;

        private void Awake()
        {
            CardContextMenu.OnEditCardClick += OnEditCardClick;
        }

        private void OnEditCardClick(CardSO card)
        {
            cardEditorPanel.SetCardToEdit(card);
            CreateCardTabButton.SimulateClick();
        }
    }
}
