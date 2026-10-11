using UnityEngine;
using TCGStarter.Tweening;

namespace TCG_CardMaker
{
    public class TraitsPanel : MonoBehaviour
    {
        [SerializeField] private TraitView traitViewPrefab;
        [SerializeField] private Transform traitsContainer;
        private void Start()
        {
            PopulateTraits();
        }

        private void PopulateTraits()
        {
            foreach (var trait in TraitsDB.Instance.Traits)
            {
                TraitView view = Instantiate(traitViewPrefab, traitsContainer);
                view.SetTraitData(trait);
                view.gameObject.transform.localScale = Vector3.up;
                TweenExtentions.TweenScale(view.gameObject.transform, Vector3.one, Random.Range(0.5f,1f), false);
            }
        }
    }
}
