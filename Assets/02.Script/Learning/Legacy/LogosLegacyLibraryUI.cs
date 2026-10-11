using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>Library selector shown over the Learning lobby tab for Legacy 01 source books.</summary>
public class LogosLegacyLibraryUI : MonoBehaviour
{
    private sealed class BookDefinition
    {
        public string id;
        public string title;
        public string iconPath;
    }

    private sealed class BookView
    {
        public BookDefinition book;
        public Image fill;
        public TMP_Text percent;
    }

    private static readonly BookDefinition[] Books =
    {
        new BookDefinition { id = "sherlock_holmes_adventures", title = "셜록 홈즈의 모험", iconPath = "Learning/Books/book_01" },
        new BookDefinition { id = "secret_garden", title = "비밀의 화원", iconPath = "Learning/Books/book_02" },
        new BookDefinition { id = "railway_children", title = "기찻길의 아이들", iconPath = "Learning/Books/book_03" },
        new BookDefinition { id = "wonderful_wizard_of_oz", title = "오즈의 마법사", iconPath = "Learning/Books/book_04" },
        new BookDefinition { id = "anne_of_green_gables", title = "빨간 머리 앤", iconPath = "Learning/Books/book_05" },
        new BookDefinition { id = "treasure_island", title = "보물섬", iconPath = "Learning/Books/book_06" },
        new BookDefinition { id = "happy_prince_and_other_tales", title = "행복한 왕자", iconPath = "Learning/Books/book_07" },
        new BookDefinition { id = "the_four_million", title = "사백만", iconPath = "Learning/Books/book_08" },
        new BookDefinition { id = "little_women", title = "작은 아씨들", iconPath = "Learning/Books/book_09" },
        new BookDefinition { id = "tale_of_peter_rabbit", title = "피터 래빗 이야기", iconPath = "Learning/Books/book_10" },
    };

    private readonly List<BookView> views = new List<BookView>();
    private LearningLobbyTabController tabController;
    private GameObject libraryRoot;
    private Material grayscaleMaterial;
    private bool visible;

    private void Awake()
    {
        Shader grayscaleShader = Shader.Find("UI/LegacyBookGrayscale");
        if (grayscaleShader != null) grayscaleMaterial = new Material(grayscaleShader);
        Build();
    }

    private void Update()
    {
        if (libraryRoot == null) return;
        if (tabController == null) tabController = FindFirstObjectByType<LearningLobbyTabController>();
        bool shouldShow = tabController != null && tabController.Current == LearningLobbyTabType.Learning;
        if (visible != shouldShow)
        {
            visible = shouldShow;
            libraryRoot.SetActive(visible);
            if (visible) RefreshProgress();
        }
    }

    private void Build()
    {
        if (tabController == null) tabController = FindFirstObjectByType<LearningLobbyTabController>();
        RectTransform learningPanel = tabController != null ? tabController.LearningPanel : null;
        if (learningPanel == null) { Debug.LogError("[LogosLegacyLibraryUI] Learning tab panel is missing."); return; }

        libraryRoot = new GameObject("LegacyBookLibrary", typeof(RectTransform));
        libraryRoot.transform.SetParent(learningPanel, false);
        Stretch(libraryRoot.GetComponent<RectTransform>());

        Image surface = CreateImage(libraryRoot.transform, "TabBackground", Vector2.zero, Vector2.one, LearningUiSkin.PaperColor);
        surface.raycastTarget = false;
        Text(libraryRoot.transform, "Title", "원전 서가", new Vector2(.08f, .86f), new Vector2(.92f, .91f), 38, LearningUiSkin.InkColor, TextAlignmentOptions.Center);
        Text(libraryRoot.transform, "Subtitle", "책을 선택하세요", new Vector2(.08f, .825f), new Vector2(.92f, .855f), 20, new Color(.35f, .48f, .5f, 1f), TextAlignmentOptions.Center);

        GameObject viewport = new GameObject("BookViewport", typeof(RectTransform), typeof(Image), typeof(RectMask2D), typeof(ScrollRect));
        viewport.transform.SetParent(libraryRoot.transform, false);
        RectTransform viewportRect = viewport.GetComponent<RectTransform>();
        viewportRect.anchorMin = new Vector2(.055f, .145f); viewportRect.anchorMax = new Vector2(.945f, .81f); viewportRect.offsetMin = viewportRect.offsetMax = Vector2.zero;
        viewport.GetComponent<Image>().color = Color.clear;

        GameObject content = new GameObject("BookContent", typeof(RectTransform));
        content.transform.SetParent(viewport.transform, false);
        RectTransform contentRect = content.GetComponent<RectTransform>();
        contentRect.anchorMin = new Vector2(0, 1); contentRect.anchorMax = new Vector2(1, 1); contentRect.pivot = new Vector2(.5f, 1); contentRect.sizeDelta = new Vector2(0, 1510);
        ScrollRect scroll = viewport.GetComponent<ScrollRect>();
        scroll.viewport = viewportRect; scroll.content = contentRect; scroll.horizontal = false; scroll.vertical = true; scroll.movementType = ScrollRect.MovementType.Clamped; scroll.scrollSensitivity = 32;

        for (int i = 0; i < Books.Length; i++) BuildBook(content.transform, Books[i], i);
        libraryRoot.SetActive(false);
    }

    private void BuildBook(Transform parent, BookDefinition book, int index)
    {
        int column = index % 3;
        int row = index / 3;
        float x = 28 + column * 315;
        float y = -24 - row * 365;
        GameObject cell = new GameObject("Book_" + (index + 1), typeof(RectTransform));
        cell.transform.SetParent(parent, false);
        RectTransform cellRect = cell.GetComponent<RectTransform>();
        cellRect.anchorMin = cellRect.anchorMax = new Vector2(0, 1); cellRect.pivot = new Vector2(0, 1); cellRect.anchoredPosition = new Vector2(x, y); cellRect.sizeDelta = new Vector2(285, 340);

        Sprite sprite = LoadSprite(book.iconPath);
        Image cover = CreateImage(cell.transform, "Cover", new Vector2(0, .22f), new Vector2(1, 1), Color.white);
        cover.sprite = sprite; cover.preserveAspect = true;
        if (grayscaleMaterial != null) cover.material = grayscaleMaterial;
        Button button = cover.gameObject.AddComponent<Button>();
        button.targetGraphic = cover;
        button.onClick.AddListener(() => SelectBook(book));

        Image fill = CreateImage(cover.transform, "Fill", Vector2.zero, Vector2.one, Color.white);
        fill.sprite = sprite; fill.preserveAspect = true; fill.type = Image.Type.Filled; fill.fillMethod = Image.FillMethod.Vertical; fill.fillOrigin = 0; fill.raycastTarget = false;

        Text(cell.transform, "Name", book.title, new Vector2(0, .105f), new Vector2(1, .20f), 22, LearningUiSkin.InkColor, TextAlignmentOptions.Center);
        TMP_Text percent = Text(cell.transform, "Progress", "0% 진행", new Vector2(0, .015f), new Vector2(1, .10f), 19, LearningUiSkin.TealColor, TextAlignmentOptions.Center);
        views.Add(new BookView { book = book, fill = fill, percent = percent });
    }

    private void RefreshProgress()
    {
        foreach (BookView view in views)
        {
            LogosLegacyRoomRepository.GetProgressCounts(view.book.id, out int completed, out int total);
            int progress = total > 0 ? Mathf.RoundToInt(completed * 100f / total) : 0;
            view.fill.fillAmount = progress / 100f;
            view.percent.text = $"{completed}/{total}  ·  {progress}%";
        }
    }

    private static Sprite LoadSprite(string path)
    {
        Texture2D texture = Resources.Load<Texture2D>(path);
        if (texture == null) return null;
        return Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(.5f, .5f), 100);
    }

    private static Image CreateImage(Transform parent, string name, Vector2 min, Vector2 max, Color color)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        Image image = go.GetComponent<Image>(); image.color = color;
        return image;
    }

    private static TMP_Text Text(Transform parent, string name, string value, Vector2 min, Vector2 max, float size, Color color, TextAlignmentOptions alignment)
    {
        GameObject go = new GameObject(name, typeof(RectTransform), typeof(TextMeshProUGUI));
        go.transform.SetParent(parent, false);
        RectTransform rect = go.GetComponent<RectTransform>(); rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
        TextMeshProUGUI text = go.GetComponent<TextMeshProUGUI>(); text.font = LearningFontProvider.DefaultFont; text.text = value; text.fontSize = size; text.color = color; text.alignment = alignment; text.enableAutoSizing = true; text.fontSizeMin = Mathf.Max(14, size - 7); text.fontSizeMax = size; text.raycastTarget = false;
        return text;
    }

    private void SelectBook(BookDefinition book)
    {
        LogosLegacyRoomRepository.SelectedWorkId = book.id;
        LearningSceneLoader.LoadPractice();
    }

    private static void Stretch(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = rect.offsetMax = Vector2.zero;
    }
}
