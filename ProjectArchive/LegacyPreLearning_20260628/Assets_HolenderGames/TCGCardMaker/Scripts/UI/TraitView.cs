using UnityEngine;
using TMPro;

namespace TCG_CardMaker
{
    public class TraitView : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI txtName;
        [SerializeField] private TextMeshProUGUI txtDescription;

        public void SetTraitData(CardAddition trait)
        {
           txtName.text = trait.Name;
           txtDescription.text = trait.Description; 
        }
    }
}
