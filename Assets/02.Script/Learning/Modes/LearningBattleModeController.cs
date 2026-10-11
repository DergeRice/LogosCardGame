using UnityEngine;

public class LearningBattleModeController : MonoBehaviour
{
    [SerializeField] private LearningBattleSimulator battleSimulator;
    [SerializeField] private LearningItemInventory inventory;
    [SerializeField] private bool startOnStart = true;
    private bool hasStartedBattle;

    private void Awake()
    {
        if (battleSimulator == null) battleSimulator = GetComponent<LearningBattleSimulator>();
        if (inventory == null) inventory = GetComponent<LearningItemInventory>();
    }

    private void Start()
    {
        if (startOnStart)
        {
            StartBattle();
        }
    }

    public void StartBattle()
    {
        if (hasStartedBattle) return;
        hasStartedBattle = true;
        int difficulty = LearningPlayerProfile.BattleDifficulty;
        battleSimulator.StartBattle(difficulty);
    }

    public bool AddBattleItem(LearningItemDefinition item)
    {
        return item != null && item.CanUseIn(LearningModeType.Battle) && inventory != null && inventory.TryAdd(item);
    }
}
