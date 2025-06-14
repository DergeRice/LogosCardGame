using UnityEngine;

namespace TCG_CardMaker
{
    [CreateAssetMenu(fileName = "Settings", menuName = "Create Settings", order = 5)]
    public class Settings : ScriptableObject
    {
        static Settings instance;

        public ImagesDB CardBordersDB;
        public ImagesDB CardArtDB;
        public CardView CardViewPrefab;

        public string saveFolderPath = "Assets/Resources/";


        public static Settings Instance
        {
            get { 
                if (instance == null)
                {
                    instance = Resources.Load<Settings>("Settings");
                }
                return instance; 
            }
        }

    }
}
