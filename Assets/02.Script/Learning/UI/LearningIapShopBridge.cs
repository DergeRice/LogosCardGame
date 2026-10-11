using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.Purchasing;

/// <summary>
/// Minimal Unity IAP v5 bridge for the lobby shop.
/// Receipt and server validation are deliberately deferred to release hardening.
/// </summary>
public class LearningIapShopBridge : MonoBehaviour
{
    private const string AdRemovalEntitlementKey = "learning.iap.adRemoval";
    private const string GrantedTransactionPrefix = "learning.iap.granted.";

    [SerializeField] private TMP_Text statusText;
    [Header("Product catalog")]
    [SerializeField] private LearningIapSettings settings;
    [SerializeField] private bool initializeOnStart = true;

    private StoreController store;
    private bool isInitializing;
    private bool isReady;
    private bool isPurchaseInProgress;

    public bool IsReady => isReady;
    public bool IsPurchaseInProgress => isPurchaseInProgress;
    public static bool HasAdRemoval => PlayerPrefs.GetInt(AdRemovalEntitlementKey, 0) == 1;
    private LearningIapSettings Settings => settings != null ? settings : Resources.Load<LearningIapSettings>("LearningIapSettings");

    private void Start()
    {
        if (initializeOnStart) InitializeIap();
    }

    private void OnDestroy()
    {
        UnsubscribeStoreEvents();
    }

    public void InitializeIap()
    {
        if (isReady || isInitializing) return;
        if (!HasValidCatalog())
        {
            SetStatus("IAP 상품 ID를 먼저 설정해주세요.");
            return;
        }

        InitializeIapAsync();
    }

    public void BuyStaminaPack() => Purchase(Settings != null ? Settings.staminaPack : null);

    public void BuyAdRemoval() => Purchase(Settings != null ? Settings.adRemoval : null);

    public void RestorePurchases()
    {
        if (!EnsureReadyForAction()) return;
        if (isPurchaseInProgress)
        {
            SetStatus("구매 처리 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        isPurchaseInProgress = true;
        SetStatus("구매 내역을 복원하는 중입니다...");
        store.RestoreTransactions((success, error) =>
        {
            isPurchaseInProgress = false;
            SetStatus(success
                ? "구매 내역을 복원했습니다."
                : $"구매 복원에 실패했습니다. {FormatError(error)}");
        });
    }

    private async void InitializeIapAsync()
    {
        isInitializing = true;
        SetStatus("스토어 상품을 불러오는 중입니다...");

        try
        {
            store = UnityIAPServices.StoreController();
            SubscribeStoreEvents();
            await store.Connect();
        }
        catch (Exception exception)
        {
            isInitializing = false;
            isReady = false;
            SetStatus($"스토어 연결에 실패했습니다. {FormatError(exception.Message)}");
            Debug.LogException(exception, this);
        }
    }

    private void SubscribeStoreEvents()
    {
        if (store == null) return;
        store.OnStoreConnected += OnStoreConnected;
        store.OnStoreDisconnected += OnStoreDisconnected;
        store.OnProductsFetched += OnProductsFetched;
        store.OnProductsFetchFailed += OnProductsFetchFailed;
        store.OnPurchasePending += OnPurchasePending;
        store.OnPurchaseConfirmed += OnPurchaseConfirmed;
        store.OnPurchaseFailed += OnPurchaseFailed;
        store.OnPurchaseDeferred += OnPurchaseDeferred;
        store.OnPurchasesFetched += OnPurchasesFetched;
        store.OnPurchasesFetchFailed += OnPurchasesFetchFailed;
    }

    private void UnsubscribeStoreEvents()
    {
        if (store == null) return;
        store.OnStoreConnected -= OnStoreConnected;
        store.OnStoreDisconnected -= OnStoreDisconnected;
        store.OnProductsFetched -= OnProductsFetched;
        store.OnProductsFetchFailed -= OnProductsFetchFailed;
        store.OnPurchasePending -= OnPurchasePending;
        store.OnPurchaseConfirmed -= OnPurchaseConfirmed;
        store.OnPurchaseFailed -= OnPurchaseFailed;
        store.OnPurchaseDeferred -= OnPurchaseDeferred;
        store.OnPurchasesFetched -= OnPurchasesFetched;
        store.OnPurchasesFetchFailed -= OnPurchasesFetchFailed;
    }

    private void OnStoreConnected()
    {
        store.FetchProducts(new List<ProductDefinition>
        {
            new ProductDefinition(Settings.staminaPack.productId, Settings.staminaPack.productType),
            new ProductDefinition(Settings.adRemoval.productId, Settings.adRemoval.productType),
        });
    }

    private void OnStoreDisconnected(StoreConnectionFailureDescription failure)
    {
        isInitializing = false;
        isReady = false;
        isPurchaseInProgress = false;
        SetStatus($"스토어 연결이 끊겼습니다. {FormatError(failure.Message)}");
    }

    private void OnProductsFetched(List<Product> products)
    {
        isInitializing = false;
        isReady = products != null && products.Any(product => product != null && product.availableToPurchase);
        SetStatus(isReady ? "구매할 상품을 불러왔습니다." : "현재 구매 가능한 상품이 없습니다.");
        if (isReady) store.FetchPurchases();
    }

    private void OnProductsFetchFailed(ProductFetchFailed failure)
    {
        isInitializing = false;
        isReady = false;
        SetStatus($"상품을 불러오지 못했습니다. {FormatError(failure.FailureReason.ToString())}");
    }

    private void Purchase(LearningIapProductConfig config)
    {
        if (config == null || string.IsNullOrWhiteSpace(config.productId))
        {
            SetStatus("상품 ID가 설정되지 않았습니다.");
            return;
        }

        if (!EnsureReadyForAction()) return;
        if (isPurchaseInProgress)
        {
            SetStatus("이미 구매 처리 중입니다.");
            return;
        }

        Product product = store.GetProductById(config.productId);
        if (product == null || !product.availableToPurchase)
        {
            SetStatus("이 상품은 현재 스토어에서 구매할 수 없습니다.");
            return;
        }

        isPurchaseInProgress = true;
        SetStatus("스토어 결제를 여는 중입니다...");
        store.PurchaseProduct(product);
    }

    private void OnPurchasePending(PendingOrder order)
    {
        string productId = GetProductId(order);
        if (!GrantOrder(order, productId))
        {
            isPurchaseInProgress = false;
            SetStatus("알 수 없는 상품입니다. 결제를 완료하지 않았습니다.");
            Debug.LogError($"[LearningIapShopBridge] Pending unknown product: {productId}", this);
            return;
        }

        store.ConfirmPurchase(order);
        SetStatus("구매 보상을 지급했습니다.");
    }

    private void OnPurchaseConfirmed(Order order)
    {
        isPurchaseInProgress = false;
        if (order is FailedOrder failed)
        {
            SetStatus($"결제 확인에 실패했습니다. {FormatError(failed.Details)}");
            return;
        }

        SetStatus("구매가 완료되었습니다.");
    }

    private void OnPurchaseFailed(FailedOrder order)
    {
        isPurchaseInProgress = false;
        string message = order.FailureReason == PurchaseFailureReason.UserCancelled
            ? "구매를 취소했습니다."
            : $"구매에 실패했습니다. {FormatError(order.Details)}";
        SetStatus(message);
    }

    private void OnPurchaseDeferred(DeferredOrder order)
    {
        isPurchaseInProgress = false;
        SetStatus("구매 승인을 기다리고 있습니다.");
    }

    private void OnPurchasesFetched(Orders orders)
    {
        // Confirmed consumables must not be granted again on app launch. Only durable
        // entitlements are restored here; incomplete consumable transactions arrive as pending.
        if (orders?.ConfirmedOrders == null) return;
        for (int i = 0; i < orders.ConfirmedOrders.Count; i++)
        {
            if (Settings == null || GetProductId(orders.ConfirmedOrders[i]) != Settings.adRemoval.productId) continue;
            PlayerPrefs.SetInt(AdRemovalEntitlementKey, 1);
            PlayerPrefs.Save();
        }
    }

    private void OnPurchasesFetchFailed(PurchasesFetchFailureDescription failure)
    {
        Debug.LogWarning($"[LearningIapShopBridge] Existing purchases could not be fetched: {failure?.FailureReason}", this);
    }

    private bool GrantOrder(Order order, string productId)
    {
        if (string.IsNullOrWhiteSpace(productId)) return false;

        string transactionId = order?.Info?.TransactionID;
        if (!string.IsNullOrWhiteSpace(transactionId) && PlayerPrefs.GetInt(GrantedTransactionPrefix + transactionId, 0) == 1)
        {
            return IsKnownProduct(productId);
        }

        if (Settings == null) return false;
        if (productId == Settings.staminaPack.productId)
        {
            StaminaManager.Add(Mathf.Max(1, Settings.staminaPack.staminaAmount));
        }
        else if (productId == Settings.adRemoval.productId)
        {
            PlayerPrefs.SetInt(AdRemovalEntitlementKey, 1);
        }
        else
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(transactionId))
        {
            PlayerPrefs.SetInt(GrantedTransactionPrefix + transactionId, 1);
        }
        PlayerPrefs.Save();
        LearningCloudService.Instance.SaveLocalFireAndForget();
        return true;
    }

    private bool EnsureReadyForAction()
    {
        if (isReady && store != null) return true;
        SetStatus(isInitializing ? "스토어 연결 중입니다." : "스토어가 준비되지 않았습니다. 다시 시도해주세요.");
        if (!isInitializing) InitializeIap();
        return false;
    }

    private bool HasValidCatalog()
    {
        return Settings != null && Settings.staminaPack != null && Settings.adRemoval != null &&
               !string.IsNullOrWhiteSpace(Settings.staminaPack.productId) &&
               !string.IsNullOrWhiteSpace(Settings.adRemoval.productId) &&
               Settings.staminaPack.productId != Settings.adRemoval.productId;
    }

    private bool IsKnownProduct(string productId)
    {
        return Settings != null && (productId == Settings.staminaPack.productId || productId == Settings.adRemoval.productId);
    }

    private static string GetProductId(Order order)
    {
        return order?.CartOrdered?.Items()?.FirstOrDefault()?.Product?.definition?.id ?? string.Empty;
    }

    private static string FormatError(string message)
    {
        return string.IsNullOrWhiteSpace(message) ? "잠시 후 다시 시도해주세요." : message;
    }

    private void SetStatus(string message)
    {
        if (statusText != null) statusText.text = message;
        Debug.Log($"[LearningIapShopBridge] {message}", this);
    }
}
