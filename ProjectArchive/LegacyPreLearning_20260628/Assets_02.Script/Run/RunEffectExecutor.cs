using System.Collections;
using UnityEngine;
using TCG_CardMaker;

public static class RunEffectExecutor
{
    public static IEnumerator Execute(RunEffect effect)
    {
        if (RunContext.Instance == null)
        {
            yield break;
        }

        var ctx = RunContext.Instance;

        switch (effect.type)
        {
            case RunEffectType.AddHands:
                ctx.ApplyBlindState(ctx.State.blindIndex, ctx.State.enemyHp, ctx.State.hands + effect.intValue, ctx.State.discards);
                break;

            case RunEffectType.AddDiscards:
                ctx.ApplyBlindState(ctx.State.blindIndex, ctx.State.enemyHp, ctx.State.hands, ctx.State.discards + effect.intValue);
                break;

            case RunEffectType.PermanentAddBaseScore:
                ctx.State.baseScoreAdd += effect.intValue;
                ctx.SaveRun();
                break;

            case RunEffectType.PermanentMultiplyBaseScore:
                ctx.State.baseScoreMultiply *= Mathf.Max(0f, effect.floatValue);
                ctx.SaveRun();
                break;

            case RunEffectType.TransformOneDeckCard:
                ctx.TransformOneDeckCard(effect.stringValueA, effect.stringValueB);
                break;

            case RunEffectType.TransformFirstFieldCard:
            {
                if (GamePlayManager.instance == null || GamePlayManager.instance.fieldManager == null)
                    break;

                string fromId = null;
                foreach (Transform child in GamePlayManager.instance.fieldManager.fieldParent)
                {
                    var view = child.GetComponent<DeckCardView>();
                    if (view == null || view.card == null) continue;
                    fromId = RunContext.ToStableCardId(view.card);
                    break;
                }

                if (!string.IsNullOrWhiteSpace(fromId) && !string.IsNullOrWhiteSpace(effect.stringValueB))
                {
                    ctx.TransformOneDeckCard(fromId, effect.stringValueB);
                }
                break;
            }

            case RunEffectType.AddDeckCard:
                ctx.AddDeckCard(effect.stringValueA);
                break;
        }

        yield break;
    }
}
