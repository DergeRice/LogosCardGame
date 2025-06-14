using UnityEngine;
using System.Collections.Generic;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "Card", menuName = "Create Card", order = 0)]
    public class CardSO : ScriptableObject
    {
        public string Title = "New Card";
        public string Description = "Describe the card abilities";
        public string Cost ="2";
        public CardType Type = CardType.대명사;
        public Sprite Border;
        public Sprite Art;
        public bool IsTargeting;
        public bool IsSpecial;
        public bool IsDivide;
        public List<CardAddition> Traits = new List<CardAddition>();
        

        public CardSO CreateClone()
        {
            CardSO clone = ScriptableObject.CreateInstance<CardSO>();
            clone.Title = Title;
            clone.Description = Description;
            clone.Cost = Cost;
            clone.Type = Type;
            clone.Border = Border;
            clone.Art = Art;
            clone.IsTargeting = IsTargeting;
            clone.Traits = new List<CardAddition>(Traits);
            return clone;

        }
    }
}
