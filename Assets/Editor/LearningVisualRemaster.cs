#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

/// <summary>Repeatable authoring pass. All art remains serialized in scenes / prefabs for player builds.</summary>
public static class LearningVisualRemaster
{
    const string Pack = "Assets/Layer Lab/GUI Pro-SimpleCasual/";
    const string Art = Pack + "ResourcesData/Sprites/Components/";
    const string Out = "Assets/Resources/Learning/Remaster";
    static readonly Color Ink = C("233C4C"), Muted = C("72828A"), Paper = C("F6F3EB"), Mint = C("DCECE3"), Teal = C("367D72"), Peach = C("F2BA8F");
    static Sprite round;
    static GameObject burst;
    static Color C(string s) { ColorUtility.TryParseHtmlString("#" + s, out var c); return c; }
    static Sprite S(string relative) => AssetDatabase.LoadAssetAtPath<Sprite>(Art + relative);
    static Sprite Icon(string name) => S("Icon_ItemIcons/256/Itemicon_" + name + ".Png");
    static void Init() { Directory.CreateDirectory(Out); round = S("Frame/Frame_Custom/BasicFrame_Square01_White.png"); burst = AssetDatabase.LoadAssetAtPath<GameObject>(Out + "/Celebration.prefab"); }
    static RectTransform R(Transform parent, string name, float x, float y, float w, float h)
    {
        var rt = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>(); rt.SetParent(parent, false); Place(rt,x,y,w,h); return rt;
    }
    static void Place(RectTransform r,float x,float y,float w,float h)
    { r.anchorMin=r.anchorMax=new Vector2(.5f,1); r.pivot=new Vector2(.5f,1); r.anchoredPosition=new Vector2(x,-y); r.sizeDelta=new Vector2(w,h); r.localScale=Vector3.one; }
    static Image Box(Transform p,string n,float x,float y,float w,float h,Color color)
    { var r=R(p,n,x,y,w,h); var i=r.gameObject.AddComponent<Image>(); i.sprite=round;i.type=Image.Type.Sliced;i.color=color;i.raycastTarget=false;return i; }
    static TMP_Text Text(Transform p,string n,string value,float x,float y,float w,float h,float size,Color color,TextAlignmentOptions alignment=TextAlignmentOptions.MidlineLeft)
    { var r=R(p,n,x,y,w,h);var t=r.gameObject.AddComponent<TextMeshProUGUI>();t.font=LearningFontProvider.DefaultFont;t.text=value;t.fontSize=size;t.color=color;t.alignment=alignment;t.raycastTarget=false;t.enableAutoSizing=true;t.fontSizeMin=size-4;t.fontSizeMax=size;return t; }
    static Image Pic(Transform p,string n,Sprite sprite,float x,float y,float w,float h)
    {var i=Box(p,n,x,y,w,h,Color.white);i.sprite=sprite;i.type=Image.Type.Simple;i.preserveAspect=true;return i;}
    static Button Button(Transform p,string name,string label,float x,float y,float w,float h,Color color,LearningActionType action=LearningActionType.None)
    {
        var i=Box(p,name,x,y,w,h,color);i.raycastTarget=true;var b=i.gameObject.AddComponent<Button>();b.targetGraphic=i;
        var cb=b.colors;cb.highlightedColor=C("E8F6EF");cb.pressedColor=C("B8D5C9");cb.disabledColor=C("B8BCBB");b.colors=cb;
        Text(i.transform,"Label",label,0,0,w-36,h,32,color==Ink||color==Teal?Color.white:Ink,TextAlignmentOptions.Center);
        Pic(i.transform,"Icon",null,0,0,1,1).gameObject.SetActive(false);
        if(action!=LearningActionType.None)i.gameObject.AddComponent<LearningActionButton>().Configure(action);
        var motion=i.gameObject.AddComponent<LearningRemasterMotion>();motion.burstPrefab=burst;
        i.gameObject.AddComponent<LearningPressableButtonFeedback>();return b;
    }
    static void Set(Object obj,string field,Object value)
    {var so=new SerializedObject(obj);var p=so.FindProperty(field);if(p!=null){p.objectReferenceValue=value;so.ApplyModifiedPropertiesWithoutUndo();}}
    static void ColorField(Object obj,string field,Color value)
    {var so=new SerializedObject(obj);var p=so.FindProperty(field);if(p!=null){p.colorValue=value;so.ApplyModifiedPropertiesWithoutUndo();}}
    static Transform Find(Transform root,string name) => root.Find(name) ?? root.GetComponentsInChildren<Transform>(true).FirstOrDefault(t=>t.name==name);
    static void HideChildren(Transform t) {foreach(Transform ch in t) ch.gameObject.SetActive(false);}
    static void Remove(Transform root,string name) {var t=Find(root,name);if(t!=null)Object.DestroyImmediate(t.gameObject);}
    static void Fill(RectTransform rt) {rt.anchorMin=Vector2.zero;rt.anchorMax=Vector2.one;rt.offsetMin=rt.offsetMax=Vector2.zero;rt.localScale=Vector3.one;}

    [MenuItem("Tools/Learning/Visual Remaster/1. Build Shared Assets")]
    public static void Shared()
    {
        Init();
        if(!File.Exists(Out+"/Panel.png"))AssetDatabase.CopyAsset(Art+"Frame/Frame_Custom/BasicFrame_Square01_White.png",Out+"/Panel.png");
        var root=new GameObject("Celebration",typeof(RectTransform));
        var source=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/JMO Assets/Cartoon FX Remaster/CFXR Prefabs/Impacts/CFXR Sparks Impact.prefab");
        var fx=(GameObject)PrefabUtility.InstantiatePrefab(source,root.transform);
        foreach(var behaviour in fx.GetComponentsInChildren<MonoBehaviour>(true)) Object.DestroyImmediate(behaviour);
        foreach(var ps in fx.GetComponentsInChildren<ParticleSystem>(true)) {var m=ps.main;m.useUnscaledTime=true;m.loop=false;m.startColor=new ParticleSystem.MinMaxGradient(Peach,Mint);m.maxParticles=45;}
        var ui=root.AddComponent<Coffee.UIExtensions.UIParticle>();ui.scale=38;ui.raycastTarget=false;ui.RefreshParticles();
        burst=PrefabUtility.SaveAsPrefabAsset(root,Out+"/Celebration.prefab");Object.DestroyImmediate(root);
        BuildShop();AssetDatabase.SaveAssets();Debug.Log("[VisualRemaster] Shared shop and Cartoon FX UI prefab built.");
    }
    static LearningCurrencySlotView Currency(Transform p,string name,float x,float y,float w,float h)
    {
        var b=Button(p,name,"",x,y,w,h,Teal);var old=b.transform.Find("Label");Object.DestroyImmediate(old.gameObject);
        var icon=Pic(b.transform,"CoinIcon",Icon("Coin_Gold_Dollar"),-w*.27f,14,44,44);
        var text=Text(b.transform,"Text","0",w*.12f,0,w*.55f,h,32,Color.white,TextAlignmentOptions.Center);
        var view=b.gameObject.AddComponent<LearningCurrencySlotView>();Set(view,"iconImage",icon);Set(view,"valueText",text);Set(view,"button",b);return view;
    }
    static LearningShopActionButtonView ShopAction(Transform p,string name,string label,float x,float y,float w,float h,Color c)
    {var b=Button(p,name,label,x,y,w,h,c);var v=b.gameObject.AddComponent<LearningShopActionButtonView>();Set(v,"button",b);Set(v,"labelText",b.transform.Find("Label").GetComponent<TMP_Text>());Set(v,"iconImage",b.transform.Find("Icon").GetComponent<Image>());return v;}
    static void BuildShop()
    {
        var root=R(null,"ShopPanelPrefab",0,0,1080,1920);var bg=root.gameObject.AddComponent<Image>();bg.color=Paper;bg.raycastTarget=true;
        var v=root.gameObject.AddComponent<LearningShopPanelView>();
        Text(root,"Eyebrow","THE TRAVELLER'S MARKET",0,90,960,44,24,Teal);
        v.titleText=Text(root,"TitleText","탐험 상점",0,142,960,116,48,Ink);
        v.coinSlotView=Currency(root,"CoinHud",360,72,240,80);
        v.statusText=Text(root,"StatusText","다음 여정을 위한 작은 발견",0,265,960,72,26,Muted);
        Text(root,"ItemHeading","01  /  모험의 도구",0,370,960,52,30,Ink);
        v.itemOfferRoot=R(root,"ItemOfferRoot",0,445,960,450);
        v.itemOfferViews=new LearningShopItemOfferView[3];
        for(int k=0;k<3;k++)
        {
            var tile=Box(v.itemOfferRoot,"ShopItemOfferPrefab",(k-1)*328,0,304,430,Color.white);
            var offer=tile.gameObject.AddComponent<LearningShopItemOfferView>();v.itemOfferViews[k]=offer;
            var icon=Pic(tile.transform,"ItemIcon",Icon("Bag_1"),0,25,132,132);
            var title=Text(tile.transform,"NameText","아이템",0,172,268,50,27,Ink,TextAlignmentOptions.Center);
            var desc=Text(tile.transform,"Des","아이템 효과",0,225,268,110,24,Muted,TextAlignmentOptions.TopLeft);
            var price=Currency(tile.transform,"CurrencyHudPrefab",0,350,272,64);
            Set(offer,"iconImage",icon);Set(offer,"nameText",title);Set(offer,"descriptionText",desc);Set(offer,"purchaseCurrencyView",price);Set(offer,"rootBackgroundImage",tile);
            ColorField(offer,"bBackgroundColor",C("E3EEE8"));ColorField(offer,"aBackgroundColor",C("E4E9F5"));ColorField(offer,"sBackgroundColor",C("FAE9CC"));
        }
        Text(root,"CardHeading","02  /  덱을 더 강하게",0,945,960,52,30,Ink);
        v.cardOfferRoot=R(root,"CardOfferRoot",0,1020,960,300);v.cardOfferViews=new LearningShopCardOfferView[3];
        for(int k=0;k<3;k++)
        {
            var tile=Box(v.cardOfferRoot,"ShopCardOfferPrefab",(k-1)*328,0,304,292,Color.white);
            var offer=tile.gameObject.AddComponent<LearningShopCardOfferView>();v.cardOfferViews[k]=offer;
            var display=Box(tile.transform,"DisplayCard",0,22,266,110,Ink);var deck=display.gameObject.AddComponent<LearningDeckCardView>();
            var name=Text(display.transform,"Text","카드",0,0,248,110,29,Color.white,TextAlignmentOptions.Center);Set(deck,"labelText",name);Set(deck,"background",display);
            var desc=Text(tile.transform,"DescriptionText","강화 카드",0,142,260,52,27,Teal,TextAlignmentOptions.Center);
            var price=Currency(tile.transform,"CurrencyHudPrefab",0,210,272,64);
            var icon=Pic(tile.transform,"CardIcon",Icon("Book_Purple"),0,0,1,1);icon.gameObject.SetActive(false);
            Set(offer,"displayCardView",deck);Set(offer,"nameText",name);Set(offer,"descriptionText",desc);Set(offer,"purchaseCurrencyView",price);Set(offer,"iconImage",icon);
        }
        v.rerollButtonView=ShopAction(root,"RerollButton","새 상품 보기",-246,1425,468,96,Mint);
        v.deckDeleteButtonView=ShopAction(root,"DeckDeleteButton","카드 삭제 10G",246,1425,468,96,C("E8E5DE"));
        Text(root,"ShopNote","필요한 것을 고르고, 나만의 덱을 완성하세요.",0,1570,960,56,25,Muted,TextAlignmentOptions.Center);
        v.continueButtonView=ShopAction(root,"ContinueButton","다음 여정으로",0,1710,960,112,Ink);
        v.itemOfferAnimationRoot=(RectTransform)v.itemOfferRoot;v.cardOfferAnimationRoot=(RectTransform)v.cardOfferRoot;
        root.gameObject.AddComponent<LearningRemasterMotion>().entrance=true;
        PrefabUtility.SaveAsPrefabAsset(root.gameObject,LearningUiSkin.ShopPanelPrefabPath);
        PrefabUtility.SaveAsPrefabAsset(root.gameObject,"Assets/Resources/Learning/Prefabs/UI/ShopPanelPrefab.prefab");
        Object.DestroyImmediate(root.gameObject);
    }

    [MenuItem("Tools/Learning/Visual Remaster/2. Dress Lobby")]
    public static void Lobby()
    {
        Init();var scene=EditorSceneManager.OpenScene("Assets/01.Scene/2.LobbyScreen.unity");
        var canvas=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Canvas>(true)).First();
        Dress(canvas.transform);
        var background=canvas.transform.Find("Image")?.GetComponent<Image>();if(background!=null){background.sprite=null;background.color=Paper;}
        var panels=Find(canvas.transform,"Panels") as RectTransform;Place(panels,0,300,980,1360);
        var home=Find(panels,"Home") as RectTransform;HideChildren(home);Fill(home);Remove(home,"RemasterHome");
        var content=R(home,"RemasterHome",0,0,980,1360);content.gameObject.AddComponent<LearningRemasterMotion>().entrance=true;
        Text(content,"Brand","L O G O S  /  DAILY ADVENTURE",0,0,960,44,23,Teal);
        Text(content,"Welcome","한 장의 문장,\n새로운 모험.",0,64,960,164,65,Ink);
        Text(content,"Subtitle","배우고, 조합하고, 당신의 세계를 넓히세요.",0,243,960,50,29,Muted);
        var hero=Box(content,"AdventureCard",0,338,960,478,Mint);
        // Use the pack's authored icon frame, keeping its nested prefab artwork.
        var frameAsset=AssetDatabase.LoadAssetAtPath<GameObject>(Pack+"Prefabs/Prefabs_Component_Buttons/Btn_IconButton_Square.prefab");
        var frameInstance=(GameObject)PrefabUtility.InstantiatePrefab(frameAsset,hero.transform);
        frameInstance.name="SimpleCasualFrame"; Place((RectTransform)frameInstance.transform,302,86,240,240);
        foreach(Transform child in frameInstance.transform) child.gameObject.SetActive(child.name.Contains("WhiteCustom"));
        foreach(var b in frameInstance.GetComponentsInChildren<Button>(true)) Object.DestroyImmediate(b);
        foreach(var g in frameInstance.GetComponentsInChildren<Graphic>(true))g.raycastTarget=false;
        foreach(var im in frameInstance.GetComponentsInChildren<Image>(true))if(im.name=="Icon")im.gameObject.SetActive(false);
        foreach(Transform child in frameInstance.transform)if(child.gameObject.activeSelf){Fill((RectTransform)child);var im=child.GetComponent<Image>();if(im!=null){im.sprite=round;im.type=Image.Type.Sliced;im.color=new Color(1,1,1,.4f);}}
        Text(hero.transform,"JourneyHeading","오늘의 여정",-165,42,540,48,28,Teal);
        Text(hero.transform,"JourneyTitle","작은 카드로\n큰 세계를 탐험해요",-145,107,580,140,44,Ink);
        var journey=Text(hero.transform,"JourneyProgress","",-155,266,560,48,25,Teal);
        hero.gameObject.AddComponent<LearningRemasterMotion>().journeyText=journey;
        Pic(hero.transform,"Map",Icon("Globe"),302,86,240,240);
        Button(hero.transform,"BeginAdventure","탐험 떠나기  →",0,352,868,86,Ink,LearningActionType.ExplorationContinueOrStart);
        Text(content,"Section","나의 플레이리스트",0,868,960,52,30,Ink);
        var study=Box(content,"StudyCard",-246,949,468,220,Color.white);Pic(study.transform,"Book",Icon("Book_Blue"),-151,34,90,90);
        Text(study.transform,"Title","문장 연습",47,32,270,64,35,Ink);Text(study.transform,"Detail","차근차근, 한 단계씩",47,101,270,44,24,Muted);
        Button(study.transform,"Study","학습하기",0,153,404,52,Mint,LearningActionType.TabLearning);
        var battle=Box(content,"BattleCard",246,949,468,220,Color.white);Pic(battle.transform,"Sword",Icon("Equipment_Sword"),-151,34,90,90);
        Text(battle.transform,"Title","카드 대전",47,32,270,64,35,Ink);Text(battle.transform,"Detail","",47,101,270,44,24,Muted);
        Button(battle.transform,"Battle","도전하기",0,153,404,52,C("F8E4D5"),LearningActionType.TabBattle);
        Button(content,"Attendance","출석 선물",-328,1220,304,88,Color.white,LearningActionType.OpenAttendance);
        Button(content,"Store","보급 상점",0,1220,304,88,Color.white,LearningActionType.OpenIapShop);
        Button(content,"Settings","설정",328,1220,304,88,Color.white,LearningActionType.OpenSettings);
        var explore=Find(panels,"ExplorePanel") as RectTransform;
        if(explore!=null) BuildExploreTab(explore);
        FixTabs(canvas.transform);
        var profile=Find(canvas.transform,"Profile") as RectTransform;if(profile!=null)Place(profile,-397,100,150,150);
        var top=canvas.transform.Find("Top\\") as RectTransform;if(top!=null)Place(top,227,130,493,78);
        EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);
        Debug.Log("[VisualRemaster] Lobby authored.");
    }
    static void BuildExploreTab(RectTransform panel)
    {
        HideChildren(panel);Fill(panel);Remove(panel,"RemasterExplore");var p=R(panel,"RemasterExplore",0,0,980,1360);
        Text(p,"Eyebrow","EXPEDITION / 모험의 기록",0,0,960,44,24,Teal);
        Text(p,"Title","다음 장을 펼쳐볼까요?",0,80,960,92,55,Ink);
        var card=Box(p,"MapCard",0,236,960,620,Mint);
        Pic(card.transform,"World",Icon("Globe"),0,65,300,300);
        var progress=Text(card.transform,"RunProgress","",0,395,840,60,32,Ink,TextAlignmentOptions.Center);
        card.gameObject.AddComponent<LearningRemasterMotion>().journeyText=progress;
        Text(card.transform,"Caption","",0,477,830,90,27,Teal,TextAlignmentOptions.Center);
        Text(p,"Route","01  문장 조합    /    02  보스 도전    /    03  상점 정비",0,923,960,80,28,Ink,TextAlignmentOptions.Center);
        Button(p,"ContinueAdventure","여정 이어가기  →",0,1070,960,108,Ink,LearningActionType.ExplorationContinueOrStart);
        Button(p,"NewAdventure","새로운 탐험 시작",0,1210,960,86,Mint,LearningActionType.ExplorationAbandonAndEnter);
        p.gameObject.AddComponent<LearningRemasterMotion>().entrance=true;
    }
    static void FixTabs(Transform canvas)
    {
        var tabs=Find(canvas,"Tab") as RectTransform;if(tabs==null)return;
        tabs.anchorMin=new Vector2(0,0);tabs.anchorMax=new Vector2(1,0);tabs.pivot=new Vector2(.5f,0);tabs.anchoredPosition=Vector2.zero;tabs.sizeDelta=new Vector2(0,180);
        var tabTypes=new[]{LearningLobbyTabType.Learning,LearningLobbyTabType.Exploration,LearningLobbyTabType.Home,LearningLobbyTabType.Battle,LearningLobbyTabType.Profile};
        var labels=new[]{"학습","탐험","홈","대전","내 기록"};var icons=new[]{"Book_Blue","Bag_1","Castle","Equipment_Sword","Leaderboard"};
        foreach(var line in tabs.GetComponentsInChildren<Transform>(true).Where(t=>t.name.StartsWith("Line")).ToArray())line.gameObject.SetActive(false);
        for(int k=0;k<5;k++)
        {
            var tab=tabs.GetComponentsInChildren<LearningLobbyTabButton>(true).FirstOrDefault(t=>t.TabType==tabTypes[k]);if(tab==null)continue;
            var rt=(RectTransform)tab.transform;Place(rt,(k-2)*208,18,184,136);
            foreach(var f in tab.GetComponents<LearningPressableButtonFeedback>())Object.DestroyImmediate(f);
            foreach(var f in tab.GetComponents<LearningActionButton>())Object.DestroyImmediate(f);
            var graphic=tab.GetComponent<Image>();if(graphic!=null){graphic.sprite=round;graphic.type=Image.Type.Sliced;graphic.color=Color.clear;graphic.raycastTarget=true;}
            HideChildren(tab.transform);Remove(tab.transform,"NavIcon");Remove(tab.transform,"NavLabel");
            var icon=Pic(tab.transform,"NavIcon",Icon(icons[k]),0,12,62,62);
            var label=Text(tab.transform,"NavLabel",labels[k],0,86,180,38,25,Ink,TextAlignmentOptions.Center);
            Set(tab,"iconRoot",icon.rectTransform);var so=new SerializedObject(tab);var arr=so.FindProperty("colorTargets");arr.arraySize=1;arr.GetArrayElementAtIndex(0).objectReferenceValue=label;so.FindProperty("selectedColor").colorValue=Teal;so.FindProperty("unselectedColor").colorValue=Muted;so.ApplyModifiedPropertiesWithoutUndo();
        }
        var focus=Find(tabs,"TabFocus") as RectTransform;if(focus!=null){Place(focus,0,3,90,6);var i=focus.GetComponent<Image>();if(i!=null)i.color=Teal;}
    }
    static void Dress(Transform root)
    {
        foreach(var image in root.GetComponentsInChildren<Image>(true))
        {
            if(image.sprite==null&&image.color.a>.85f&&image.rectTransform.rect.width>500)image.color=Paper;
            if(image.GetComponent<Button>()!=null&&image.sprite!=null&&image.name.IndexOf("Button",StringComparison.OrdinalIgnoreCase)>=0)
            {image.color=Mint;}
        }
        foreach(var text in root.GetComponentsInChildren<TMP_Text>(true))
        { if(text.color.r>.25f&&Mathf.Abs(text.color.r-text.color.g)<.12f&&Mathf.Abs(text.color.g-text.color.b)<.12f)text.color=Ink; }
    }

    [MenuItem("Tools/Learning/Visual Remaster/3. Dress Exploration")]
    public static void Exploration()
    {
        Init();var scene=EditorSceneManager.OpenScene("Assets/01.Scene/4.ExplorationScreen.unity");
        var view=Object.FindFirstObjectByType<LearningExplorationScreenView>(FindObjectsInactive.Include);var root=view.transform;
        var canvas=view.GetComponentInParent<Canvas>();
        Remove(canvas.transform,"RemasterBackdrop");var back=Box(canvas.transform,"RemasterBackdrop",0,0,1080,1920,Paper);Fill(back.rectTransform);back.sprite=null;back.transform.SetAsFirstSibling();
        var old=canvas.transform.Find("rt");if(old!=null)old.gameObject.SetActive(false);
        var boss=Find(root,"BossSprite") as RectTransform;if(boss!=null){boss.localScale=Vector3.one*.66f;boss.anchoredPosition=new Vector2(0,410);}
        var frame=canvas.transform.Find("ExplorationSceneUI/TableFrame03_WhiteCustom");
        if(frame!=null)
        {
            foreach(var i in frame.GetComponents<Image>())i.color=Color.white;
            var hand=frame.Find("HandRoot")?.GetComponent<Image>();if(hand!=null)hand.color=C("E8EDE7");
            Remove(frame,"RemasterInstruction");
            foreach(var n in new[]{"Draw","Submit","DrawPileButton","DiscardPileButton"})
            {var t=Find(frame,n);if(t==null)continue;var i=t.GetComponent<Image>();if(i!=null)i.color=n=="Submit"?Peach:n=="Draw"?Teal:Ink;}
        }
        var lobby=Find(root,"LobbyButton")?.GetComponent<Image>();if(lobby!=null)lobby.color=Ink;
        Remove(root,"RemasterChapter");Text(root,"RemasterChapter","E X P E D I T I O N",0,182,800,40,23,Teal,TextAlignmentOptions.Center);
        // Replace the old sprite pop with a real Cartoon FX particle prefab rendered by UIParticle.
        foreach(var vfx in root.GetComponentsInChildren<LearningExplorationHitVfx>(true)) {Set(vfx,"hitEffectPrefab",burst);var so=new SerializedObject(vfx);so.FindProperty("normalScale").floatValue=1;so.FindProperty("clearScale").floatValue=1.6f;so.FindProperty("lifetime").floatValue=.8f;so.ApplyModifiedPropertiesWithoutUndo();}
        // Serialized references guarantee the remastered panel is used in editor and player alike.
        foreach(var shop in scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<LearningExplorationShopUI>(true)))Set(shop,"shopPanelPrefab",AssetDatabase.LoadAssetAtPath<GameObject>(LearningUiSkin.ShopPanelPrefabPath));
        EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);Debug.Log("[VisualRemaster] Exploration authored.");
    }
    static RectTransform TabPage(Transform canvas,string field,string title,string subtitle,string iconName)
    {
        var controller=Object.FindFirstObjectByType<LearningLobbyTabController>();var so=new SerializedObject(controller);
        var panel=so.FindProperty(field).objectReferenceValue as RectTransform;if(panel==null)return null;
        HideChildren(panel);Fill(panel);Remove(panel,"RemasterContent");var p=R(panel,"RemasterContent",0,0,980,1360);
        Text(p,"PageTitle",title,0,40,960,98,56,Ink);Text(p,"PageSubtitle",subtitle,0,153,960,76,28,Muted);
        var art=Box(p,"Feature",0,270,960,320,Mint);Pic(art.transform,"FeatureIcon",Icon(iconName),0,35,240,240);
        p.gameObject.AddComponent<LearningRemasterMotion>().entrance=true;return p;
    }
    static Slider SliderControl(Transform p,string name,string label,float y,float min,float max,float value,UnityEngine.Events.UnityAction<float> changed)
    {
        Text(p,name+"Label",label,0,y,800,52,30,Ink);
        var bg=Box(p,name,0,y+76,800,26,C("E1E5DF"));bg.raycastTarget=true;var slider=bg.gameObject.AddComponent<Slider>();
        var fill=Box(bg.transform,"Fill",0,0,800,26,Teal);Fill(fill.rectTransform);
        var handle=Box(bg.transform,"Handle",0,-10,48,48,Peach);handle.raycastTarget=true;
        slider.fillRect=fill.rectTransform;slider.handleRect=handle.rectTransform;slider.targetGraphic=handle;
        slider.minValue=min;slider.maxValue=max;slider.value=value;
        var readout=Text(p,name+"Value","",310,y,180,52,28,Teal,TextAlignmentOptions.MidlineRight);
        var binding=slider.gameObject.AddComponent<LearningRemasterSliderValue>();binding.valueText=readout;binding.percentage=max==1;
        UnityEditor.Events.UnityEventTools.AddPersistentListener(slider.onValueChanged,changed);return slider;
    }
    static LearningPopupPanel Popup(Transform canvas,string name,string title,LearningActionType close,out RectTransform body)
    {
        var root=R(canvas,name,0,0,1080,1920);Fill(root);root.gameObject.AddComponent<CanvasGroup>();
        var veil=root.gameObject.AddComponent<Image>();veil.color=new Color(.08f,.15f,.18f,.72f);veil.raycastTarget=true;
        var sheet=Box(root,"Sheet",0,320,980,1260,Paper);sheet.raycastTarget=true;body=sheet.rectTransform;
        Text(body,"Title",title,-60,52,720,90,48,Ink);Button(body,"Close","×",396,50,88,88,Mint,close);
        var popup=root.gameObject.AddComponent<LearningPopupPanel>();Set(popup,"canvasGroup",root.GetComponent<CanvasGroup>());Set(popup,"panel",body);return popup;
    }
    [MenuItem("Tools/Learning/Visual Remaster/4. Complete Lobby Pages")]
    public static void CompleteLobby()
    {
        Init();var scene=EditorSceneManager.OpenScene("Assets/01.Scene/2.LobbyScreen.unity");var canvas=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Canvas>(true)).First();
        var p=TabPage(canvas.transform,"learningPanel","오늘은 무엇을 배울까요?","카드를 통해 익히는 작고 확실한 성취","Book_Blue");
        var study=p.parent.GetComponent<LearningStudyTabSettings>()??p.parent.gameObject.AddComponent<LearningStudyTabSettings>();
        Button(p,"Shape","도형",-328,660,304,98,Mint,LearningActionType.SetStudyShape);
        Button(p,"Number","숫자",0,660,304,98,Mint,LearningActionType.SetStudyNumber);
        Button(p,"Grammar","품사",328,660,304,98,Mint,LearningActionType.SetStudyPartOfSpeech);
        var status=Text(p,"Status","문제 유형을 선택하세요",0,801,960,70,28,Teal,TextAlignmentOptions.Center);Set(study,"statusText",status);
        var studySo=new SerializedObject(study);studySo.FindProperty("stage").intValue=LearningPlayerProfile.PracticeStage;studySo.ApplyModifiedPropertiesWithoutUndo();
        var stages=SliderControl(p,"Stage","학습 단계",938,1,LearningPlayerProfile.MaxStage,LearningPlayerProfile.PracticeStage,study.SetStage);stages.wholeNumbers=true;
        var start=Button(p,"StartStudy","학습 시작",0,1170,960,108,Ink,LearningActionType.StartStudyFromSettings);Set(study,"quickStartLabel",start.transform.Find("Label").GetComponent<TMP_Text>());
        p=TabPage(canvas.transform,"battlePanel","당신의 조합을 보여주세요","한 수 앞선 문장으로 도전하는 카드 대전","Equipment_Sword");
        var battle=p.parent.GetComponent<LearningBattleTabBridge>()??p.parent.gameObject.AddComponent<LearningBattleTabBridge>();
        Button(p,"FillBlank","빈칸 맞추기",-246,660,468,98,Mint,LearningActionType.BattleSetFillBlankMode);
        Button(p,"Sentence","문장 만들기",246,660,468,98,Mint,LearningActionType.BattleSetSentenceBuildMode);
        Set(battle,"statusText",Text(p,"Status","대전 준비",0,801,960,80,26,Teal,TextAlignmentOptions.Center));
        var diff=SliderControl(p,"Difficulty","대전 난이도",938,1,LearningPlayerProfile.MaxStage,LearningPlayerProfile.BattleDifficulty,battle.SetDifficulty);diff.wholeNumbers=true;
        Button(p,"StartBattle","AI 대전 시작",0,1170,960,108,Ink,LearningActionType.BattleQuickAI);
        p=TabPage(canvas.transform,"profilePanel","차곡차곡 쌓인 나의 기록","오늘의 한 걸음도 모험의 일부니까요","Leaderboard");
        var profile=p.parent.GetComponent<LearningProfileTabBridge>()??p.parent.gameObject.AddComponent<LearningProfileTabBridge>();
        Set(profile,"progressText",Text(p,"Progress","",0,650,880,220,38,Ink));
        Set(profile,"loginStatusText",Text(p,"LoginStatus","",0,894,880,45,26,Teal));
        Set(profile,"playerIdText",Text(p,"PlayerId","",0,947,880,50,22,Muted));
        Button(p,"Save","클라우드 저장",-246,1040,468,86,Mint,LearningActionType.CloudSave);
        Button(p,"Load","기록 불러오기",246,1040,468,86,Mint,LearningActionType.CloudLoad);
        Button(p,"Account","Google 계정 연결",0,1160,960,88,Ink,LearningActionType.LinkGoogle);
        Set(profile,"cloudStatusText",Text(p,"CloudStatus","",0,1264,960,70,24,Muted,TextAlignmentOptions.Center));
        Remove(canvas.transform,"RemasterPopups");var popupRoot=R(canvas.transform,"RemasterPopups",0,0,1080,1920);Fill(popupRoot);
        var bridge=Object.FindFirstObjectByType<LearningLobbyPopupBridge>()??popupRoot.gameObject.AddComponent<LearningLobbyPopupBridge>();
        RectTransform body;
        var popup=Popup(popupRoot,"Settings","나에게 맞게",LearningActionType.CloseSettings,out body);
        var settings=body.gameObject.AddComponent<LearningSettingsView>();
        Set(settings,"masterSlider",SliderControl(body,"Master","전체 음량",225,0,1,LearningSettingsData.MasterVolume,settings.SetMasterVolume));
        Set(settings,"bgmSlider",SliderControl(body,"Music","배경 음악",405,0,1,LearningSettingsData.BgmVolume,settings.SetBgmVolume));
        Set(settings,"sfxSlider",SliderControl(body,"Sfx","효과음",585,0,1,LearningSettingsData.SfxVolume,settings.SetSfxVolume));
        Set(settings,"uuidText",Text(body,"Uuid","",0,845,800,88,22,Muted,TextAlignmentOptions.Center));
        Button(body,"Copy","내 ID 복사",0,970,800,88,Mint,LearningActionType.CopyUuid);Set(bridge,"settingsPopup",popup);popup.gameObject.SetActive(false);
        popup=Popup(popupRoot,"Attendance","오늘도 반가워요",LearningActionType.CloseAttendance,out body);
        Pic(body,"Gift",Icon("Chest_Brown"),0,225,260,260);
        var attendance=body.gameObject.AddComponent<LearningAttendanceView>();Set(attendance,"streakText",Text(body,"Streak","",0,545,850,90,43,Ink,TextAlignmentOptions.Center));
        Set(attendance,"statusText",Text(body,"AttendanceStatus","",0,700,850,120,29,Muted,TextAlignmentOptions.Center));
        Set(attendance,"claimButton",Button(body,"Claim","오늘 출석하기",0,970,800,100,Ink,LearningActionType.ClaimAttendance));Set(bridge,"attendancePopup",popup);popup.gameObject.SetActive(false);
        popup=Popup(popupRoot,"Supplies","모험가의 보급소",LearningActionType.CloseIapShop,out body);
        Pic(body,"Supply",Icon("Bag_1"),0,210,230,230);
        Text(body,"SupplyNote","여정을 더 오래, 더 편안하게",0,475,850,70,30,Muted,TextAlignmentOptions.Center);
        Button(body,"StaminaPack","행동력 충전",0,615,820,100,Mint,LearningActionType.IapBuyStaminaPack);
        Button(body,"AdRemoval","광고 제거",0,755,820,100,Mint,LearningActionType.IapBuyAdRemoval);
        Button(body,"Restore","구매 내역 복원",0,895,820,88,C("E8E5DE"),LearningActionType.IapRestorePurchases);
        var iap=Object.FindFirstObjectByType<LearningIapShopBridge>()??popupRoot.gameObject.AddComponent<LearningIapShopBridge>();
        Set(iap,"statusText",Text(body,"StoreStatus","상품 정보는 연결된 스토어에서 확인할 수 있어요.",0,1030,850,130,24,Muted,TextAlignmentOptions.Center));Set(bridge,"iapShopPopup",popup);popup.gameObject.SetActive(false);
        EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);Debug.Log("[VisualRemaster] All lobby pages and popups wired.");
    }

    [MenuItem("Tools/Learning/Visual Remaster/5. Polish Card Assets")]
    public static void Cards()
    {
        Init();
        foreach(var path in new[]{LearningUiSkin.PosCardPrefabPath,"Assets/Resources/Learning/Prefabs/PosCard.prefab"})
        {
            if(!File.Exists(path))continue;
            var root=PrefabUtility.LoadPrefabContents(path);
            foreach(var image in root.GetComponentsInChildren<Image>(true))
            {
                if(image.name.StartsWith("Button01")) {image.sprite=round;image.type=Image.Type.Sliced;image.color=Ink;}
            }
            foreach(var t in root.GetComponentsInChildren<TMP_Text>(true))
            {if(t.transform.parent.name.StartsWith("Button01")){t.color=Color.white;t.font=LearningFontProvider.DefaultFont;}}
            foreach(var rt in root.GetComponentsInChildren<RectTransform>(true))
                if(rt.name=="PlusText"||rt.name=="MultiflyText"||rt.name=="Temp")rt.gameObject.SetActive(false);
            PrefabUtility.SaveAsPrefabAsset(root,path);PrefabUtility.UnloadPrefabContents(root);
        }
        AssetDatabase.SaveAssets();
    }

    [MenuItem("Tools/Learning/Visual Remaster/6. Dress Practice And Battle")]
    public static void Rounds()
    {
        Init();
        foreach(var filename in new[]{"3.PracticeScreen","5.BattleScreen"})
        {
            var scene=EditorSceneManager.OpenScene("Assets/01.Scene/"+filename+".unity");
            var canvas=scene.GetRootGameObjects().SelectMany(g=>g.GetComponentsInChildren<Canvas>(true)).First();var root=canvas.transform;
            var bg=root.Find("Background").GetComponent<Image>();bg.sprite=null;bg.color=Paper;
            foreach(var b in root.GetComponentsInChildren<Button>(true))
            {
                var i=b.GetComponent<Image>();if(i!=null){i.sprite=round;i.type=Image.Type.Sliced;i.color=b.name=="SubmitButton"?Ink:Mint;}
                foreach(var t in b.GetComponentsInChildren<TMP_Text>(true))t.color=b.name=="SubmitButton"?Color.white:Ink;
                if(b.GetComponent<LearningRemasterMotion>()==null)b.gameObject.AddComponent<LearningRemasterMotion>().burstPrefab=burst;
            }
            Place((RectTransform)root.Find("BackLobbyButton"),-390,64,180,76);
            var title=root.Find("TitleText").GetComponent<TMP_Text>();Place(title.rectTransform,0,182,960,124);title.fontSize=38;title.enableAutoSizing=true;title.fontSizeMin=28;title.fontSizeMax=38;title.color=Ink;
            var result=root.Find("ResultText").GetComponent<TMP_Text>();Place(result.rectTransform,0,1510,940,130);result.color=Teal;
            Remove(root,"RemasterRoundLabels");var labels=R(root,"RemasterRoundLabels",0,0,1080,1920);Fill(labels);labels.SetSiblingIndex(1);
            Text(labels,"Eyebrow",filename.StartsWith("3")?"PRACTICE":"CARD BATTLE",180,78,580,50,24,Teal);
            Text(labels,"SentenceHeading","01  /  문장의 빈칸을 채워주세요",0,350,940,60,30,Ink);
            Box(labels,"SentenceSurface",0,430,980,466,Color.white);
            Text(labels,"HandHeading","02  /  알맞은 카드를 선택하세요",0,950,940,60,30,Ink);
            Box(labels,"HandSurface",0,1030,980,450,Mint);
            var sentence=(RectTransform)root.Find("SentenceRoot");
            foreach(var l in sentence.GetComponents<LayoutGroup>())Object.DestroyImmediate(l);
            foreach(var f in sentence.GetComponents<ContentSizeFitter>())Object.DestroyImmediate(f);
            Place(sentence,0,474,904,400);
            var grid=sentence.gameObject.AddComponent<GridLayoutGroup>();grid.cellSize=new Vector2(210,100);grid.spacing=new Vector2(20,22);grid.constraint=GridLayoutGroup.Constraint.FixedColumnCount;grid.constraintCount=4;grid.childAlignment=TextAnchor.UpperLeft;
            var cards=(RectTransform)root.Find("CardRoot");Place(cards,0,1080,904,380);
            var cg=cards.GetComponent<GridLayoutGroup>();if(cg!=null){cg.cellSize=new Vector2(210,110);cg.spacing=new Vector2(20,28);cg.constraint=GridLayoutGroup.Constraint.FixedColumnCount;cg.constraintCount=4;}
            Place((RectTransform)root.Find("SubmitButton"),-246,1720,468,106);Place((RectTransform)root.Find("RestartButton"),246,1720,468,106);
            EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);
        }
        foreach(var path in new[]{"Assets/05.Prefabs/WordBlock.prefab","Assets/05.Prefabs/BlankBlock.prefab"})
        {
            var root=PrefabUtility.LoadPrefabContents(path);
            foreach(var i in root.GetComponentsInChildren<Image>(true))if(i.transform==root.transform||i.name.StartsWith("Button01")){i.sprite=round;i.type=Image.Type.Sliced;i.color=Mint;}
            foreach(var t in root.GetComponentsInChildren<TMP_Text>(true)){t.color=Ink;t.font=LearningFontProvider.DefaultFont;t.fontSize=32;t.enableAutoSizing=true;t.fontSizeMin=22;t.fontSizeMax=32;}
            var blank=root.GetComponent<LearningBlankSlotView>();if(blank!=null){ColorField(blank,"normalColor",Mint);ColorField(blank,"selectedColor",Peach);}
            PrefabUtility.SaveAsPrefabAsset(root,path);PrefabUtility.UnloadPrefabContents(root);
        }
        AssetDatabase.SaveAssets();
    }

}
#endif
