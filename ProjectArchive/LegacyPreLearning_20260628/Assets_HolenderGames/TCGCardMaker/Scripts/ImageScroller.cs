using UnityEngine;
using System;

namespace TCG_CardMaker
{
    public class ImageScroller : MonoBehaviour
    {
        public event Action<Sprite> OnImageSelect;
        [SerializeField] private ImagesDB imagesDB;

        private TMPro.TMP_Dropdown dropdown;
        private int currentIndex = 0;

        private void Awake()
        {
            dropdown = GetComponentInChildren<TMPro.TMP_Dropdown>();
            dropdown.onValueChanged.AddListener(OnChange);
        }

        private void Start()
        {
            UpdateDropdown();
        }

        public void SetImagesDB(ImagesDB imagesDB)
        {
            this.imagesDB = imagesDB;
            UpdateDropdown();
        }



        private void UpdateDropdown()
        {
            if(imagesDB == null) return;

            dropdown.options.Clear();
            foreach (var item in imagesDB.images)
            {
                dropdown.options.Add(new TMPro.TMP_Dropdown.OptionData(item.name,item,Color.white));
            }

            dropdown.value = 0;
            dropdown.RefreshShownValue();
            OnChange(0);

        }

        private void OnChange(int selection)
        {
            OnImageSelect?.Invoke(imagesDB.images[selection]);
        }


        public void SetSelection(Sprite selectedSprite)
        {
            int index = imagesDB.images.IndexOf(selectedSprite);
            if(index<0) return;

            dropdown.value = index;
            dropdown.RefreshShownValue();
            OnChange(index);
        }

        public void NextImage()
        {
            if (imagesDB.Count == 0) return;
            currentIndex = (currentIndex + 1) % imagesDB.Count;
            OnChange(currentIndex);
        }

        public void PreviousImage()
        {
            if (imagesDB.Count == 0) return;
            currentIndex = (currentIndex - 1 + imagesDB.Count) % imagesDB.Count;
            OnChange(currentIndex);
        }
       
    }
}
