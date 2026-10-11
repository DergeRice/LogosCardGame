using UnityEngine;

public static class LearningUiSkin
{
    public static readonly Color PaperColor = new Color(.965f, .953f, .922f, 1f);
    public static readonly Color InkColor = new Color(.137f, .235f, .298f, 1f);
    public static readonly Color MintColor = new Color(.863f, .925f, .890f, 1f);
    public static readonly Color TealColor = new Color(.212f, .490f, .447f, 1f);
    public static Sprite ResolveSurfaceSprite() => ResolveSprite(null,
        "Assets/Layer Lab/GUI Pro-SimpleCasual/ResourcesData/Sprites/Components/Frame/Frame_Custom/BasicFrame_Square01_White.png",
        "Learning/Remaster/Panel");
    public const string CurrencyHudPrefabPath = "Assets/05.Prefabs/UI/CurrencyHudPrefab.prefab";
    public const string ActionButtonPrefabPath = "Assets/05.Prefabs/UI/ActionButtonPrefab.prefab";
    public const string ShopItemOfferPrefabPath = "Assets/05.Prefabs/UI/ShopItemOfferPrefab.prefab";
    public const string ShopCardOfferPrefabPath = "Assets/05.Prefabs/UI/ShopCardOfferPrefab.prefab";
    public const string PosCardPrefabPath = "Assets/05.Prefabs/PosCard.prefab";
    public const string ShopPanelPrefabPath = "Assets/05.Prefabs/UI/ShopPanelPrefab.prefab";
    public const string CurrencyHudPrefabResourcePath = "Learning/Prefabs/UI/CurrencyHudPrefab";
    public const string ActionButtonPrefabResourcePath = "Learning/Prefabs/UI/ActionButtonPrefab";
    public const string ShopItemOfferPrefabResourcePath = "Learning/Prefabs/UI/ShopItemOfferPrefab";
    public const string ShopCardOfferPrefabResourcePath = "Learning/Prefabs/UI/ShopCardOfferPrefab";
    public const string PosCardPrefabResourcePath = "Learning/Prefabs/PosCard";
    public const string ShopPanelPrefabResourcePath = "Learning/Prefabs/UI/ShopPanelPrefab";
    public const string DefaultButtonSpritePath = "Assets/Layer Lab/GUI Pro-SimpleCasual/ResourcesData/Sprites/Components/Button/Button_Custom/Btn_IconButton_Square_White.png";
    public const string DefaultItemIconSpritePath = "Assets/Layer Lab/GUI Pro-CasualGame/ResourcesData/Sprites/Components/Icon_ItemIcons/256/Icon_Potion02_Blue.png";
    public const string DefaultCoinIconSpritePath = "Assets/Layer Lab/GUI Pro-SimpleCasual/ResourcesData/Sprites/Components/Icon_ItemIcons/256/Itemicon_Coin_Gold_Dollar.Png";
    public const string DefaultButtonSpriteResourcePath = "Learning/Sprites/Btn_IconButton_Square_White";
    public const string DefaultItemIconSpriteResourcePath = "Learning/Sprites/Icon_Potion02_Blue";
    public const string DefaultCoinIconSpriteResourcePath = "Learning/Sprites/Itemicon_Coin_Gold_Dollar";

    public static Sprite LoadEditorSprite(string assetPath)
    {
#if UNITY_EDITOR
        return UnityEditor.AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
#else
        return null;
#endif
    }

    public static Sprite ResolveButtonSprite(Sprite assigned)
    {
        return ResolveSprite(assigned, DefaultButtonSpritePath, DefaultButtonSpriteResourcePath);
    }

    public static Sprite ResolveItemIconSprite(Sprite assigned)
    {
        return ResolveSprite(assigned, DefaultItemIconSpritePath, DefaultItemIconSpriteResourcePath);
    }

    public static Sprite ResolveCoinIconSprite(Sprite assigned)
    {
        return ResolveSprite(assigned, DefaultCoinIconSpritePath, DefaultCoinIconSpriteResourcePath);
    }

    public static GameObject LoadEditorPrefab(string assetPath)
    {
#if UNITY_EDITOR
        return UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
#else
        return null;
#endif
    }

    public static GameObject ResolvePrefab(GameObject assigned, string editorAssetPath, string resourcePath)
    {
        if (assigned != null) return assigned;

        GameObject prefab = Resources.Load<GameObject>(resourcePath);
        if (prefab != null) return prefab;

        return LoadEditorPrefab(editorAssetPath);
    }

    public static Sprite ResolveSprite(Sprite assigned, string editorAssetPath, string resourcePath)
    {
        if (assigned != null) return assigned;

        Sprite sprite = Resources.Load<Sprite>(resourcePath);
        if (sprite != null) return sprite;

        return LoadEditorSprite(editorAssetPath);
    }

    public static GameObject ResolvePosCardPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, PosCardPrefabPath, PosCardPrefabResourcePath);
    }

    public static GameObject ResolveCurrencyHudPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, CurrencyHudPrefabPath, CurrencyHudPrefabResourcePath);
    }

    public static GameObject ResolveActionButtonPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, ActionButtonPrefabPath, ActionButtonPrefabResourcePath);
    }

    public static GameObject ResolveShopItemOfferPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, ShopItemOfferPrefabPath, ShopItemOfferPrefabResourcePath);
    }

    public static GameObject ResolveShopCardOfferPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, ShopCardOfferPrefabPath, ShopCardOfferPrefabResourcePath);
    }

    public static GameObject ResolveShopPanelPrefab(GameObject assigned)
    {
        return ResolvePrefab(assigned, ShopPanelPrefabPath, ShopPanelPrefabResourcePath);
    }
}
