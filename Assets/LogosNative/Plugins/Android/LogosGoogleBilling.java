package com.baragames.logos.nativebridge;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.unity3d.player.UnityPlayer;

import org.json.JSONObject;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Android-only purchase bridge for the WebView shell.
 *
 * Unity IAP's Android ProductDetails cache can lose its JNI reference under
 * Unity 6 IL2CPP before launchBillingFlow.  This bridge uses the same Google
 * Play Billing SDK directly, returns a Unity-compatible receipt to the web
 * layer, and consumes the order only after server-side receipt verification.
 */
public final class LogosGoogleBilling implements PurchasesUpdatedListener {
    private static final String TAG = "LogosBilling";
    private static LogosGoogleBilling instance;
    private static BillingClient billingClient;
    private static String unityObject;
    private static String unityMethod;
    private static String pendingProductId;
    private static String pendingAccountHash;
    private static final Map<String, String> purchaseTokens = new HashMap<>();

    private LogosGoogleBilling() { }

    public static void purchase(final String productId, final String accountHash, final String callbackObject, final String callbackMethod) {
        final Activity activity = UnityPlayer.currentActivity;
        if (activity == null) {
            emitFailure(callbackObject, callbackMethod, productId, "현재 화면을 찾지 못했어요.");
            return;
        }
        if (productId == null || !java.util.Arrays.asList("diamonds_100", "diamonds_300", "diamonds_1000", "diamonds_3000").contains(productId)) {
            emitFailure(callbackObject, callbackMethod, productId, "상품 ID가 비어있어요.");
            return;
        }
        if (accountHash == null || !accountHash.matches("[0-9a-f]{64}")) {
            emitFailure(callbackObject, callbackMethod, productId, "로그인 정보를 확인하지 못했어요.");
            return;
        }

        activity.runOnUiThread(() -> startPurchase(activity, productId, accountHash, callbackObject, callbackMethod));
    }

    public static void confirm(final String productId) {
        if (billingClient == null || productId == null) {
            return;
        }
        final String token = purchaseTokens.get(productId);
        if (token == null || token.isEmpty()) {
            Log.w(TAG, "confirm skipped; no purchase token for " + productId);
            return;
        }

        final ConsumeParams params = ConsumeParams.newBuilder().setPurchaseToken(token).build();
        billingClient.consumeAsync(params, (result, ignored) -> {
            Log.i(TAG, "consume result product=" + productId + " code=" + result.getResponseCode() + " message=" + result.getDebugMessage());
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                purchaseTokens.remove(productId);
            }
        });
    }

    private static void startPurchase(final Activity activity, final String productId, final String accountHash, final String callbackObject, final String callbackMethod) {
        if (pendingProductId != null) {
            emitFailure(callbackObject, callbackMethod, productId, "다른 결제가 진행 중이에요.");
            return;
        }

        instance = new LogosGoogleBilling();
        unityObject = callbackObject;
        unityMethod = callbackMethod;
        pendingProductId = productId;
        pendingAccountHash = accountHash;
        billingClient = BillingClient.newBuilder(activity)
            .setListener(instance)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();

        Log.i(TAG, "connecting Google Play Billing for " + productId);
        billingClient.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    failActive("Google Play 연결 실패: " + result.getDebugMessage());
                    return;
                }
                recoverOrLaunch(activity, productId);
            }

            @Override public void onBillingServiceDisconnected() {
                Log.w(TAG, "Google Play Billing disconnected");
            }
        });
    }

    // A purchase is consumed only after the Worker validates its receipt. If
    // validation is temporarily unavailable, recover the already-owned order
    // on the next tap instead of showing ITEM_ALREADY_OWNED and stranding it.
    private static void recoverOrLaunch(final Activity activity, final String productId) {
        final QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                for (Purchase purchase : purchases) {
                    if (purchase.getProducts().contains(productId)
                        && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                        Log.i(TAG, "recovering unconsumed purchase for " + productId);
                        emitPurchasedPurchase(purchase);
                        return;
                    }
                }
            }
            queryAndLaunch(activity, productId);
        });
    }

    private static void queryAndLaunch(final Activity activity, final String productId) {
        final QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        final QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (result, queryResult) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                failActive("상품 정보를 불러오지 못했어요: " + result.getDebugMessage());
                return;
            }
            final List<ProductDetails> details = queryResult.getProductDetailsList();
            if (details == null || details.isEmpty()) {
                failActive("Play 스토어에서 상품을 찾지 못했어요.");
                return;
            }

            final ProductDetails detail = details.get(0);
            // Billing 8 one-time products require the token for the selected purchase option.
            // Only the configured standard buy option is sold; never pick a rental/discount accidentally.
            ProductDetails.OneTimePurchaseOfferDetails selectedOffer = null;
            final List<ProductDetails.OneTimePurchaseOfferDetails> offers = detail.getOneTimePurchaseOfferDetailsList();
            if (offers != null) {
                for (ProductDetails.OneTimePurchaseOfferDetails offer : offers) {
                    if ("standard".equals(offer.getPurchaseOptionId()) && offer.getRentalDetails() == null
                        && (offer.getOfferId() == null || offer.getOfferId().isEmpty())) {
                        selectedOffer = offer;
                        break;
                    }
                }
            }
            if (selectedOffer == null || selectedOffer.getOfferToken().isEmpty()) {
                failActive("현재 계정에서 구매할 수 있는 상품 옵션이 없어요.");
                return;
            }
            final BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(detail)
                .setOfferToken(selectedOffer.getOfferToken())
                .build();
            final BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams))
                .setObfuscatedAccountId(pendingAccountHash)
                .build();

            activity.runOnUiThread(() -> {
                final BillingResult launch = billingClient.launchBillingFlow(activity, flowParams);
                Log.i(TAG, "launchBillingFlow product=" + productId + " code=" + launch.getResponseCode() + " message=" + launch.getDebugMessage());
                if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    failActive("결제 창을 열지 못했어요: " + launch.getDebugMessage());
                }
            });
        });
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            failActive(result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED
                ? "결제가 취소됐어요."
                : "결제에 실패했어요: " + result.getDebugMessage());
            return;
        }

        for (Purchase purchase : purchases) {
            if (pendingProductId == null || !purchase.getProducts().contains(pendingProductId)) {
                continue;
            }
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
                failActive("결제가 승인 대기 상태예요.");
                return;
            }
            emitPurchasedPurchase(purchase);
            return;
        }

        failActive("요청한 상품의 결제 결과를 찾지 못했어요.");
    }

    private static void emitPurchasedPurchase(final Purchase purchase) {
        final String productId = pendingProductId;
        if (productId == null) {
            return;
        }
        purchaseTokens.put(productId, purchase.getPurchaseToken());
        try {
            final JSONObject receiptPayload = new JSONObject();
            receiptPayload.put("json", purchase.getOriginalJson());
            receiptPayload.put("signature", purchase.getSignature());
            final JSONObject receipt = new JSONObject();
            receipt.put("Store", "GooglePlay");
            receipt.put("TransactionID", purchase.getOrderId());
            receipt.put("Payload", receiptPayload.toString());

            final JSONObject response = new JSONObject();
            response.put("success", true);
            response.put("productId", productId);
            response.put("receipt", receipt.toString());
            response.put("purchaseToken", purchase.getPurchaseToken());
            response.put("transactionId", purchase.getOrderId());
            response.put("message", "결제가 완료됐어요.");
            response.put("platform", "ANDROID");
            response.put("store", "GOOGLE_PLAY");
            emit(response.toString());
            Log.i(TAG, "purchase received product=" + productId + " order=" + purchase.getOrderId());
            pendingProductId = null;
        } catch (Exception error) {
            failActive("영수증을 만들지 못했어요: " + error.getMessage());
        }
    }

    private static void failActive(final String message) {
        final String productId = pendingProductId;
        pendingProductId = null;
        emitFailure(unityObject, unityMethod, productId, message);
    }

    private static void emitFailure(final String callbackObject, final String callbackMethod, final String productId, final String message) {
        try {
            final JSONObject response = new JSONObject();
            response.put("success", false);
            response.put("productId", productId == null ? "" : productId);
            response.put("error", message == null ? "결제를 완료하지 못했어요." : message);
            emit(callbackObject, callbackMethod, response.toString());
        } catch (Exception ignored) { }
    }

    private static void emit(final String payload) {
        emit(unityObject, unityMethod, payload);
    }

    private static void emit(final String callbackObject, final String callbackMethod, final String payload) {
        if (callbackObject == null || callbackMethod == null) {
            Log.e(TAG, "Unity callback target missing: " + payload);
            return;
        }
        UnityPlayer.UnitySendMessage(callbackObject, callbackMethod, payload);
    }
}
