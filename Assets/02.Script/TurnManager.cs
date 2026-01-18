using UnityEngine;
using Fusion;
using System.Collections.Generic;
using System.Linq;
using Fusion.Sockets;
using System;
using UnityEngine.UI;
using TCG_CardMaker;
using Photon.Realtime;

public class TurnManager : NetworkBehaviour
{
    [Networked] public int IndexOfPlayerTurn { get; set; }

    public List<PlayerRef> players = new List<PlayerRef>();

    public bool isMyTurn;

    public NetworkObject myOb;

    public DeckManager deckManager;
    public List<DeckManager> deckManagers { get; set; }

    public GameObject myTurnObject;


    [Networked, Capacity(58)] public NetworkArray<int> networkedShuffledIndexes => default;
    public List<int> shuffledIndexes = new List<int>();

    [Networked] public int currentDeckIndex { get; set; }

    public PlayerRef op;


    public override void Spawned()
    {
        GamePlayerSpawner.instance.allPlayerSpawnedAction += ShuffleDeck;
        GamePlayerSpawner.instance.allPlayerSpawnedAction += TurnOrderMaker;
        // GamePlayerSpawner.instance.allPlayerSpawnedAction += SetOp;

        GamePlayManager.instance.gameUIManager.summitButton.onClick.AddListener(PassMyTurn);
        // if (Runner.IsSharedModeMasterClient) seti = true;

        FindAnyObjectByType<GameUIManager>().TurnManagerInit(this);

    }

    public void FindDeckManager()
    {
        deckManagers = FindObjectsByType<DeckManager>(FindObjectsSortMode.None).ToList();

        // Order by playerRef.RawEncoded ensures consistent order across clients
        deckManagers = deckManagers.OrderBy(dm => dm.playerRef.RawEncoded).ToList();

        foreach (var item in deckManagers)
        {
            item.turnManager = this;
        }
    }

    public DeckManager FindDeckManagerByPlayerRef(PlayerRef player)
    {
        return deckManagers.FirstOrDefault(d => d.playerRef == player);
    }



    public void TurnOrderMaker()
    {
        // Debug.Log($"order making...");

        deckManagers = FindObjectsByType<DeckManager>(FindObjectsSortMode.None).ToList();
        deckManagers = deckManagers.OrderBy(dm => dm.playerRef.RawEncoded).ToList();

        foreach (var item in deckManagers)
        {
            item.ConnectTurnManager();
        }

        players = deckManagers.Select(dm => dm.playerRef).ToList();

        if (Runner.IsSharedModeMasterClient && players.Count > 0)
        {
            var firstPlayer = players[0];
            RPC_ReceiveTurn(firstPlayer);
        }
    }


    public void PassMyTurn()
    {
        if (!isMyTurn) return;

        var currentIndex = deckManagers.FindIndex(x => x.playerRef == Runner.LocalPlayer);
        int nextIndex = 1;
        if (deckManagers.Count > 0) nextIndex = (currentIndex + 1) % deckManagers.Count;
        var next = deckManagers[nextIndex].playerRef;


        GamePlayManager.instance.gameUIManager.localUIManager.EndMyTurn();

        RPC_ReceiveTurn(next);
        isMyTurn = false;
        if (myTurnObject == null) myTurnObject = GamePlayManager.instance.gameUIManager.localUIManager.myTurnObject;

        myTurnObject.SetActive(false);
        GamePlayManager.instance.gameUIManager.localUIManager.submitBlock.SetActive(false);
    }

    public string GetPlayerNameByPlayerRef(PlayerRef player)
    {
        var match = deckManagers.Find(x => x.playerRef == player);
        return match != null ? match.PlayerName.ToString() : "Unknown";
    }


    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_ReceiveTurn(PlayerRef target)
    {
        // Debug.Log($"📥 턴 받음: {target}, 나는: {Runner.LocalPlayer}");

        // UI 처리
        isMyTurn = (Runner.LocalPlayer == target);
        if (myTurnObject == null) myTurnObject = GamePlayManager.instance.gameUIManager.localUIManager.myTurnObject;
        myTurnObject.SetActive(isMyTurn);

        FindDeckManager();
        foreach (var dm in deckManagers)
        {
            dm.SetMyTurn(dm.playerRef == target);
        }

        // 마스터만 카드 지급
        if (Runner.IsSharedModeMasterClient)
        {
            deckManager.GiveOneCardTo(target);
        }

        GamePlayManager.instance.gameUIManager.localUIManager.isMyTurn = this.isMyTurn;


        if (isMyTurn == true) GamePlayManager.instance.gameUIManager.localUIManager.GetMyTurn();
    }
    [UnityEngine.ContextMenu("dd")]
    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_GiveAllSpecial()
    {
        foreach (var player in Runner.ActivePlayers)
            deckManager.GiveAllSpecial(player);
    }


    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_ExchageRequest(PlayerRef sender, PlayerRef target, int requestCardIndex, int sendingCardIndex, string senderName)
    {
        if (target == Runner.LocalPlayer)
        {
            Debug.Log($"RPC 받음: A = {requestCardIndex}, B = {sendingCardIndex}");
            GamePlayManager.instance.gameUIManager.exchangeRecieve.ReceivedRequest(sender, senderName, CardsDB.Instance.Cards[requestCardIndex], CardsDB.Instance.Cards[sendingCardIndex]);
        }
        // 여기에 받은 값 처리 로직 작성
    }


    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_ExchageResult(PlayerRef sender, bool isAccepted)
    {
        if (sender == Runner.LocalPlayer)
        {
            Debug.Log($"교환 결과 받음");

            GamePlayManager.instance.gameUIManager.exchangeRecieve.ReceivedResult(isAccepted);
        }

        // 여기에 받은 값 처리 로직 작성
    }

    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_RobExcute(PlayerRef sender, PlayerRef target, int robIndex, string senderName)
    {
        Debug.Log("GORob");
        if (target == Runner.LocalPlayer)
        {
            Debug.Log($"RPC 받음: A = ");
            GamePlayManager.instance.gameUIManager.robReceive.ReceivedRob(sender, senderName, CardsDB.Instance.Cards[robIndex]);
        }
        // 여기에 받은 값 처리 로직 작성
    }

    [Rpc(RpcSources.All, RpcTargets.All)]
    public void RPC_GetStar(PlayerRef target)
    {
        Debug.Log("GetDamged");

        if (target == Runner.LocalPlayer)
        {
            // Debug.Log($"RPC 받음: A = ");
            GameManager.instance.ToastText("아야");
            Debug.Log("아야");
            
            // GamePlayManager.instance.gameUIManager.robReceive.ReceivedRob(sender, senderName, CardsDB.Instance.Cards[robIndex]);
            GamePlayManager.instance.gameUIManager.profile.GetDamage();
        }
        // 여기에 받은 값 처리 로직 작성
    }


    public void ReShuffleDeck()
    {
        currentDeckIndex = 0;
        shuffledIndexes.Clear();
        ShuffleDeck();
    }

    public void ShuffleDeck()
    {
        if (!Runner.IsSharedModeMasterClient) return;

        List<CardSO> allCards = CardsDB.Instance.Cards;
        for (int i = 0; i < allCards.Count; i++) shuffledIndexes.Add(i);
        ShuffleList(shuffledIndexes);
        if (HasInputAuthority) networkedShuffledIndexes.CopyFrom(shuffledIndexes, 0, shuffledIndexes.Count);
        currentDeckIndex = 0;
    }

    private void ShuffleList<T>(List<T> list)
    {
        int n = list.Count;
        for (int i = 0; i < n - 1; i++)
        {
            int j = UnityEngine.Random.Range(i, n);  // UnityEngine.Random 사용
            T temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
    }

    public PlayerRef GetOp()
    {
        if (Runner == null)
        {
            Debug.LogError("Runner is null — GetOpPlayer() failed.");
            // return default;
        }

        // 전체 플레이어 리스트 가져오기
        var players = Runner.ActivePlayers.ToList();

        // 내 PlayerRef
        var myRef = Runner.LocalPlayer;

        // 나 이외의 첫 번째 플레이어 반환
        var op = players.FirstOrDefault(p => p != myRef);

        if (op == default)
        {
            Debug.LogWarning("상대방 플레이어를 찾지 못했습니다. (플레이어 수가 1명일 수 있음)");
        }

        return op;
    }

}
