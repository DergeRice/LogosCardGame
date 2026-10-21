using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using TCG_CardMaker;

public class ShopRuntimeUI : MonoBehaviour
{
    public static ShopRuntimeUI Instance { get; private set; }

    private Canvas _canvas;
    private GameObject _panel;
    private TextMeshProUGUI _headerText;
    private Button _rerollButton;
    private TextMeshProUGUI _rerollLabel;

    private readonly List<Button> _offerButtons = new List<Button>();
    private readonly List<TextMeshProUGUI> _offerLabels = new List<TextMeshProUGUI>();

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        Build();
    }

    public void Open()
    {
        EnsureCtx();
        Refresh();
        if (_panel != null) _panel.SetActive(true);
    }

    public void Close()
    {
        if (_panel != null) _panel.SetActive(false);
    }

    private void Build()
    {
        var canvasGo = new GameObject("ShopCanvas");
        canvasGo.transform.SetParent(transform);
        _canvas = canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        _panel = new GameObject("ShopPanel");
        _panel.transform.SetParent(canvasGo.transform);
        var prt = _panel.AddComponent<RectTransform>();
        prt.anchorMin = new Vector2(0.5f, 0.5f);
        prt.anchorMax = new Vector2(0.5f, 0.5f);
        prt.pivot = new Vector2(0.5f, 0.5f);
        prt.sizeDelta = new Vector2(900f, 520f);
        prt.anchoredPosition = Vector2.zero;

        var bg = _panel.AddComponent<Image>();
        bg.color = new Color(0f, 0f, 0f, 0.85f);

        _headerText = AddText("Header", new Vector2(0f, 210f), 30, TextAlignmentOptions.Center);
        _headerText.text = "Shop";

        _rerollButton = AddButton("Reroll", new Vector2(-360f, 210f), () =>
        {
            EnsureCtx();
            if (RunContext.Instance == null) return;

            if (!RunContext.Instance.TryShopReroll(out int paid, out bool usedFree))
            {
                GameManager.instance.ToastText("Not enough coins");
                return;
            }

            Refresh();
        }, out _rerollLabel);

        AddButton("Close", new Vector2(360f, 210f), () => Close());

        // Offers are stored in RunState.shopOffers:
        // 0-1: consumables, 2-3: equips, 4-5: cards (by default generator)
        AddOfferButton("Offer0", new Vector2(-240f, 100f), 0);
        AddOfferButton("Offer1", new Vector2(-240f, 10f), 1);
        AddOfferButton("Offer2", new Vector2(240f, 100f), 2);
        AddOfferButton("Offer3", new Vector2(240f, 10f), 3);
        AddOfferButton("Offer4", new Vector2(0f, 100f), 4);
        AddOfferButton("Offer5", new Vector2(0f, 10f), 5);

        // NOTE: Arcana usage happens from inventory now. Shop only sells items.

        _panel.SetActive(false);
    }

    private void Refresh()
    {
        if (RunContext.Instance == null) return;

        int coins = RunContext.Instance.State.coins;
        int rerollCost = RunContext.Instance.GetShopRerollCost();
        int free = RunContext.Instance.State.shopFreeRerollsRemaining;
        float discount = RunContext.Instance.GetShopDiscountPercent();

        if (_headerText != null)
        {
            string d = discount > 0f ? $"  |  Discount: {discount * 100f:0}%": "";
            _headerText.text = free > 0
                ? $"Shop  |  Coins: {coins}  |  Free Rerolls: {free}{d}"
                : $"Shop  |  Coins: {coins}{d}";
        }

        if (_rerollLabel != null)
        {
            _rerollLabel.text = rerollCost == 0 ? "Reroll (FREE)" : $"Reroll ({rerollCost})";
        }

        RefreshOfferLabels();
    }

    private void RefreshOfferLabels()
    {
        if (RunContext.Instance == null) return;

        var offers = RunContext.Instance.State.shopOffers;
        for (int i = 0; i < _offerLabels.Count; i++)
        {
            var label = _offerLabels[i];
            var btn = i < _offerButtons.Count ? _offerButtons[i] : null;
            if (label == null) continue;

            ShopOfferState off = (offers != null && i < offers.Count) ? offers[i] : null;
            if (off == null || string.IsNullOrWhiteSpace(off.type) || string.IsNullOrWhiteSpace(off.id))
            {
                label.text = "Empty";
                if (btn != null) btn.interactable = false;
                continue;
            }

            string text = FormatOffer(off);
            label.text = off.sold ? $"{text}  (SOLD)" : text;
            if (btn != null) btn.interactable = !off.sold;
        }
    }

    private string FormatOffer(ShopOfferState off)
    {
        if (off == null) return "Empty";
        string type = off.type;

        if (string.Equals(type, "consumable", System.StringComparison.Ordinal))
        {
            var def = ConsumableRegistry.GetById(off.id);
            string title = def != null && !string.IsNullOrWhiteSpace(def.title) ? def.title : off.id;
            int price = RunContext.Instance.ApplyShopPriceDiscount(GetConsumableBasePrice(off.id));
            return $"{title}  ({price})";
        }

        if (string.Equals(type, "equipment", System.StringComparison.Ordinal))
        {
            var def = EquipmentRegistry.GetById(off.id);
            string title = def != null && !string.IsNullOrWhiteSpace(def.title) ? def.title : off.id;
            int price = RunContext.Instance.ApplyShopPriceDiscount(GetEquipmentBasePrice(def));
            return $"{title}  ({price})";
        }

        if (string.Equals(type, "card", System.StringComparison.Ordinal))
        {
            var baseCard = RunContext.FindCardByStableId(off.id);
            string title = baseCard != null ? baseCard.Title : off.id;
            string token = FormatModifierStates(off.modifiers);
            int price = RunContext.Instance.ApplyShopPriceDiscount(GetCardBasePrice(off.modifiers));
            return string.IsNullOrWhiteSpace(token) ? $"{title}  ({price})" : $"{title}  {token}  ({price})";
        }

        return off.id;
    }

    private static string FormatModifierStates(List<CardCostModifierState> mods)
    {
        if (mods == null || mods.Count == 0) return string.Empty;
        var parts = new List<string>();
        for (int i = 0; i < mods.Count; i++)
        {
            parts.Add(Calculate.ToToken((Calculate.Multifier)mods[i].op, mods[i].value));
        }
        return string.Join("", parts);
    }

    private static int GetConsumableBasePrice(string itemId)
    {
        // Fast default pricing for iteration.
        if (string.IsNullOrWhiteSpace(itemId)) return 0;
        if (string.Equals(itemId, "ar_card_pack", System.StringComparison.Ordinal)) return 6;
        if (string.Equals(itemId, "ar_handtype_upgrade_pick", System.StringComparison.Ordinal)) return 7;
        if (string.Equals(itemId, "ar_deck_transform", System.StringComparison.Ordinal)) return 7;
        return 4;
    }

    private static int GetEquipmentBasePrice(EquipmentSO def)
    {
        if (def == null) return 0;
        if (def.kind == EquipmentKind.StackMultiplierOnSubmit) return 12;
        if (def.kind == EquipmentKind.ShopFreeRerollsConsumable) return 10;
        if (def.kind == EquipmentKind.ShopDiscountAll) return 11;
        if (def.kind == EquipmentKind.CoinGainOnShopOpen) return 9;
        return 8;
    }

    private static int GetCardBasePrice(List<CardCostModifierState> mods)
    {
        // Pricing: base 4 + per-modifier weight. Keep it simple for iteration.
        int price = 4;
        if (mods != null)
        {
            for (int i = 0; i < mods.Count; i++)
            {
                switch ((Calculate.Multifier)mods[i].op)
                {
                    case Calculate.Multifier.Multiply: price += 4; break;
                    case Calculate.Multifier.Add: price += 2; break;
                    case Calculate.Multifier.Subtract: price += 1; break;
                    case Calculate.Multifier.Divide: price += 2; break;
                }
            }
        }
        return Mathf.Clamp(price, 3, 14);
    }

    private void AddOfferButton(string name, Vector2 pos, int offerIndex)
    {
        var btn = AddButton(name, pos, () =>
        {
            EnsureCtx();
            BuyOfferAt(offerIndex);
        }, out var label);

        _offerButtons.Add(btn);
        _offerLabels.Add(label);
    }

    private void BuyOfferAt(int offerIndex)
    {
        if (RunContext.Instance == null) return;
        var offers = RunContext.Instance.State.shopOffers;
        if (offers == null || offerIndex < 0 || offerIndex >= offers.Count) return;

        var off = offers[offerIndex];
        if (off == null || off.sold) return;
        if (string.IsNullOrWhiteSpace(off.type) || string.IsNullOrWhiteSpace(off.id)) return;

        int basePrice;
        if (string.Equals(off.type, "consumable", System.StringComparison.Ordinal))
        {
            basePrice = GetConsumableBasePrice(off.id);
        }
        else if (string.Equals(off.type, "equipment", System.StringComparison.Ordinal))
        {
            basePrice = GetEquipmentBasePrice(EquipmentRegistry.GetById(off.id));
        }
        else if (string.Equals(off.type, "card", System.StringComparison.Ordinal))
        {
            basePrice = GetCardBasePrice(off.modifiers);
        }
        else
        {
            return;
        }

        int price = RunContext.Instance.ApplyShopPriceDiscount(basePrice);
        if (!RunContext.Instance.TrySpendCoins(price))
        {
            GameManager.instance.ToastText("Not enough coins");
            return;
        }

        if (string.Equals(off.type, "consumable", System.StringComparison.Ordinal))
        {
            RunContext.Instance.AddConsumableById(off.id);
        }
        else if (string.Equals(off.type, "equipment", System.StringComparison.Ordinal))
        {
            RunContext.Instance.AddEquipmentById(off.id);
            RunContext.Instance.RebuildShopCachesFromEquipments();
        }
        else if (string.Equals(off.type, "card", System.StringComparison.Ordinal))
        {
            // Convert modifier states to runtime modifiers
            var mods = new List<CostModifier>();
            if (off.modifiers != null)
            {
                for (int i = 0; i < off.modifiers.Count; i++)
                {
                    mods.Add(new CostModifier
                    {
                        Modifier = (Calculate.Multifier)off.modifiers[i].op,
                        Value = off.modifiers[i].value,
                    });
                }
            }

            RunContext.Instance.AddDeckCardWithModifiers(off.id, mods);

            var baseCard = RunContext.FindCardByStableId(off.id);
            if (baseCard != null)
            {
                CardSO card = baseCard.CreateClone();
                for (int i = 0; i < mods.Count; i++)
                {
                    card.AddCostModifier(mods[i].Modifier, mods[i].Value);
                }

                var deck = FindAnyObjectByType<DeckManager>();
                if (deck != null)
                {
                    deck.AddPurchasedCardToRunDeck(card);
                }
            }
        }

        off.sold = true;
        RunContext.Instance.SaveRun();
        Refresh();
    }

    private TextMeshProUGUI AddText(string name, Vector2 anchoredPos, float fontSize, TextAlignmentOptions align)
    {
        var go = new GameObject(name);
        go.transform.SetParent(_panel.transform);

        var rt = go.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(860f, 60f);
        rt.anchoredPosition = anchoredPos;

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = string.Empty;
        tmp.fontSize = fontSize;
        tmp.alignment = align;
        tmp.color = Color.white;
        return tmp;
    }

    private void AddButton(string text, Vector2 anchoredPos, UnityEngine.Events.UnityAction onClick)
    {
        AddButton(text, anchoredPos, onClick, out _);
    }

    private Button AddButton(string text, Vector2 anchoredPos, UnityEngine.Events.UnityAction onClick, out TextMeshProUGUI label)
    {
        var btnGo = new GameObject(text);
        btnGo.transform.SetParent(_panel.transform);

        var rt = btnGo.AddComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(420f, 80f);
        rt.anchoredPosition = anchoredPos;

        var img = btnGo.AddComponent<Image>();
        img.color = new Color(0.2f, 0.2f, 0.2f, 0.95f);

        var btn = btnGo.AddComponent<Button>();
        btn.onClick.AddListener(onClick);

        var labelGo = new GameObject("Label");
        labelGo.transform.SetParent(btnGo.transform);
        var lrt = labelGo.AddComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero;
        lrt.anchorMax = Vector2.one;
        lrt.offsetMin = Vector2.zero;
        lrt.offsetMax = Vector2.zero;

        label = labelGo.AddComponent<TextMeshProUGUI>();
        label.text = text;
        label.fontSize = 30;
        label.alignment = TextAlignmentOptions.Center;
        label.color = Color.white;

        return btn;
    }

    private static void EnsureCtx()
    {
        if (RunContext.Instance == null)
        {
            var go = new GameObject("RunContext");
            go.AddComponent<RunContext>();
        }
        if (ArcanaSelectionMode.Instance == null)
        {
            var go = new GameObject("ArcanaSelectionMode");
            go.AddComponent<ArcanaSelectionMode>();
        }
        if (ArcanaOverlayUI.Instance == null)
        {
            var go = new GameObject("ArcanaOverlayUI");
            go.AddComponent<ArcanaOverlayUI>();
        }
    }
}
