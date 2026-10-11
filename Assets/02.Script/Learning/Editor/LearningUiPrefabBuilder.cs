#if UNITY_EDITOR
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class LearningUiPrefabBuilder
{
    private const string MenuPath = "Learning/UI/Attach Shop UI Prefab Scripts";

    [MenuItem(MenuPath)]
    public static void AttachShopUiPrefabScripts()
    {
        AttachCurrencyHud();
        AttachActionButton();
        AttachItemOffer();
        AttachCardOffer();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[LearningUiPrefabBuilder] Shop UI prefab scripts attached. Backgrounds and layouts were not modified.");
    }

    private static void AttachCurrencyHud()
    {
        GameObject root = LoadPrefabRoot(LearningUiSkin.CurrencyHudPrefabPath);
        if (root == null) return;
        root.name = "CurrencyHudPrefab";
        SetSize(root, new Vector2(330f, 70f));
        EnsureComponent<LearningCurrencySlotView>(root);
        ApplyDefaultFont(root);
        SavePrefabRoot(root, LearningUiSkin.CurrencyHudPrefabPath);
    }

    private static void AttachActionButton()
    {
        GameObject root = LoadPrefabRoot(LearningUiSkin.ActionButtonPrefabPath);
        if (root == null) return;
        root.name = "ActionButtonPrefab";
        SetSize(root, new Vector2(300f, 74f));
        EnsureComponent<Button>(root);
        EnsureComponent<LearningShopActionButtonView>(root);
        ApplyDefaultFont(root);
        SavePrefabRoot(root, LearningUiSkin.ActionButtonPrefabPath);
    }

    private static void AttachItemOffer()
    {
        GameObject root = LoadPrefabRoot(LearningUiSkin.ShopItemOfferPrefabPath);
        if (root == null) return;
        root.name = "ShopItemOfferPrefab";
        SetSize(root, new Vector2(302f, 250f));
        EnsureComponent<Button>(root);
        EnsureComponent<LearningShopItemOfferView>(root);
        SetLayoutElement(root, 302f, 250f);
        ApplyDefaultFont(root);
        SavePrefabRoot(root, LearningUiSkin.ShopItemOfferPrefabPath);
    }

    private static void AttachCardOffer()
    {
        GameObject root = LoadPrefabRoot(LearningUiSkin.ShopCardOfferPrefabPath);
        if (root == null) return;
        root.name = "ShopCardOfferPrefab";
        SetSize(root, new Vector2(302f, 230f));
        EnsureComponent<Button>(root);
        EnsureComponent<LearningShopCardOfferView>(root);
        SetLayoutElement(root, 302f, 230f);
        ApplyDefaultFont(root);
        SavePrefabRoot(root, LearningUiSkin.ShopCardOfferPrefabPath);
    }

    private static void ApplyDefaultFont(GameObject root)
    {
        TMP_FontAsset font = LearningFontProvider.DefaultFont;
        if (font == null) return;

        TMP_Text[] texts = root.GetComponentsInChildren<TMP_Text>(true);
        for (int i = 0; i < texts.Length; i++)
        {
            texts[i].font = font;
        }
    }

    private static void SetSize(GameObject root, Vector2 size)
    {
        RectTransform rect = root.transform as RectTransform;
        if (rect == null) rect = root.AddComponent<RectTransform>();
        rect.sizeDelta = size;
        root.layer = 5;
    }

    private static void SetLayoutElement(GameObject root, float width, float height)
    {
        LayoutElement element = root.GetComponent<LayoutElement>();
        if (element == null) element = root.AddComponent<LayoutElement>();
        element.preferredWidth = width;
        element.preferredHeight = height;
    }

    private static T EnsureComponent<T>(GameObject go) where T : Component
    {
        T component = go.GetComponent<T>();
        if (component == null) component = go.AddComponent<T>();
        return component;
    }

    private static GameObject LoadPrefabRoot(string path)
    {
        GameObject root = PrefabUtility.LoadPrefabContents(path);
        if (root == null)
        {
            Debug.LogWarning($"[LearningUiPrefabBuilder] Missing prefab: {path}");
        }
        return root;
    }

    private static void SavePrefabRoot(GameObject root, string path)
    {
        PrefabUtility.SaveAsPrefabAsset(root, path);
        PrefabUtility.UnloadPrefabContents(root);
    }
}
#endif
