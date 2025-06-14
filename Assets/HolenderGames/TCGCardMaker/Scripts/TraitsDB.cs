using UnityEngine;
using System.Collections.Generic;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "TraitsDB", menuName = "Create TraitDB", order = 4)]
    public class TraitsDB : ScriptableObject
    {
        static TraitsDB instance;

        public static TraitsDB Instance
        {
            get { 
                if (instance == null)
                {
                    instance = Resources.Load<TraitsDB>("TraitsDB");
                }
                return instance; 
            }
        }

        public List<CardAddition> Traits;
    }
}
