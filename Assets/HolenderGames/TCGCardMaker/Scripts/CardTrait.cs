using UnityEngine;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "CardAddition", menuName = "Create Addition", order = 3)]
    public class CardAddition : ScriptableObject
    {
        public string Name = "";
        [Multiline]
        public string Description = "";
        public AdditionalType Type;
       
    }
}
