using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;

public static class LearningGameSceneBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void InstallForCurrentScene()
    {
        SceneManager.sceneLoaded -= OnSceneLoaded;
        SceneManager.sceneLoaded += OnSceneLoaded;
        Bootstrap(SceneManager.GetActiveScene().name);
    }

    private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        Bootstrap(scene.name);
    }

    private static void Bootstrap(string sceneName)
    {
        if (sceneName == LearningSceneNames.Lobby)
        {
            BootstrapLobby();
        }
        else if (sceneName == LearningSceneNames.Practice)
        {
            BootstrapPractice();
        }
        else if (sceneName == LearningSceneNames.Exploration)
        {
            BootstrapExploration();
        }
        else if (sceneName == LearningSceneNames.Battle)
        {
            BootstrapBattle();
        }
    }

    private static void BootstrapLobby()
    {
        if (!LogosLegacyRoomPrototype.Enabled) return;
        if (Object.FindFirstObjectByType<LogosLegacyLibraryUI>() != null) return;
        new GameObject("LogosLegacyLibraryRuntime").AddComponent<LogosLegacyLibraryUI>();
    }

    private static void BootstrapPractice()
    {
        if (LogosLegacyRoomPrototype.Enabled)
        {
            if (Object.FindFirstObjectByType<LogosLegacyRoomUI>() != null) return;
            LearningPracticePrefabUI existingPrefabUi = Object.FindFirstObjectByType<LearningPracticePrefabUI>();
            if (existingPrefabUi != null) existingPrefabUi.gameObject.SetActive(false);
            LearningPracticeRuntimeUI existingRuntimeUi = Object.FindFirstObjectByType<LearningPracticeRuntimeUI>();
            if (existingRuntimeUi != null) existingRuntimeUi.gameObject.SetActive(false);
            new GameObject("LogosLegacyRoomRuntime").AddComponent<LogosLegacyRoomUI>();
            Debug.Log("[LearningGameSceneBootstrap] Installed Logos room-number Legacy 01 prototype.");
            return;
        }
        if (Object.FindFirstObjectByType<LearningPracticePrefabUI>() != null) return;
        if (Object.FindFirstObjectByType<LearningPracticeRuntimeUI>() != null) return;

        GameObject go = new GameObject("LearningPracticeRuntime");
        go.AddComponent<LearningRoundController>();
        LearningPracticeRuntimeUI ui = go.AddComponent<LearningPracticeRuntimeUI>();
        ui.Initialize(LearningModeType.Practice, LearningPlayerProfile.PracticeStage, autoStart: true);
    }

    private static void BootstrapExploration()
    {
        if (GameObject.Find("LearningExplorationRuntime") != null) return;

        RemoveLegacyExplorationObjects();
        GameObject go = new GameObject("LearningExplorationRuntime");
        go.SetActive(false);

        LearningExplorationSentenceUI sceneUi = Object.FindFirstObjectByType<LearningExplorationSentenceUI>();
        Canvas canvas = sceneUi != null ? sceneUi.GetComponentInParent<Canvas>() : null;
        if (canvas == null) canvas = CreateRuntimeCanvas();
        LearningItemEffectExecutor effectExecutor = go.AddComponent<LearningItemEffectExecutor>();
        LearningItemInventory inventory = go.AddComponent<LearningItemInventory>();
        inventory.SetMaxSlots(LearningExplorationRunState.ItemSlots);
        inventory.LoadExplorationInventory();
        LearningExplorationSentenceController controller = go.AddComponent<LearningExplorationSentenceController>();
        LearningExplorationShopUI sceneShop = Object.FindFirstObjectByType<LearningExplorationShopUI>();
        LearningExplorationShopUI shop = sceneShop != null ? sceneShop : go.AddComponent<LearningExplorationShopUI>();
        LearningExplorationSentenceUI ui = sceneUi != null ? sceneUi : go.AddComponent<LearningExplorationSentenceUI>();
        TMP_FontAsset font = LearningFontProvider.DefaultFont;
        shop.Configure(canvas, inventory, effectExecutor, controller, ui, font);
        ui.Configure(controller, shop, canvas, font);
        LearningDeveloperConsole developerConsole = go.AddComponent<LearningDeveloperConsole>();
        developerConsole.Configure(canvas, controller, inventory, font);
        go.SetActive(true);
        Debug.Log(sceneUi != null
            ? "[LearningGameSceneBootstrap] Installed exploration runtime using scene-bound UI."
            : "[LearningGameSceneBootstrap] Installed sentence-building exploration runtime.");
    }

    private static void BootstrapBattle()
    {
        if (GameObject.Find("LearningBattleRuntime") != null) return;
        RemoveLegacyBattleObjects();

        GameObject go = new GameObject("LearningBattleRuntime");
        if (LearningPlayerProfile.BattleProblemType == LearningBattleProblemType.FillBlank)
        {
            go.AddComponent<LearningRoundController>();
            go.AddComponent<LearningItemInventory>();
            go.AddComponent<LearningBattleSimulator>();
            LearningBattleModeController battle = go.AddComponent<LearningBattleModeController>();
            LearningPracticeRuntimeUI ui = go.AddComponent<LearningPracticeRuntimeUI>();
            ui.Initialize(LearningModeType.Battle, LearningPlayerProfile.BattleDifficulty, autoStart: false);
            battle.StartBattle();
            return;
        }

        go.SetActive(false);
        Canvas canvas = CreateRuntimeCanvas("LearningBattleRuntimeCanvas");
        go.AddComponent<LearningItemEffectExecutor>();
        go.AddComponent<LearningItemInventory>();
        LearningBattleSentenceController sentenceController = go.AddComponent<LearningBattleSentenceController>();
        LearningBattleSentenceUI sentenceUI = go.AddComponent<LearningBattleSentenceUI>();
        sentenceUI.Configure(sentenceController, canvas, LearningFontProvider.DefaultFont);
        go.SetActive(true);
    }

    private static void RemoveLegacyExplorationObjects()
    {
        HashSet<GameObject> removedTargets = new HashSet<GameObject>();

        LearningPracticePrefabUI[] practiceUis = Object.FindObjectsByType<LearningPracticePrefabUI>(FindObjectsSortMode.None);
        for (int i = 0; i < practiceUis.Length; i++)
        {
            RemoveLegacyExplorationComponent(practiceUis[i], removedTargets);
        }

        LearningExplorationController[] oldControllers = Object.FindObjectsByType<LearningExplorationController>(FindObjectsSortMode.None);
        for (int i = 0; i < oldControllers.Length; i++)
        {
            RemoveLegacyExplorationComponent(oldControllers[i], removedTargets);
        }

        LearningRoundController[] oldRoundControllers = Object.FindObjectsByType<LearningRoundController>(FindObjectsSortMode.None);
        for (int i = 0; i < oldRoundControllers.Length; i++)
        {
            if (oldRoundControllers[i] == null) continue;
            GameObject target = oldRoundControllers[i].gameObject;
            if (!ShouldPreserveExplorationSceneObject(target)) continue;

            Object.Destroy(oldRoundControllers[i]);
        }

        Canvas[] canvases = Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None);
        for (int i = 0; i < canvases.Length; i++)
        {
            Canvas canvas = canvases[i];
            if (canvas == null) continue;
            if (!canvas.name.StartsWith("LearningExplorationCanvas")) continue;
            if (ShouldPreserveExplorationSceneObject(canvas.gameObject)) continue;

            canvas.gameObject.SetActive(false);
            Object.Destroy(canvas.gameObject);
        }
    }

    private static void RemoveLegacyExplorationComponent(Component component, HashSet<GameObject> removedTargets)
    {
        if (component == null) return;

        GameObject target = component.gameObject;
        if (target == null) return;

        if (ShouldPreserveExplorationSceneObject(target))
        {
            Object.Destroy(component);
            return;
        }

        if (removedTargets.Contains(target)) return;

        removedTargets.Add(target);
        target.SetActive(false);
        Object.Destroy(target);
    }

    private static bool ShouldPreserveExplorationSceneObject(GameObject target)
    {
        if (target == null) return false;

        return target.GetComponentInChildren<LearningExplorationSentenceUI>(true) != null
            || target.GetComponentInChildren<LearningExplorationScreenView>(true) != null
            || target.GetComponentInChildren<LearningBossView>(true) != null;
    }

    private static void RemoveLegacyBattleObjects()
    {
        LearningPracticePrefabUI[] practiceUis = Object.FindObjectsByType<LearningPracticePrefabUI>(FindObjectsSortMode.None);
        for (int i = 0; i < practiceUis.Length; i++)
        {
            if (practiceUis[i] == null) continue;
            GameObject target = practiceUis[i].gameObject;
            target.SetActive(false);
            Object.Destroy(target);
        }

        Canvas[] canvases = Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None);
        for (int i = 0; i < canvases.Length; i++)
        {
            Canvas canvas = canvases[i];
            if (canvas == null) continue;
            if (!canvas.name.StartsWith("LearningBattleCanvas")) continue;

            canvas.gameObject.SetActive(false);
            Object.Destroy(canvas.gameObject);
        }
    }

    private static Canvas CreateRuntimeCanvas(string canvasName = "LearningExplorationRuntimeCanvas")
    {
        GameObject canvasGo = new GameObject(canvasName);
        Canvas canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        CanvasScaler scaler = canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080f, 1920f);
        scaler.matchWidthOrHeight = 0.5f;
        canvasGo.AddComponent<GraphicRaycaster>();
        return canvas;
    }
}
