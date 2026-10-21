using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class RoguelikeDataGenerator
{
    private const string EquipmentsFolder = "Assets/Resources/Roguelike/Equipments";
    private const string ConsumablesFolder = "Assets/Resources/Roguelike/Consumables";

    [MenuItem("Roguelike/Generate Data (Equip 40, Arcana 30)")]
    public static void GenerateAll()
    {
        EnsureFolder(EquipmentsFolder);
        EnsureFolder(ConsumablesFolder);

        GenerateEquipments();
        GenerateConsumables();

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[RoguelikeDataGenerator] Done.");
    }

    private static void GenerateEquipments()
    {
        // Minimal, data-driven starting pack. You can freely edit/remove after generation.
        var defs = new List<(string id, string title, string desc, EquipmentKind kind, int stacks, float mult, int freeRerolls, List<SubmitModifier> mods)>
        {
            ("eq_stack20x2", "Twentyfold", "Starts with 20 stacks. On each Submit: score x2, then -1 stack. When stacks reach 0, it becomes inert.", EquipmentKind.StackMultiplierOnSubmit, 20, 2f, 0, null),
            ("eq_free_reroll10", "Ten Free Rerolls", "Grants 10 free shop rerolls. Each shop reroll consumes 1 stack.", EquipmentKind.ShopFreeRerollsConsumable, 0, 1f, 10, null),
            ("eq_discount_20", "Permanent Discount", "All shop purchases are 20% cheaper.", EquipmentKind.ShopDiscountAll, 0, 1f, 0, null),
            ("eq_shop_coins_5", "Shop Allowance", "Gain +5 coins whenever you enter a shop.", EquipmentKind.CoinGainOnShopOpen, 0, 1f, 0, null),

            // POS-based examples (ScoreModifiers)
            ("eq_noun_mult", "Noun Booster", "If your hand contains at least one Noun: score x1.5.", EquipmentKind.ScoreModifiers, 0, 1f, 0,
                new List<SubmitModifier> { new SubmitModifier { type = SubmitModifierType.MultiplyScoreIfPosPresent, posId = "NNU", multiplyScore = 1.5f } }),
            ("eq_verb_add", "Verb Tips", "Gain +10 score per Verb in the submitted hand.", EquipmentKind.ScoreModifiers, 0, 1f, 0,
                new List<SubmitModifier> { new SubmitModifier { type = SubmitModifierType.AddScorePerPosCount, posId = "VB", addScore = 10 } }),
            ("eq_prep_mult", "Preposition Multiplier", "If you used a Preposition: score x1.4.", EquipmentKind.ScoreModifiers, 0, 1f, 0,
                new List<SubmitModifier> { new SubmitModifier { type = SubmitModifierType.MultiplyScoreIfPosPresent, posId = "IN", multiplyScore = 1.4f } }),
        };

        // Fill to 40 with simple variations.
        // These are intentionally straightforward so you can replace with your real Balatro-like gimmicks later.
        var posList = new[]
        {
            ("PRP","Pronoun"), ("PRP_POS","Possessive"), ("DT_AN","A/An"), ("DT_THE","The"),
            ("JJ","Adjective"), ("NNC","Noun(C)"), ("NNU","Noun(U)"), ("VB","Verb"),
            ("DO","Do"), ("MODAL","Modal"), ("BE","Be"), ("RB","Adverb"), ("RB_FREQ","Freq Adv"),
            ("RB_NOT","Not"), ("IN","Preposition"), ("CC","Conjunction")
        };

        int seq = 0;
        while (defs.Count < 40)
        {
            var (posId, posName) = posList[seq % posList.Length];
            bool mult = (seq % 2) == 0;
            string id = mult ? $"eq_if_{posId.ToLower()}_x{(11 + (seq % 5))}" : $"eq_per_{posId.ToLower()}_add{(5 + (seq % 6))}";
            string title = mult ? $"{posName} x{(1.1f + 0.05f * (seq % 5)):0.##}" : $"{posName} +{(5 + (seq % 6))}";
            string desc = mult
                ? $"If your hand contains {posName}: score x{(1.1f + 0.05f * (seq % 5)):0.##}."
                : $"Gain +{(5 + (seq % 6))} score per {posName} in the submitted hand.";

            var mods = new List<SubmitModifier>();
            if (mult)
            {
                mods.Add(new SubmitModifier
                {
                    type = SubmitModifierType.MultiplyScoreIfPosPresent,
                    posId = posId,
                    multiplyScore = 1.1f + 0.05f * (seq % 5),
                });
            }
            else
            {
                mods.Add(new SubmitModifier
                {
                    type = SubmitModifierType.AddScorePerPosCount,
                    posId = posId,
                    addScore = 5 + (seq % 6),
                });
            }

            defs.Add((id, title, desc, EquipmentKind.ScoreModifiers, 0, 1f, 0, mods));
            seq++;
        }

        for (int i = 0; i < defs.Count; i++)
        {
            var d = defs[i];
            string path = $"{EquipmentsFolder}/{SanitizeFileName(d.id)}.asset";

            EquipmentSO asset = AssetDatabase.LoadAssetAtPath<EquipmentSO>(path);
            if (asset == null)
            {
                asset = ScriptableObject.CreateInstance<EquipmentSO>();
                AssetDatabase.CreateAsset(asset, path);
            }

            asset.equipmentId = d.id;
            asset.title = d.title;
            asset.description = d.desc;
            asset.kind = d.kind;
            asset.initialStacks = d.stacks;
            asset.stackMultiplier = d.mult;
            asset.freeRerolls = d.freeRerolls;
            if (d.kind == EquipmentKind.ShopDiscountAll) asset.shopDiscountPercent = 0.2f;
            if (d.kind == EquipmentKind.CoinGainOnShopOpen) asset.coinsOnShopOpen = 5;

            if (asset.submitModifiers == null)
            {
                asset.submitModifiers = new List<SubmitModifier>();
            }
            asset.submitModifiers.Clear();
            if (d.mods != null)
            {
                asset.submitModifiers.AddRange(d.mods);
            }

            EditorUtility.SetDirty(asset);
        }
    }

    private static void GenerateConsumables()
    {
        // Arcana: uses existing ArcanaSelectionMode flows (card pack, hand-type pick).
        // These initial assets mostly describe intent; actual execution is handled by effects/selection modes.
        var defs = new List<(string id, string title, string desc, List<RunEffect> effects)>
        {
            // Selection-based arcanas: effect execution is driven by ArcanaSelectionMode (wired from Shop for now).
            ("ar_card_pack", "Card Pack", "Reveal 5 random cards. Pick 1 to add to your hand (and deck).", new List<RunEffect>()),
            ("ar_handtype_upgrade_pick", "Hand Type Study", "Pick a hand type (1-5). Permanently increase its scoring bonuses.", new List<RunEffect>()),
            ("ar_deck_transform", "Transmutation", "Pick 1 deck card, then pick a new card form. Permanently transforms the chosen deck card.", new List<RunEffect>()),
            ("ar_base_add", "Ink Stamp", "Permanently increase your base score by +15.", new List<RunEffect>
            {
                new RunEffect { type = RunEffectType.PermanentAddBaseScore, intValue = 15 }
            }),
            ("ar_base_mult", "Golden Seal", "Permanently increase your base multiplier by x1.05.", new List<RunEffect>
            {
                new RunEffect { type = RunEffectType.PermanentMultiplyBaseScore, floatValue = 1.05f }
            }),
        };

        // Fill to 30 with small permanent tweaks.
        int seq = 0;
        while (defs.Count < 30)
        {
            bool add = (seq % 2) == 0;
            if (add)
            {
                int v = 5 + (seq % 6) * 5;
                defs.Add(($"ar_base_add_{v}", $"Base +{v}", $"Permanently increase your base score by +{v}.",
                    new List<RunEffect> { new RunEffect { type = RunEffectType.PermanentAddBaseScore, intValue = v } }));
            }
            else
            {
                float m = 1.02f + 0.01f * (seq % 6);
                defs.Add(($"ar_base_mult_{m:0.00}".Replace(".", "_"), $"Base x{m:0.##}", $"Permanently increase your base multiplier by x{m:0.##}.",
                    new List<RunEffect> { new RunEffect { type = RunEffectType.PermanentMultiplyBaseScore, floatValue = m } }));
            }
            seq++;
        }

        for (int i = 0; i < defs.Count; i++)
        {
            var d = defs[i];
            string path = $"{ConsumablesFolder}/{SanitizeFileName(d.id)}.asset";

            ConsumableItemSO asset = AssetDatabase.LoadAssetAtPath<ConsumableItemSO>(path);
            if (asset == null)
            {
                asset = ScriptableObject.CreateInstance<ConsumableItemSO>();
                AssetDatabase.CreateAsset(asset, path);
            }

            asset.itemId = d.id;
            asset.title = d.title;
            asset.description = d.desc;
            if (asset.effects == null)
            {
                asset.effects = new List<RunEffect>();
            }
            asset.effects.Clear();
            if (d.effects != null) asset.effects.AddRange(d.effects);

            EditorUtility.SetDirty(asset);
        }
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;

        string[] parts = path.Split('/');
        string current = parts[0];
        for (int i = 1; i < parts.Length; i++)
        {
            string next = $"{current}/{parts[i]}";
            if (!AssetDatabase.IsValidFolder(next))
            {
                AssetDatabase.CreateFolder(current, parts[i]);
            }
            current = next;
        }
    }

    private static string SanitizeFileName(string s)
    {
        foreach (char c in Path.GetInvalidFileNameChars())
        {
            s = s.Replace(c.ToString(), "_");
        }
        return s;
    }
}
