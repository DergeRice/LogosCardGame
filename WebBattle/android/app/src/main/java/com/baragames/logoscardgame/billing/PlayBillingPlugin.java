package com.baragames.logoscardgame.billing;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;

/** Native one-time product bridge. The server must verify each returned token before consuming it. */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billing;
    private final Map<String, PluginCall> purchaseCalls = new HashMap<>();

    @Override public void load() {
        billing = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).build();
    }

    private void connected(Runnable next, PluginCall call) {
        if (billing.isReady()) { next.run(); return; }
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) next.run();
                else call.reject("Google Play 결제를 초기화하지 못했어요.", "BILLING_SETUP_FAILED");
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    @PluginMethod public void products(PluginCall call) {
        List<String> ids = new ArrayList<>();
        try { com.getcapacitor.JSArray requested = call.getArray("productIds", new com.getcapacitor.JSArray());
            for (int i = 0; i < requested.length(); i++) { String id = requested.getString(i); if (id != null) ids.add(id); }
        } catch (JSONException error) { call.reject("상품 목록 형식이 올바르지 않아요."); return; }
        connected(() -> query(ids, details -> { JSObject result = new JSObject(); com.getcapacitor.JSArray items = new com.getcapacitor.JSArray();
            for (ProductDetails d : details) { JSObject item = new JSObject(); item.put("productId", d.getProductId());
                ProductDetails.OneTimePurchaseOfferDetails offer = d.getOneTimePurchaseOfferDetails(); if (offer != null) item.put("formattedPrice", offer.getFormattedPrice()); items.put(item); }
            result.put("products", items); call.resolve(result); }, call), call);
    }

    @PluginMethod public void purchase(PluginCall call) {
        String productId = call.getString("productId", ""); if (productId.isEmpty()) { call.reject("상품 ID가 필요해요."); return; }
        connected(() -> query(Collections.singletonList(productId), details -> {
            if (details.isEmpty()) { call.reject("Google Play 상품을 찾지 못했어요.", "PRODUCT_NOT_FOUND"); return; }
            ProductDetails detail = details.get(0); ProductDetails.OneTimePurchaseOfferDetails offer = detail.getOneTimePurchaseOfferDetails();
            if (offer == null) { call.reject("일회성 상품 정보가 없어요.", "PRODUCT_NOT_READY"); return; }
            BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(detail).setOfferToken(offer.getOfferToken()).build();
            purchaseCalls.put(productId, call); Activity activity = getActivity();
            if (activity == null) { purchaseCalls.remove(productId); call.reject("결제 화면을 열 수 없어요."); return; }
            BillingResult result = billing.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build());
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { purchaseCalls.remove(productId); call.reject("결제를 시작하지 못했어요.", "PURCHASE_START_FAILED"); }
        }, call), call);
    }

    @PluginMethod public void consume(PluginCall call) {
        String token = call.getString("purchaseToken", ""); if (token.isEmpty()) { call.reject("구매 토큰이 필요해요."); return; }
        connected(() -> billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (result, ignored) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) call.resolve();
            else call.reject("구매 완료 처리를 마치지 못했어요.", "CONSUME_FAILED");
        }), call);
    }

    private void query(List<String> ids, java.util.function.Consumer<List<ProductDetails>> done, PluginCall call) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : ids) products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(), (result, response) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Google Play 상품 정보를 불러오지 못했어요.", "PRODUCT_QUERY_FAILED"); return; }
            done.accept(response.getProductDetailsList());
        });
    }

    @Override public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) return;
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) return;
        for (Purchase purchase : purchases) for (String productId : purchase.getProducts()) {
            PluginCall call = purchaseCalls.remove(productId); if (call == null) continue;
            JSObject data = new JSObject(); data.put("productId", productId); data.put("purchaseToken", purchase.getPurchaseToken()); data.put("orderId", purchase.getOrderId()); call.resolve(data);
        }
    }

    @Override protected void handleOnDestroy() { if (billing != null) billing.endConnection(); }
}
