using UnityEngine;
using System.Collections.Generic;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "CardsDB", menuName = "Create CardsDB", order = 5)]
    public class CardsDB : ScriptableObject
    {
        static CardsDB instance;

        public static CardsDB Instance
        {
            get { 
                if (instance == null)
                {
                    instance = Resources.Load<CardsDB>("CardsDB");
                }
                return instance; 
            }
        }

        public List<CardSO> Cards = new List<CardSO>();
    }
}
