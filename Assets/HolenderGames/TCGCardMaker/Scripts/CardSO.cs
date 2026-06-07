using UnityEngine;
using System.Collections.Generic;
using System.Linq;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "Card", menuName = "Create Card", order = 0)]
    public class CardSO : ScriptableObject
    {
        public string Title = "New Card";
        public string Description = "Describe the card abilities";
        public string CardPOS = "";
        public string Cost ="2";
        public CardType Type = CardType.대명사;
        public Sprite Border;
        public Sprite Art;
        public bool IsTargeting;
        public bool IsSpecial;
        public bool IsDivide;
        public List<CardAddition> Traits = new List<CardAddition>();
        public List<CostModifier> CostModifiers = new List<CostModifier>();
        

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
            clone.CostModifiers = new List<CostModifier>(CostModifiers);

            // ✅ Title에서 숫자 제거해서 CardPOS 설정
            clone.CardPOS = new string(Title.Where(c => !char.IsDigit(c)).ToArray());

            return clone;
        }

        public void AddCostModifier(Calculate.Multifier modifier, float value)
        {
            if (CostModifiers == null) CostModifiers = new List<CostModifier>();
            CostModifiers.Add(new CostModifier { Modifier = modifier, Value = value });
        }

        public List<CostModifier> GetCostModifiers()
        {
            if (CostModifiers != null && CostModifiers.Count > 0)
            {
                return new List<CostModifier>(CostModifiers);
            }

            return ParseCostString(Cost);
        }

        public string GetCostText()
        {
            if (CostModifiers != null && CostModifiers.Count > 0)
            {
                return string.Join("", CostModifiers.Select(m => Calculate.ToToken(m.Modifier, m.Value)));
            }

            return Cost;
        }

        private static List<CostModifier> ParseCostString(string cost)
        {
            var result = new List<CostModifier>();
            if (string.IsNullOrWhiteSpace(cost)) return result;
            if (string.Equals(cost, "S", System.StringComparison.OrdinalIgnoreCase)) return result;

            int i = 0;
            while (i < cost.Length)
            {
                char op = cost[i];
                if (!Calculate.TryParseOperator(op, out var modifier))
                {
                    i++;
                    continue;
                }

                i++;
                int start = i;
                while (i < cost.Length && !Calculate.TryParseOperator(cost[i], out _))
                {
                    i++;
                }

                string numberText = cost.Substring(start, i - start).Trim();
                if (float.TryParse(numberText, out float value))
                {
                    result.Add(new CostModifier { Modifier = modifier, Value = value });
                }
            }

            return result;
        }
    }
}
