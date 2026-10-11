using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LearningExplorationScreenView : MonoBehaviour
{
    [Header("Root")]
    public RectTransform uiRootRect;
    public Canvas canvas;

    [Header("Boss")]
    public LearningBossView bossView;

    [Header("Top HUD")]
    public TMP_Text titleText;
    public TMP_Text hpText;
    public TMP_Text countText;
    public TMP_Text submitCountText;
    public TMP_Text dropCountText;
    public TMP_Text messageText;
    public TMP_Text damageText;
    public TMP_Text plusText;
    public TMP_Text multiplyText;
    public Transform plusRoot;
    public Transform multiplyRoot;
    public Image plusFill;
    public Image multiplyFill;

    [Header("Animation Prefabs")]
    public GameObject damageProjectilePrefab;
    public GameObject drawGhostCardPrefab;
    public RectTransform drawPileButtonRoot;
    public RectTransform discardPileButtonRoot;

    [Header("Card Areas")]
    public Transform sentenceRoot;
    public Transform handRoot;
    public Transform itemRoot;
    public LearningItemSlotView[] itemSlotViews;

    [Header("Buttons")]
    public Button submitButton;
    public Button dropButton;
    public Button lobbyButton;
    public Button deckButton;
    public Button cheatKillButton;

    [Header("Panels")]
    public GameObject deckPanel;
    public GameObject drawPilePanel;
    public GameObject discardPilePanel;
    public TMP_Text deckPanelText;
    public Transform drawPileRoot;
    public Transform discardPileRoot;
    public GameObject defeatPanel;

    private void Reset()
    {
        AutoFillFromChildren();
    }

    private void Awake()
    {
        AutoFillFromChildren();
        HideCheatKillButton();
    }

    private void OnValidate()
    {
        if (!Application.isPlaying) HideCheatKillButton();
    }

    [ContextMenu("Auto Fill From Children")]
    public void AutoFillFromChildren()
    {
        if (uiRootRect == null) uiRootRect = transform as RectTransform;
        if (canvas == null) canvas = GetComponentInParent<Canvas>();
        if (bossView == null) bossView = GetComponentInChildren<LearningBossView>(true);
        if (titleText == null) titleText = FindText("Title");
        if (hpText == null) hpText = FindText("Hp", "HpText");
        if (countText == null) countText = FindOwnText("CountText", "Counts");
        if (submitCountText == null) submitCountText = FindText("SubmitCountText", "SubmitCount", "HandsCount");
        if (dropCountText == null) dropCountText = FindText("DropCountText", "DropCount", "DropsCount");
        if (messageText == null) messageText = FindText("Message", "MessageText");
        if (damageText == null) damageText = FindText("DamageText", "Damage", "DamageCountText");
        if (plusText == null) plusText = FindText("PlusText", "Plus", "AddText");
        if (multiplyText == null) multiplyText = FindText("MultiflyText", "MultiplyText", "Multiply", "XText");
        if (plusRoot == null) plusRoot = FindTransform("PlusText", "Plus", "AddText");
        if (multiplyRoot == null) multiplyRoot = FindTransform("MultiflyText", "MultiplyText", "Multiply", "XText");
        if (plusFill == null) plusFill = FindImageUnder("PlusText", "Plus", "AddText");
        if (multiplyFill == null) multiplyFill = FindImageUnder("MultiflyText", "MultiplyText", "Multiply", "XText");
        if (sentenceRoot == null) sentenceRoot = FindTransform("SentenceRoot", "PlayFieldRoot", "FieldRoot");
        if (handRoot == null) handRoot = FindTransform("HandRoot");
        if (itemRoot == null) itemRoot = FindTransform("ItemRoot", "ItemSlotRoot");
        RefreshItemSlotReferences();
        if (submitButton == null) submitButton = FindButton("SubmitButton", "Submit");
        if (dropButton == null) dropButton = FindButton("DropButton", "Drop");
        if (lobbyButton == null) lobbyButton = FindButton("LobbyButton", "Lobby");
        if (deckButton == null) deckButton = FindButton("DeckButton", "Deck");
        if (cheatKillButton == null) cheatKillButton = FindButton("CheatKillButton", "CheatKill");
        if (deckPanel == null) deckPanel = FindTransform("DeckListPanelRoot", "DeckListPanel", "DeckPanel")?.gameObject;
        if (drawPileButtonRoot == null) drawPileButtonRoot = FindRect("DrawPileButton", "DrawDeckButton", "DeckDrawButton");
        if (discardPileButtonRoot == null) discardPileButtonRoot = FindRect("DiscardPileButton", "DiscardDeckButton", "DeckDiscardButton");
        if (drawPileRoot == null) drawPileRoot = FindTransform("DrawPileRoot", "DrawDeckRoot", "DeckDrawRoot");
        if (discardPileRoot == null) discardPileRoot = FindTransform("DiscardPileRoot", "DiscardDeckRoot", "DeckDiscardRoot");
        if (drawPilePanel == null) drawPilePanel = FindTransform("DrawPilePanel", "DrawDeckPanel")?.gameObject;
        if (discardPilePanel == null) discardPilePanel = FindTransform("DiscardPilePanel", "DiscardDeckPanel")?.gameObject;
        HideCheatKillButton();
    }

    private void HideCheatKillButton()
    {
        if (cheatKillButton != null) cheatKillButton.gameObject.SetActive(false);
    }

    public void RefreshItemSlotReferences()
    {
        LearningItemSlotView[] found = GetComponentsInChildren<LearningItemSlotView>(true);
        if (found == null || found.Length == 0) return;
        itemSlotViews = found;
    }

    private TMP_Text FindText(params string[] names)
    {
        Transform target = FindTransform(names);
        return target != null ? target.GetComponent<TMP_Text>() ?? target.GetComponentInChildren<TMP_Text>(true) : null;
    }

    private TMP_Text FindOwnText(params string[] names)
    {
        Transform target = FindTransform(names);
        return target != null ? target.GetComponent<TMP_Text>() : null;
    }

    private Image FindImageUnder(params string[] names)
    {
        Transform target = FindTransform(names);
        return target != null ? FindImageRecursive(target, "Fill", "fill") : null;
    }

    private Button FindButton(params string[] names)
    {
        Transform target = FindTransform(names);
        return target != null ? target.GetComponent<Button>() : null;
    }

    private RectTransform FindRect(params string[] names)
    {
        Transform target = FindTransform(names);
        return target as RectTransform;
    }

    private Transform FindTransform(params string[] names)
    {
        return FindTransformRecursive(transform, names);
    }

    private static Transform FindTransformRecursive(Transform root, string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < names.Length; i++)
        {
            if (NameMatches(root.name, names[i])) return root;
        }

        for (int i = 0; i < root.childCount; i++)
        {
            Transform found = FindTransformRecursive(root.GetChild(i), names);
            if (found != null) return found;
        }
        return null;
    }

    private static bool NameMatches(string actual, string expected)
    {
        if (string.IsNullOrEmpty(actual) || string.IsNullOrEmpty(expected)) return false;
        return actual.Equals(expected, System.StringComparison.OrdinalIgnoreCase) ||
               actual.StartsWith(expected + " (", System.StringComparison.OrdinalIgnoreCase);
    }

    private static Image FindImageRecursive(Transform root, params string[] names)
    {
        if (root == null) return null;
        for (int i = 0; i < root.childCount; i++)
        {
            Transform child = root.GetChild(i);
            for (int j = 0; j < names.Length; j++)
            {
                if (NameMatches(child.name, names[j]) && child.TryGetComponent(out Image image)) return image;
            }

            Image nested = FindImageRecursive(child, names);
            if (nested != null) return nested;
        }

        Image self = root.GetComponent<Image>();
        return self != null && root.name.IndexOf("fill", System.StringComparison.OrdinalIgnoreCase) >= 0 ? self : null;
    }
}
